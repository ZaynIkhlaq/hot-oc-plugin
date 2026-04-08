# Usage Scenarios & Examples

This document shows real-world usage scenarios for the HOT - High On Tokens Plugin.

## Scenario 1: First Time Setup

### You have 3 friends willing to share their Copilot accounts

```bash
$ ./setup-hot.sh

🔐 HOT - High On Tokens Setup

Set a master password (for encrypting tokens): my-super-secret-password-123

How many friends' accounts do you want to add? 3

[Account 1]
Friend's name? Sarah Chen
GitHub username? sarah-dev
Paste GitHub token (ghu_...): ghu_16C7e42F292c6912E7...
Validating token... ✓
✓ Sarah Chen added with 300 requests/month

[Account 2]
Friend's name? Alex Rodriguez
GitHub username? alex-coder
Paste GitHub token (ghu_...): ghu_84d5B02C292c6a19F2...
Validating token... ✓
✓ Alex Rodriguez added with 300 requests/month

[Account 3]
Friend's name? Jordan Park
GitHub username: jordan-hacker
Paste GitHub token (ghu_...): ghu_92e3C72D392c7b29A3...
Validating token... ✓
✓ Jordan Park added with 300 requests/month

✓ All accounts configured!
Total capacity: 900 requests/month

Run 'opencode /accounts' to see status
Then never again. Tokens are stored and periodically refreshed.
```

---

## Scenario 2: Check Account Status

```bash
$ opencode /accounts

┌─ GitHub Copilot Accounts ──────────────────┐
│                                            │
│ Sarah Chen (Primary)  [████░░░░░░] 40%    │
│   120/300 requests used                   │
│   Resets: 2026-05-08                      │
│                                            │
│ Alex Rodriguez (Backup) [██░░░░░░░░] 20%  │
│   60/300 requests used                    │
│   Resets: 2026-05-08                      │
│                                            │
│ Jordan Park (Backup)  [██░░░░░░░░] 20%    │
│   60/300 requests used                    │
│   Resets: 2026-05-08                      │
│                                            │
│ Total Available: 780/900 requests (86%)   │
└────────────────────────────────────────────┘
```

---

## Scenario 3: Using OpenCode Normally

### User makes requests - plugin handles everything automatically

```bash
$ opencode "Explain the React hooks API"

[OpenCode processes with available account token]
[Plugin automatically selected: sarah-dev]
[Request count updated: Sarah 120→121]

React Hooks are a way to use state and other React features 
in functional components. The most common hooks are:

- useState: Add state to functional components
- useEffect: Handle side effects (data fetching, subscriptions)
- useContext: Consume context values
...
```

### Plugin automatically switches accounts when quota approaches limit

```bash
$ opencode "What's new in TypeScript 5.0?"

[Sarah's account is at 295/300 quota - getting close]
[Plugin auto-switches to next available: alex-coder]
[Request count updated: Alex 60→61]

TypeScript 5.0 introduces several exciting features:
- Decorators (now part of ECMAScript standard)
- const Type Parameters
- Export of Type in Value Position
...
```

---

## Scenario 4: Manual Account Switching

### Switch to a specific account

```bash
$ opencode /account jordan

✓ Switched to: Jordan Park (60/300 requests used)

$ opencode "What are the differences between var, let, and const?"

[Request uses jordan-hacker account]
[Request count updated: Jordan 60→61]
```

---

## Scenario 5: Month-End Status

### Check status as month approaches end

```bash
$ opencode /accounts

┌─ GitHub Copilot Accounts ──────────────────┐
│                                            │
│ Sarah Chen (Primary)  [██████████] 100%   │
│   300/300 requests used                   │
│   Resets: 2026-05-08                      │
│                                            │
│ Alex Rodriguez (Backup) [████░░░░░░] 80%  │
│   240/300 requests used                   │
│   Resets: 2026-05-08                      │
│                                            │
│ Jordan Park (Backup)  [████░░░░░░] 75%    │
│   225/300 requests used                   │
│   Resets: 2026-05-08                      │
│                                            │
│ Total Available: 135/900 requests (15%)   │
└────────────────────────────────────────────┘
```

---

## Scenario 6: All Accounts Exhausted

### When all accounts hit their limits

```bash
$ opencode "Help me debug this React error"

❌ No GitHub Copilot accounts with available quota

All accounts have reached their monthly limits:
- Sarah Chen: 300/300 (exhausted)
- Alex Rodriguez: 300/300 (exhausted)  
- Jordan Park: 300/300 (exhausted)

Next reset: May 8, 2026 (4 days remaining)

You can:
1. Wait for monthly reset (May 8, 2026)
2. Ask friends to log in and reset their counters
3. Add more accounts: ./setup-hot.sh
```

---

## Scenario 7: Adding More Accounts

### You find a 4th friend willing to share

