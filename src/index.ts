import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { execSync } from "node:child_process"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

const z = tool.schema

// ─── Config ──────────────────────────────────────────────────────────────────

// Must match OpenCode's OAuth app so tokens work with its Copilot provider
const OPENCODE_CLIENT_ID = "Ov23li8tweQw6odWQebz"

interface Account {
  name: string
  token: string
}

interface Config {
  accounts: Account[]
  current: number
}

const CONFIG_DIR = join(homedir(), ".config", "opencode")
const CONFIG_PATH = join(CONFIG_DIR, "hot.json")
const AUTH_PATH = join(homedir(), ".local", "share", "opencode", "auth.json")

function readConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return { accounts: [], current: 0 }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Config
}

function writeConfig(cfg: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 })
}

function syncAuthJson(token: string): void {
  let existing: Record<string, unknown> = {}
  if (existsSync(AUTH_PATH)) {
    try { existing = JSON.parse(readFileSync(AUTH_PATH, "utf8")) } catch {}
  }
  existing["github-copilot"] = { type: "oauth", access: token, refresh: token, expires: 0 }
  mkdirSync(join(homedir(), ".local", "share", "opencode"), { recursive: true })
  writeFileSync(AUTH_PATH, JSON.stringify(existing, null, 2), { mode: 0o600 })
}

// ─── Account Pool ─────────────────────────────────────────────────────────────

class AccountPool {
  private cfg: Config

  constructor(cfg: Config) { this.cfg = cfg }

  get count(): number { return this.cfg.accounts.length }
  get currentIndex(): number { return this.cfg.current % Math.max(this.cfg.accounts.length, 1) }
  get current(): Account | undefined { return this.cfg.accounts[this.currentIndex] }
  get all(): Account[] { return this.cfg.accounts }

  activate(): void {
    if (!this.current) return
    syncAuthJson(this.current.token)
    console.log(`[HOT] Active: ${this.current.name} (${this.count} account(s) configured)`)
  }

  switchTo(index: number): void {
    const prev = this.current?.name ?? "none"
    this.cfg.current = index
    writeConfig(this.cfg)
    syncAuthJson(this.current!.token)
    console.log(`[HOT] Switched: ${prev} → ${this.current!.name}`)
  }

  addAccount(name: string, token: string): void {
    this.cfg.accounts.push({ name, token })
    if (this.cfg.accounts.length === 1) {
      this.cfg.current = 0
      syncAuthJson(token)
    }
    writeConfig(this.cfg)
    console.log(`[HOT] Added account: ${name}`)
  }

  renameAccount(index: number, newName: string): string {
    const account = this.cfg.accounts[index]!
    const oldName = account.name
    account.name = newName
    writeConfig(this.cfg)
    return oldName
  }

  removeAccount(index: number): string {
    const [removed] = this.cfg.accounts.splice(index, 1)
    if (this.cfg.current >= this.cfg.accounts.length) this.cfg.current = 0
    writeConfig(this.cfg)
    if (this.current) syncAuthJson(this.current.token)
    return removed!.name
  }

  statusSummary(): string {
    if (this.cfg.accounts.length === 0) {
      return [
        `  HOT  ·  no accounts`,
        ``,
        `  Say "add a Copilot account" to get started.`,
      ].join("\n")
    }
    const width = Math.max(...this.all.map((a) => a.name.length))
    const rows = this.all.map((a, i) => {
      const dot = i === this.currentIndex ? "●" : "○"
      const tag = i === this.currentIndex ? "  active" : ""
      return `  ${dot}  ${a.name.padEnd(width)}${tag}`
    })
    return [
      `  HOT  ·  ${this.count} account${this.count === 1 ? "" : "s"}`,
      ``,
      ...rows,
    ].join("\n")
  }
}

// ─── GitHub Device Flow ───────────────────────────────────────────────────────

interface DeviceFlowStart {
  device_code: string
  user_code: string
  verification_uri: string
  interval: number
  expires_in: number
}

async function startDeviceFlow(): Promise<DeviceFlowStart> {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: `client_id=${OPENCODE_CLIENT_ID}&scope=read:user`,
  })
  if (!res.ok) throw new Error(`GitHub responded with HTTP ${res.status}`)
  return res.json() as Promise<DeviceFlowStart>
}

