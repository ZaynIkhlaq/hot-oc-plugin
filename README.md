# HOT - High On Tokens 🔥

A powerful OpenCode plugin that lets you aggregate GitHub Copilot credits from multiple friends' accounts. Automatically routes requests between accounts, tracks usage in real-time, and provides a beautiful dashboard.

## Features

✨ **Multi-Account Support** - Store and manage GitHub Copilot tokens from multiple accounts
📊 **Real-Time Usage Tracking** - Track requests per account automatically
🔄 **Intelligent Routing** - Automatically switches to the next available account when one hits its limit
🔐 **Secure Encryption** - Tokens encrypted with AES-256-GCM using a master password
📈 **Live Dashboard** - `/accounts` command shows usage across all accounts
🔁 **Auto Quota Refresh** - Periodically updates quota from GitHub API
⚡ **Zero Friction** - One-time setup, then works seamlessly

## Architecture

### Phase 1: Credential Management
- Store encrypted tokens in `~/.config/opencode/hot-accounts.json`
- AES-256-GCM encryption with PBKDF2 key derivation
- Master password protection
- Never stored in git, uses `.gitignore`

### Phase 2: Usage Tracking & Limits
- Query `https://api.github.com/user/copilot_usage` per account
- Track requests per account in monthly cycles
- Reset tracking on month boundaries

### Phase 3: Intelligent Routing
- Check available quota before using each account
- Automatically failover to next available account
- Manual account selection with `/account [id]`

### Phase 4: Dashboard & Monitoring
- `/accounts` command shows detailed usage per account
- Progress bars for visual quota representation
- Total available capacity across all accounts

### Phase 5: One-Time Setup
- Interactive setup script: `./setup-hot.sh`
- Validates each token before saving
- Encrypts and stores securely

### Phase 6: Plugin Integration
- OpenCode plugin hooks for session/tool lifecycle
- Automatic token injection into API calls
- CLI command handlers

## Installation

```bash
# Clone or download this repository
cd hot-plugin

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build
```

## Setup

Run the interactive setup script:

```bash
./setup-hot.sh
```

You'll be prompted for:
1. Master password (encrypts all tokens)
2. Number of accounts to add
3. For each account:
   - Friend's name
   - GitHub username
   - GitHub personal access token (with Copilot scope)

The script validates each token and stores encrypted credentials.

### Getting GitHub Tokens

For each friend's account:
1. Go to GitHub.com and login
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. Click "Generate new token"
4. Give it a name: "HOT - High On Tokens"
5. Select scopes: `copilot`
6. Generate and copy the token (only shown once!)
7. Paste it into the setup script

## Usage

### View All Accounts

```bash
opencode /accounts
```

Output:
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

### Switch to a Specific Account

```bash
opencode /account alex
```

### Automatic Routing

When you make a request through OpenCode:
1. Plugin checks primary account's remaining quota
2. If quota available → uses it
3. If quota exhausted → switches to next available account
4. If all accounts exhausted → shows helpful error

## Configuration

Configuration files are stored in `~/.config/opencode/`:

### hot-accounts.json
Encrypted JSON file containing all account credentials:
```json
{
  "accounts": [
    {
      "id": "sarah",
      "token": "ghu_xxxxxxxxxxxx (encrypted)",
      "name": "Sarah",
      "username": "sarah-dev",
      "maxRequests": 300,
      "requestsUsed": 0,
      "resetTime": "2026-05-08T00:00:00Z"
    }
  ],
  "primaryAccount": "sarah"
}
```

### copilot-usage.json
Usage records for tracking (unencrypted):
```json
{
  "records": [
    {
      "accountId": "sarah",
      "timestamp": "2026-04-08T14:23:45.123Z",
      "requestId": "sarah-1712599425123"
    }
  ]
}
```

## API Reference

### HOTPlugin

```typescript
class HOTPlugin {
  getAccounts(): CopilotAccount[]
  getPrimaryAccount(): CopilotAccount | null
  getNextAvailableAccount(): CopilotAccount | null
  useAccount(accountId: string): void
  async refreshQuota(): Promise<void>
  getAccountStatus(acc: CopilotAccount): AccountStatus
}
```

### Plugin Hooks

```typescript
// Called when session starts
onSessionCreated(): Promise<void>

// Called before tool execution
onToolExecuteBefore(context: any): Promise<void>

// Called when user executes CLI command
onTuiCommandExecute(command: string, args: any): Promise<string | null>
```

## Security Considerations

⚠️ **Important:**
- Master password is required to decrypt tokens
- Never commit `~/.config/opencode/hot-accounts.json` to git
- Salt is stored in `~/.config/opencode/.salt` (chmod 0o600)
- Tokens are encrypted with AES-256-GCM before storage
- Use a strong master password (16+ characters recommended)

## File Structure

```
hot-plugin/
├── src/
│   ├── hot.ts                        # Main plugin class
│   ├── index.ts                      # Plugin exports & hooks
│   ├── utils/
│   │   ├── crypto.ts                 # Encryption/decryption
│   │   ├── github-api.ts             # GitHub API integration
│   │   └── config.ts                 # Config file management
│   └── commands/
│       └── accounts.ts               # Dashboard command
├── setup-hot.ts                      # Setup script
├── setup-hot.sh                      # Bash wrapper for setup
├── dist/                             # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Building

```bash
npm run build
```

### Setup from Source

```bash
npm run setup
```

## Limitations & Notes

- GitHub Copilot Pro: 300 requests/month
- GitHub Copilot Pro+: 1,500 requests/month
- Setup script assumes Pro (300 requests) by default
- Manual updating of maxRequests if using Pro+
- Usage resets on the first day of each month
- Plugin requires OpenCode integration to function

## Troubleshooting

### Token Validation Failed
- Ensure token has correct scopes (copilot)
- Token must be valid and not expired
- Check GitHub.com for token status

### Master Password Issues
- If forgotten, delete `~/.config/opencode/hot-accounts.json` and run setup again
- Salt file `~/.config/opencode/.salt` can be deleted to reset

### Quota Not Updating
- Run `/accounts` command to manually refresh
- Check GitHub API status
- Ensure tokens are still valid

## License

MIT

## Support

For issues, feature requests, or contributions:
- Report issues at https://github.com/anomalyco/opencode
- Or create a pull request with improvements

---

Built with ❤️ for OpenCode
