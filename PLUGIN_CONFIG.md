# OpenCode Plugin Configuration

To use this plugin with OpenCode, add the following to your `.opencode/config.json`:

```json
{
  "plugins": {
    "hot": {
      "enabled": true,
      "masterPassword": "${HOT_MASTER_PASSWORD}",
      "autoRefreshInterval": 3600000,
      "autoSwitchOnLimit": true
    }
  },
  "github-hot": {
    "primary_account": "sarah",
    "fallback_on_limit": true,
    "log_usage": true
  }
}
```

## Environment Variables

Set your master password:

```bash
export HOT_MASTER_PASSWORD="your-strong-password"
```

Or in `.env`:
```
HOT_MASTER_PASSWORD=your-strong-password
```

## Plugin Options

- `enabled`: Enable/disable the plugin
- `masterPassword`: Master password for decrypting tokens (use env var)
- `autoRefreshInterval`: How often to refresh quota (in ms, default: 3600000 = 1 hour)
- `autoSwitchOnLimit`: Automatically switch accounts when limit hit (default: true)

## GitHub Configuration

- `primary_account`: Which account to use by default (account id)
- `fallback_on_limit`: Switch to next account if primary hits limit (default: true)
- `log_usage`: Log each request to usage file (default: true)

## Hooks Configuration

The plugin registers these hooks automatically:

```typescript
// On session creation
hook: session.created → onSessionCreated()

// Before tool execution
hook: tool.execute.before → onToolExecuteBefore()

// On CLI command execution
hook: tui.command.execute → onTuiCommandExecute()
```

## Example: Custom Routing Logic

If you want to customize the routing, you can extend the plugin:

```typescript
import HOTPlugin from 'hot-plugin';

class CustomHOTPlugin extends HOTPlugin {
  getNextAvailableAccount() {
    // Your custom logic here
    // E.g., prefer accounts with less usage
    // E.g., rotate between accounts for load balancing
    return super.getNextAvailableAccount();
  }
}
```

## Troubleshooting Plugin Loading

If the plugin doesn't load:

1. Verify installation: `npm run build`
2. Check OpenCode plugin directory
3. Verify config.json syntax
4. Ensure master password is set
5. Check OpenCode logs for errors
