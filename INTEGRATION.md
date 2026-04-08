# Integration Guide for OpenCode

This guide explains how to integrate the HOT - High On Tokens plugin into your OpenCode installation.

## Prerequisites

- OpenCode installed
- Node.js 16+
- npm or yarn

## Installation Options

### Option 1: Local Plugin (Recommended for Personal Use)

1. **Clone/download this plugin** to `~/.opencode/plugins/copilot-multi/`

```bash
mkdir -p ~/.opencode/plugins
cd ~/.opencode/plugins
git clone <repo-url> copilot-multi
cd copilot-multi
npm install
npm run build
```

2. **Update OpenCode config** at `~/.opencode/config.json`:

```json
{
  "plugins": {
    "copilot-multi": {
      "enabled": true,
      "masterPassword": "${COPILOT_MASTER_PASSWORD}",
      "autoRefreshInterval": 3600000
    }
  }
}
```

3. **Set environment variable**:

```bash
export COPILOT_MASTER_PASSWORD="your-master-password"
```

4. **Run setup**:

```bash
~/.opencode/plugins/copilot-multi/setup-hot.sh
```

### Option 2: NPM Package (For Sharing/Publishing)

```bash
npm install hot-plugin
```

Then in your OpenCode config:

```json
{
  "plugins": {
    "copilot-multi": {
      "enabled": true,
      "module": "hot-plugin",
      "masterPassword": "${COPILOT_MASTER_PASSWORD}"
    }
  }
}
```

## Plugin Hook Integration

The plugin registers three main hooks with OpenCode:

### 1. Session Initialization Hook
**When**: OpenCode session starts
**What it does**: Refreshes quota from GitHub API

```typescript
hook: session.created → plugin.onSessionCreated()
```

### 2. Tool Execution Hook
**When**: Before executing any Copilot API tool
**What it does**: Injects correct token, selects best account

```typescript
hook: tool.execute.before → plugin.onToolExecuteBefore(context)
```

### 3. CLI Command Hook
**When**: User executes a command like `/accounts`
**What it does**: Handles custom commands

```typescript
hook: tui.command.execute → plugin.onTuiCommandExecute(command, args)
```

## Configuration Reference

### config.json Format

```json
{
  "plugins": {
    "copilot-multi": {
      "enabled": true,
      "masterPassword": "${COPILOT_MASTER_PASSWORD}",
      "autoRefreshInterval": 3600000,
      "autoSwitchOnLimit": true,
      "logUsage": true
    }
  },
  "github-copilot-multi": {
    "primary_account": "sarah",
    "fallback_on_limit": true,
    "prefer_less_used": false
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable plugin |
| `masterPassword` | string | - | Master password (use env var) |
| `autoRefreshInterval` | number | 3600000 | Refresh quota every N ms (1 hour) |
| `autoSwitchOnLimit` | boolean | true | Auto-switch when account hits limit |
| `logUsage` | boolean | true | Log each request to usage file |
| `primary_account` | string | first | Default account to use |
| `fallback_on_limit` | boolean | true | Use backup if primary exhausted |
| `prefer_less_used` | boolean | false | Prefer account with less usage |

## Environment Variables

```bash
# Required
export COPILOT_MASTER_PASSWORD="your-strong-password-here"

# Optional
export COPILOT_MULTI_LOG_LEVEL="debug"  # debug, info, warn, error
export COPILOT_MULTI_CONFIG_DIR="~/.config/opencode"
```

## File Locations

After setup, the plugin creates:

```
~/.config/opencode/
├── hot-accounts.json     # Encrypted account tokens
├── copilot-usage.json        # Usage records
└── .salt                     # Encryption salt (chmod 600)
```

## OpenCode Integration Checklist

- [ ] Install node dependencies: `npm install`
- [ ] Build TypeScript: `npm run build`
- [ ] Create `~/.opencode/plugins/copilot-multi/` directory
- [ ] Copy plugin files to that directory
- [ ] Update `~/.opencode/config.json` with plugin config
- [ ] Set `COPILOT_MASTER_PASSWORD` environment variable
- [ ] Run setup script: `./setup-hot.sh`
- [ ] Verify with: `opencode /accounts`

## Verifying Installation

### Test 1: Check Plugin Loads
```bash
opencode --version
# Should not show errors about copilot-multi
```

### Test 2: View Accounts Dashboard
```bash
opencode /accounts
# Should display account status
```

### Test 3: Make a Request
```bash
opencode "What is React?"
# Should process request with an available account
```

## Troubleshooting

### Plugin Not Loading

1. Check syntax in config.json (valid JSON?)
2. Verify plugin path exists: `ls ~/.opencode/plugins/copilot-multi/`
3. Check build succeeded: `ls dist/*.js`
4. Check environment variable: `echo $COPILOT_MASTER_PASSWORD`

### Hooks Not Triggering

1. Plugin must be enabled: `"enabled": true`
2. Check OpenCode plugin documentation
3. Verify hook registration in `src/index.ts`

### Token Validation Fails

1. Is token valid on GitHub? Check at https://github.com/settings/tokens
2. Does token have `copilot` scope?
3. Is token not expired?

### Master Password Issues

1. Is it set as environment variable?
2. Is it the same password used during setup?
3. Can you decrypt manually? `npm run decrypt`

## Advanced Configuration

### Custom Routing Logic

Extend the plugin to implement custom account selection:

```typescript
// ~/.opencode/plugins/custom-copilot/index.ts
import HOTPlugin from 'hot-plugin';

export class CustomRouter extends HOTPlugin {
  getNextAvailableAccount() {
    // Prefer accounts with more quota
    const accounts = this.getAccounts();
    return accounts.reduce((best, curr) => 
      (curr.maxRequests - curr.requestsUsed) > 
      (best.maxRequests - best.requestsUsed) ? curr : best
    );
  }
}
```

### Load Balancing

Rotate between accounts to balance usage:

```typescript
export class LoadBalancingRouter extends HOTPlugin {
  private lastUsedIndex = 0;

  getNextAvailableAccount() {
    const accounts = this.getAccounts()
      .filter(a => a.requestsUsed < a.maxRequests);
    
    if (accounts.length === 0) return null;
    
    this.lastUsedIndex = (this.lastUsedIndex + 1) % accounts.length;
    return accounts[this.lastUsedIndex];
  }
}
```

## Support & Feedback

- **Issues**: https://github.com/anomalyco/opencode
- **Documentation**: See README.md and PLUGIN_CONFIG.md
- **Quick Start**: See QUICKSTART.md

---

Need help? Check the troubleshooting section above or report an issue.
