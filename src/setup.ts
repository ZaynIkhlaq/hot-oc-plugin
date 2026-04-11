import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline"

const CONFIG_DIR = join(homedir(), ".config", "opencode")
const CONFIG_PATH = join(CONFIG_DIR, "hot.json")

interface Account {
  name: string
  token: string
  requestsUsed: number
  threshold: number
}

interface Config {
  accounts: Account[]
  current: number
}

const rl = createInterface({ input: process.stdin, output: process.stdout })

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

async function validateToken(token: string): Promise<{ username: string; hasCopilot: boolean }> {
  // 1. Get GitHub user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (userRes.status === 401) throw new Error("Invalid token — authentication failed")
  if (!userRes.ok) throw new Error(`GitHub API error: HTTP ${userRes.status}`)

  const user = await userRes.json() as { login: string }

  // 2. Check Copilot access by attempting the bearer token exchange
  let hasCopilot = false
  try {
    const copilotRes = await fetch("https://api.github.com/copilot_internal/v2/token", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/json",
        "Editor-Version": "vscode/1.95.0",
        "Editor-Plugin-Version": "copilot/1.155.0",
        "Openai-Organization": "github-copilot",
        "User-Agent": "GithubCopilot/1.155.0",
      },
    })
    hasCopilot = copilotRes.ok
  } catch {
    hasCopilot = false
  }

  return { username: user.login, hasCopilot }
}

async function main() {
  console.log("\n  HOT — GitHub Copilot Account Setup\n")
  console.log("  This tool lets you rotate across multiple GitHub accounts")
  console.log("  when one account's Copilot quota runs out.\n")

  // Load existing config if present
  let cfg: Config = { accounts: [], current: 0 }
  if (existsSync(CONFIG_PATH)) {
    cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Config
    if (cfg.accounts.length > 0) {
      console.log(`  Existing accounts: ${cfg.accounts.map((a) => a.name).join(", ")}\n`)
    }
  }

  while (true) {
    const addMore = await ask(
      cfg.accounts.length === 0
        ? "  Add first account? (y/n): "
        : "  Add another account? (y/n): "
    )
    if (addMore.toLowerCase() !== "y") break

    const name = await ask("  Account nickname (e.g. work, personal): ")
    if (!name) { console.log("  Name cannot be empty."); continue }

    const token = await ask(
      "  GitHub OAuth token (gho_*, github_pat_*, or ghu_*):\n  → "
    )
    if (!token) { console.log("  Token cannot be empty."); continue }

    // Basic format check
    if (!token.startsWith("gho_") && !token.startsWith("ghu_") && !token.startsWith("github_pat_")) {
      console.log("  Warning: token doesn't look like a GitHub OAuth/PAT token, continuing anyway...")
    }

    process.stdout.write("  Validating token...")
    try {
      const { username, hasCopilot } = await validateToken(token)
      if (hasCopilot) {
        console.log(` ✓ @${username} — Copilot access confirmed`)
      } else {
        console.log(` ⚠  @${username} — Copilot access NOT detected (check subscription)`)
        const proceed = await ask("  Add anyway? (y/n): ")
        if (proceed.toLowerCase() !== "y") continue
      }

      const thresholdStr = await ask(
        "  Rotate threshold (requests before switching, 0 = only on 429): "
      )
      const threshold = Math.max(0, parseInt(thresholdStr || "0", 10) || 0)

      // Remove existing entry with same name if present
      cfg.accounts = cfg.accounts.filter((a) => a.name !== name)
      cfg.accounts.push({ name, token, requestsUsed: 0, threshold })
      console.log(`  Added: ${name}\n`)
    } catch (err) {
      console.log(` ✗ ${(err as Error).message}\n`)
    }
  }

  if (cfg.accounts.length === 0) {
    console.log("\n  No accounts configured. Exiting.\n")
    rl.close()
    process.exit(1)
  }

  // Reset current pointer if it's out of bounds
  if (cfg.current >= cfg.accounts.length) cfg.current = 0

  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 })

  console.log(`\n  ✓ Saved ${cfg.accounts.length} account(s) to ${CONFIG_PATH}`)
  console.log("    (file is owner-read-only: chmod 600)\n")

  console.log("  To enable the plugin, add this to your opencode.json:\n")
  console.log(`    {`)
  console.log(`      "plugin": ["file://${process.cwd()}/dist/index.js"]`)
  console.log(`    }\n`)

  console.log("  Then build: npm run build\n")

  rl.close()
}

main().catch((err) => {
  console.error("Setup failed:", err)
  rl.close()
  process.exit(1)
})
