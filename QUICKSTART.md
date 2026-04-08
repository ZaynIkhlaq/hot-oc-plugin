# Quick Start Guide - HOT 🔥

## 5-Minute Setup

### Step 1: Install & Build
```bash
cd hot-plugin
npm install
npm run build
```

### Step 2: Run Setup
```bash
./setup-hot.sh
```

Follow the prompts to add your friends' GitHub tokens.

### Step 3: View Accounts
```bash
opencode /accounts
```

You'll see a dashboard showing usage across all accounts.

## How It Works

1. **You ask OpenCode a question** → Plugin intercepts the request
2. **Plugin checks primary account quota** → If available, uses it
3. **If quota exhausted** → Automatically switches to next account
4. **Request completes** → Usage is recorded

## Common Commands

```bash
# View all accounts and usage
opencode /accounts

# Switch to a specific account
opencode /account alex

# The plugin handles the rest automatically!
```

## Getting GitHub Tokens

For each friend's account you want to add:

1. **Login to GitHub** as that friend
2. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token**
   - Name: "HOT - High On Tokens"
   - Scope: Select `copilot`
4. **Generate** and **copy** (only shown once!)
5. **Paste into setup script** when prompted

## Storage & Security

```
~/.config/opencode/
├── hot-accounts.json        ← Encrypted tokens
├── copilot-usage.json       ← Usage records
└── .salt                    ← Encryption salt
```

All tokens are encrypted with your master password using AES-256-GCM.

## Quota Limits

| Plan | Monthly Requests |
|------|-----------------|
| Pro  | 300 |
| Pro+ | 1,500 |

The setup script assumes Pro (300) by default. Edit manually if using Pro+.

## What's Happening Behind the Scenes

- **On Session Start**: Plugin refreshes quota from GitHub API
- **Before Each Request**: Plugin selects best available account
- **After Each Request**: Usage is recorded locally
- **Monthly**: Reset date is tracked for accurate accounting

## Example Output

```
┌─ 🔥 HOT - High On Tokens ──────────────────────┐
│                                            │
│ Sarah (Primary)       [████████░░] 80%    │
│   240/300 requests used                   │
│   Resets: 2026-05-08                      │
│                                            │
│ Alex (Backup)         [████░░░░░░] 40%    │
│   120/300 requests used                   │
│   Resets: 2026-05-08                      │
│                                            │
│ Jordan (Backup)       [██░░░░░░░░] 20%    │
│   60/300 requests used                    │
│   Resets: 2026-05-08                      │
│                                            │
│ Total Available: 420/900 requests (46%)   │
└────────────────────────────────────────────┘
```

## Troubleshooting

### Token validation fails
- Make sure token is from the correct GitHub account
- Token needs `copilot` scope
- Token shouldn't be expired

### Master password forgotten
- Delete `~/.config/opencode/hot-accounts.json`
- Run `./setup-hot.sh` again

### OpenCode doesn't recognize /accounts
- Make sure plugin is built: `npm run build`
- Verify plugin is loaded in OpenCode config
- Check OpenCode logs for errors

## Next Steps

- [Read Full Documentation](./README.md)
- [Plugin Configuration](./PLUGIN_CONFIG.md)
- [GitHub Issues](https://github.com/anomalyco/opencode)

---

That's it! You now have unlimited Copilot requests. 🔥