```bash
# Edit the config directly or re-run setup to add more
$ ./setup-hot.sh

How many friends' accounts do you want to add? 1

[Account 1]
Friend's name? Casey Morgan
GitHub username? casey-dev
Paste GitHub token (ghu_...): ghu_47f8E92H482d9c31B5...
Validating token... ✓
✓ Casey Morgan added with 300 requests/month

✓ All accounts configured!
Total capacity: 1200 requests/month (was 900)

$ opencode /accounts
# Now shows 4 accounts with 1200 total capacity
```

---

## Scenario 8: Troubleshooting - Invalid Token

### Token validation fails during setup

```bash
$ ./setup-hot.sh

[Account 1]
Friend's name? Sarah
GitHub username? sarah-dev
Paste GitHub token (ghu_...): ghu_invalid_token_12345
Validating token... ❌ Token invalid

❌ Setup failed: Token validation failed

Possible reasons:
1. Token is expired - generate a new one
2. Token has wrong scopes - needs 'copilot' scope
3. Token is for wrong GitHub account
4. GitHub API is down

Please try again with a valid token.
```

---

## Scenario 9: Debugging - Check Raw Config

### View encrypted account config (for debugging)

```bash
$ cat ~/.config/opencode/hot-accounts.json

{
  "accounts": [
    {
      "id": "sarah-dev",
      "token": "a1b2c3d4e5f6:7g8h9i0j1k2l:m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
      "name": "Sarah Chen",
      "username": "sarah-dev",
      "maxRequests": 300,
      "requestsUsed": 120,
      "resetTime": "2026-05-08T00:00:00Z"
    }
  ],
  "primaryAccount": "sarah-dev"
}

Note: Tokens are encrypted, shown format is: iv:authTag:encryptedData
```

---

## Scenario 10: Daily Usage Pattern

### Typical day with the plugin

```bash
Morning:
$ opencode "How do I use async/await?"
[Uses: Sarah - 40%]

Midday:
$ opencode "Review my code"
[Uses: Sarah - 60%]

$ opencode /accounts
# Check remaining quota - looks good

Afternoon:
$ opencode "Debug TypeScript error"
[Sarah at 295/300 - plugin auto-switches]
[Uses: Alex - 20%]

$ opencode "Write unit tests for..."
[Uses: Alex - 25%]

Evening:
$ opencode /accounts
# Quick check before logging off
# Shows: Sarah 295/300, Alex 75/300, Jordan 30/300

$ opencode "Refactor this component"
[Uses: Alex - 30%]

Next day:
$ opencode /accounts
# Quota refreshed automatically from GitHub API
```

---

## Scenario 11: API Usage (Programmatic)

### Using the plugin in your own code

```typescript
import HOTPlugin from 'hot-plugin';

const plugin = new HOTPlugin({
  masterPassword: process.env.COPILOT_MASTER_PASSWORD
});

await plugin.initialize();

// Get all accounts
const accounts = plugin.getAccounts();
console.log(`Loaded ${accounts.length} accounts`);

// Get next available
const account = plugin.getNextAvailableAccount();
if (account) {
  console.log(`Using: ${account.name}`);
  
  // Make request with account.token
  const response = await fetch('...', {
    headers: { Authorization: `Bearer ${account.token}` }
  });
  
  // Record usage
  plugin.useAccount(account.id);
}

// Refresh quota from GitHub
await plugin.refreshQuota();

// Check status
const status = plugin.getAccountStatus(account);
console.log(`${status.percentage}% used`);
```

---

## Scenario 12: Monitoring Multiple Teams

### If you're managing accounts for a team/group

```bash
# Team Lead: Set up initial accounts
$ ./setup-hot.sh
# Adds 10 friends' accounts = 3000 requests/month

# Team Members: Install plugin
$ npm install hot-plugin

# Everyone can now use:
$ opencode /accounts
# Shows shared pool

$ opencode /account friend-name
# Can manually select which account to use

# Team Lead: Monitor usage
$ watch -n 300 "opencode /accounts"
# Checks quota every 5 minutes
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./setup-hot.sh` | Initial setup with encryption |
| `opencode /accounts` | View dashboard with usage |
| `opencode /account [id]` | Switch to specific account |
| `opencode [question]` | Use normally (auto-selects account) |
| `cat ~/.config/opencode/hot-accounts.json` | View encrypted config |
| `cat ~/.config/opencode/copilot-usage.json` | View usage history |

---

## Pro Tips

1. **Set a strong master password** - Use 16+ characters with mix of upper, lower, numbers, symbols
2. **Regularly check `/accounts`** - Know when you're running low on quota
3. **Refresh quota monthly** - Run setup again or manually call `plugin.refreshQuota()`
4. **Encrypt backups** - Keep backup of accounts file (it's already encrypted)
5. **Share responsibly** - Only get tokens from friends who consent
6. **Monitor usage** - Track trends to optimize account selection

---

That's it! The plugin handles everything else automatically. Happy coding!
