import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

// ─── Config ─────────────────────────────────────────────────────────────────

interface Account {
  name: string
  token: string        // GitHub OAuth token (gho_*, ghu_*, github_pat_*)
  requestsUsed: number
  threshold: number    // rotate proactively at this count (0 = only on failure)
}

interface Config {
  accounts: Account[]
  current: number
}

const CONFIG_DIR = join(homedir(), ".config", "opencode")
const CONFIG_PATH = join(CONFIG_DIR, "hot.json")

function readConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `[HOT] No accounts configured.\n` +
      `  Run: npm run setup\n` +
      `  Config path: ${CONFIG_PATH}`
    )
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Config
}

function writeConfig(cfg: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 })
}

// ─── Bearer Token Cache ──────────────────────────────────────────────────────

interface CachedBearer {
  token: string
  expiresAt: number  // ms epoch
}

const bearerCache = new Map<string, CachedBearer>()

async function getBearerToken(githubToken: string): Promise<string> {
  const cached = bearerCache.get(githubToken)
  // Refresh 2 minutes before expiry to avoid mid-request expiry
  if (cached && cached.expiresAt > Date.now() + 120_000) {
    return cached.token
  }

  const res = await fetch("https://api.github.com/copilot_internal/v2/token", {
    method: "GET",
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/json",
      "Editor-Version": "vscode/1.95.0",
      "Editor-Plugin-Version": "copilot/1.155.0",
      "Openai-Organization": "github-copilot",
      "User-Agent": "GithubCopilot/1.155.0",
    },
  })

  if (res.status === 401) throw new Error(`token invalid or expired`)
  if (res.status === 403) throw new Error(`token does not have Copilot access`)
  if (!res.ok) throw new Error(`HTTP ${res.status} from GitHub token endpoint`)

  const data = await res.json() as { token: string; expires_at: number }
  bearerCache.set(githubToken, {
    token: data.token,
    expiresAt: data.expires_at * 1000,
  })
  return data.token
}

function invalidateBearerCache(githubToken: string): void {
  bearerCache.delete(githubToken)
}

// ─── Account Pool ─────────────────────────────────────────────────────────────

class AccountPool {
  private cfg: Config

  constructor(cfg: Config) {
    this.cfg = cfg
  }

  get count(): number {
    return this.cfg.accounts.length
  }

  get current(): Account {
    return this.cfg.accounts[this.cfg.current % this.cfg.accounts.length]!
  }

  rotate(reason: string): Account {
    const prev = this.current.name
    this.cfg.current = (this.cfg.current + 1) % this.cfg.accounts.length
    writeConfig(this.cfg)
    console.log(`[HOT] ${prev} → ${this.current.name} (${reason})`)
    return this.current
  }

  incrementAndMaybeRotate(): void {
    this.current.requestsUsed++
    writeConfig(this.cfg)
    const { threshold, requestsUsed, name } = this.current
    if (threshold > 0 && requestsUsed >= threshold) {
      invalidateBearerCache(this.current.token)
      this.rotate(`threshold ${threshold} hit on ${name}`)
    }
  }
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const server: Plugin = async () => {
  let pool: AccountPool

  try {
    pool = new AccountPool(readConfig())
    console.log(
      `[HOT] Ready — ${pool.count} account(s), active: ${pool.current.name}`
    )
  } catch (err) {
    console.error((err as Error).message)
    // Return empty hooks so OpenCode continues without the plugin crashing
    return {}
  }

  return {
    /**
     * Runs on every outbound LLM request.
     * We check if the provider is GitHub Copilot and, if so, inject
     * the current account's bearer token into the Authorization header.
     */
    "chat.headers": async (input, output) => {
      const providerID: string = input.provider?.info?.id ?? ""
      if (!isCopilotProvider(providerID)) return

      const acc = pool.current

      try {
        const bearer = await getBearerToken(acc.token)
        output.headers["Authorization"] = `Bearer ${bearer}`
        pool.incrementAndMaybeRotate()
      } catch (err) {
        // Current account failed auth — rotate and try next immediately
        console.error(`[HOT] ${acc.name} auth failed: ${(err as Error).message}`)
        invalidateBearerCache(acc.token)
        const next = pool.rotate(`auth failure`)

        try {
          const bearer = await getBearerToken(next.token)
          output.headers["Authorization"] = `Bearer ${bearer}`
          pool.incrementAndMaybeRotate()
        } catch (err2) {
          console.error(`[HOT] ${next.name} also failed: ${(err2 as Error).message}`)
          // Fall through — let OpenCode use whatever default auth it has
        }
      }
    },

    /**
     * Listen for session.error events carrying a ProviderAuthError so we can
     * rotate on 429 / auth failures that happen at the transport layer.
     */
    event: async ({ event }) => {
      if (event.type !== "session.error") return

      const err = event.properties.error
      if (!err || err.name !== "ProviderAuthError") return
      if (!isCopilotProvider(err.data.providerID)) return

      invalidateBearerCache(pool.current.token)
      pool.rotate(`ProviderAuthError on ${pool.current.name}`)
    },
  }
}

function isCopilotProvider(id: string): boolean {
  return id.toLowerCase().includes("copilot") || id === "github-copilot"
}
