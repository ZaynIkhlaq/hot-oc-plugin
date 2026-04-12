#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { execSync } from "node:child_process"

const OPENCODE_CONFIG_DIR = join(homedir(), ".config", "opencode")
const OPENCODE_CONFIG_PATH = join(OPENCODE_CONFIG_DIR, "opencode.json")

function getPluginPath(): string {
  try {
    const npmRoot = execSync("npm root -g", { encoding: "utf8" }).trim()
    return join(npmRoot, "hot-oc-plugin", "dist", "index.js")
  } catch {
    throw new Error("Could not determine npm global root. Is npm installed?")
  }
}

function installGlobally(): void {
  console.log("  Installing hot-oc-plugin globally...")
  try {
    execSync("npm install -g hot-oc-plugin", { stdio: "inherit" })
  } catch {
    throw new Error("Global install failed. Try: sudo npm install -g hot-oc-plugin")
  }
}

function patchOpencodeConfig(pluginPath: string): void {
  const pluginUri = `file://${pluginPath}`

  let config: Record<string, unknown> = {}
  if (existsSync(OPENCODE_CONFIG_PATH)) {
    try {
      config = JSON.parse(readFileSync(OPENCODE_CONFIG_PATH, "utf8"))
    } catch {
      throw new Error(`Could not parse ${OPENCODE_CONFIG_PATH}. Fix the JSON and re-run.`)
    }
  }

  const plugins: string[] = Array.isArray(config.plugin) ? (config.plugin as string[]) : []

  // Remove any old hot-oc-plugin entries, add the current one
  const filtered = plugins.filter((p) => !p.includes("hot-oc-plugin"))
  filtered.push(pluginUri)
  config.plugin = filtered

  mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true })
  writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2))
}

async function main() {
  console.log("\n  HOT — OpenCode Copilot Plugin Installer\n")

  installGlobally()

  const pluginPath = getPluginPath()
  patchOpencodeConfig(pluginPath)

  console.log(`\n  ✓ Plugin registered at: ${pluginPath}`)
  console.log(`  ✓ Added to: ${OPENCODE_CONFIG_PATH}`)
  console.log(`\n  Restart OpenCode, then say "add a Copilot account" to get started.\n`)
}

main().catch((err) => {
  console.error(`\n  ✗ ${(err as Error).message}\n`)
  process.exit(1)
})