async function pollForToken(device_code: string, intervalSecs: number, expiresSecs: number): Promise<string> {
  const deadline = Date.now() + expiresSecs * 1000
  let pollMs = (intervalSecs + 3) * 1000

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs))
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${OPENCODE_CLIENT_ID}&device_code=${device_code}&grant_type=urn:ietf:params:oauth:grant-type:device_code`,
    })
    const data = await res.json() as { access_token?: string; error?: string; interval?: number }

    if (data.access_token) return data.access_token
    if (data.error === "slow_down") pollMs += (data.interval ?? 5) * 1000
    else if (data.error === "expired_token") throw new Error("Code expired. Say \"add account\" to start over.")
    else if (data.error === "access_denied") throw new Error("Authorization was denied.")
    else if (data.error !== "authorization_pending") throw new Error(`Unexpected error: ${data.error}`)
  }

  throw new Error("Timed out waiting for authorization. Say \"add account\" to start over.")
}

async function validateCopilot(token: string): Promise<string> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
  })
  if (!userRes.ok) throw new Error(`GitHub returned HTTP ${userRes.status}`)
  const { login } = await userRes.json() as { login: string }
  return login
}

type CheckResult =
  | { ok: true; login: string }
  | { ok: false; reason: "revoked" | "no_copilot" | "network"; detail: string }

async function checkAccount(token: string): Promise<CheckResult> {
  let login: string
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
    })
    if (userRes.status === 401) return { ok: false, reason: "revoked", detail: "token revoked or expired" }
    if (!userRes.ok) return { ok: false, reason: "network", detail: `GitHub HTTP ${userRes.status}` }
    login = (await userRes.json() as { login: string }).login
  } catch (e) {
    return { ok: false, reason: "network", detail: (e as Error).message }
  }

  try {
    const copRes = await fetch("https://api.github.com/copilot_internal/v2/token", {
      headers: { Authorization: `token ${token}`, Accept: "application/json" },
    })
    if (copRes.status === 401 || copRes.status === 403 || copRes.status === 404) {
      return { ok: false, reason: "no_copilot", detail: `Copilot access denied (HTTP ${copRes.status})` }
    }
    if (!copRes.ok) return { ok: false, reason: "network", detail: `Copilot HTTP ${copRes.status}` }
  } catch (e) {
    return { ok: false, reason: "network", detail: (e as Error).message }
  }

  return { ok: true, login }
}

function openBrowser(url: string): void {
  try {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
    execSync(`${cmd} "${url}"`, { stdio: "ignore" })
  } catch {}
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const server: Plugin = async () => {
  const pool = new AccountPool(readConfig())
  pool.activate()

  // Pending device flow state (lives in memory between hot_add and hot_complete)
  let pending: { device_code: string; interval: number; expires_in: number; name: string } | null = null

  return {
    tool: {
      hot_status: tool({
        description: "Shows which GitHub Copilot account HOT is currently using and all configured accounts.",
        args: {},
        execute: async () => pool.statusSummary(),
      }),

      hot_add: tool({
        description: "Start adding a new GitHub Copilot account. Provides a link and code to enter. After authorizing in the browser, call hot_complete to finish.",
        args: {
          name: z.string().describe("A short nickname for this account, e.g. 'friend1' or 'zain'."),
        },
        execute: async ({ name }) => {
          if (pool.all.find((a) => a.name === name)) {
            return `An account named "${name}" already exists. Use a different name or remove it first with hot_remove.`
          }

          const flow = await startDeviceFlow()
          pending = { device_code: flow.device_code, interval: flow.interval, expires_in: flow.expires_in, name }

          return [
            `Use this link to log in: ${flow.verification_uri}`,
            ``,
            `Enter this code: **${flow.user_code}**`,
            ``,
            `They should log in with a GitHub account that has Copilot enabled, then authorize the app. Once they are done, tell me "complete" and I'll finish adding the account.`,
          ].join("\n")
        },
      }),

      hot_complete: tool({
        description: "Complete adding a GitHub Copilot account after the user has authorized in the browser. Call this after hot_add once the user confirms they've done the browser step.",
        args: {},
        execute: async () => {
          if (!pending) {
            return `No account setup in progress. Say "add a Copilot account" to start.`
          }

          const { device_code, interval, expires_in, name } = pending

          const token = await pollForToken(device_code, interval, expires_in)
          const username = await validateCopilot(token)
          pool.addAccount(name, token)
          pending = null

          return `✓ Account "${name}" (@${username}) added successfully. ${pool.count > 1 ? `Use hot_switch to change accounts.` : `It's now active.`}`
        },
      }),

      hot_switch: tool({
        description: "Switch the active GitHub Copilot account. Pass the account name or number (1-based index).",
        args: {
          account: z.string().describe("Account name or 1-based index number to switch to."),
        },
        execute: async ({ account }) => {
          if (pool.count === 0) return `No accounts configured. Say "add a Copilot account" to get started.`

          const idx = parseInt(account, 10)
          const target = !isNaN(idx) ? idx - 1 : pool.all.findIndex((a) => a.name === account)

          if (target < 0 || target >= pool.count) {
            return `Unknown account "${account}".\n\n${pool.statusSummary()}`
          }

          pool.switchTo(target)
          return `Switched to "${pool.current!.name}". Copilot requests will now use this account.`
        },
      }),

      hot_check: tool({
        description: "Validate every configured GitHub Copilot account in parallel. Reports which tokens are still valid and which have been revoked or lost Copilot access.",
        args: {},
        execute: async () => {
          if (pool.count === 0) return `No accounts configured.`

          const results = await Promise.all(pool.all.map((a) => checkAccount(a.token)))
          const nameWidth = Math.max(...pool.all.map((a) => a.name.length))
          let okCount = 0
          let badCount = 0

          const rows = results.map((r, i) => {
            const a = pool.all[i]!
            const active = i === pool.currentIndex
            const name = a.name.padEnd(nameWidth)
            if (r.ok) {
              okCount++
              const right = active ? `@${r.login}  ·  active` : `@${r.login}`
              return `  ✓  ${name}  ${right}`
            } else {
              badCount++
              const right = active ? `${r.detail}  ·  active` : r.detail
              return `  ✗  ${name}  ${right}`
            }
          })

          const summary = badCount === 0
            ? `${okCount} valid`
            : `${okCount} valid  ·  ${badCount} broken`

          return [
            `  HOT  ·  health check`,
            ``,
            ...rows,
            ``,
            `  ${summary}`,
            ...(badCount > 0 ? [`  Use hot_remove to drop bad accounts, hot_add to re-authorize.`] : []),
          ].join("\n")
        },
      }),

      hot_rename: tool({
        description: "Rename a GitHub Copilot account in HOT. The token and active state are preserved.",
        args: {
          account: z.string().describe("Existing account name or 1-based index number to rename."),
          new_name: z.string().describe("The new nickname for the account."),
        },
        execute: async ({ account, new_name }) => {
          if (pool.count === 0) return `No accounts configured.`

          const idx = parseInt(account, 10)
          const target = !isNaN(idx) ? idx - 1 : pool.all.findIndex((a) => a.name === account)

          if (target < 0 || target >= pool.count) {
            return `Unknown account "${account}".\n\n${pool.statusSummary()}`
          }

          const trimmed = new_name.trim()
          if (!trimmed) return `New name cannot be empty.`
          if (pool.all[target]!.name === trimmed) return `Account is already named "${trimmed}".`
          if (pool.all.some((a, i) => i !== target && a.name === trimmed)) {
            return `An account named "${trimmed}" already exists. Choose a different name.`
          }

          const oldName = pool.renameAccount(target, trimmed)
          return `Renamed "${oldName}" → "${trimmed}".`
        },
      }),

      hot_remove: tool({
        description: "Remove a GitHub Copilot account from HOT.",
        args: {
          account: z.string().describe("Account name or 1-based index number to remove."),
        },
        execute: async ({ account }) => {
          if (pool.count === 0) return `No accounts configured.`

          const idx = parseInt(account, 10)
          const target = !isNaN(idx) ? idx - 1 : pool.all.findIndex((a) => a.name === account)

          if (target < 0 || target >= pool.count) {
            return `Unknown account "${account}".\n\n${pool.statusSummary()}`
          }

          const removed = pool.removeAccount(target)
          const after = pool.count > 0 ? ` Active account is now "${pool.current!.name}".` : ` No accounts remain.`
          return `Removed "${removed}".${after}`
        },
      }),
    },

    // Inject active account into session context so the AI always knows
    "experimental.chat.system.transform": async (_input, output) => {
      if (!pool.current) return
      output.system.push(
        `[HOT] GitHub Copilot is routing through account: "${pool.current.name}". ` +
        `Use hot_switch to change accounts, hot_status to see all.`
      )
    },
  }
}
