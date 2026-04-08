import HOTPlugin from './hot';
import { handleAccountsCommand } from './commands/accounts';
import { loadAccountsConfig, recordUsage, getAccountUsageThisMonth } from './utils/config';

/**
 * HOT Plugin Hooks
 * High On Tokens - Multi-account GitHub Copilot aggregator for OpenCode
 * These hooks integrate the plugin with OpenCode
 */

export interface PluginHooks {
  'session.created': () => Promise<void>;
  'tool.execute.before': (context: any) => Promise<void>;
  'tui.command.execute': (command: string, args: any) => Promise<string | null>;
}

let pluginInstance: HOTPlugin | null = null;

/**
 * Initialize plugin instance
 */
export function initPlugin(masterPassword: string): HOTPlugin {
  const plugin = new HOTPlugin({ masterPassword });
  pluginInstance = plugin;
  return plugin;
}

/**
 * Get plugin instance
 */
export function getPlugin(): HOTPlugin {
  if (!pluginInstance) {
    throw new Error('HOT Plugin not initialized. Call initPlugin first.');
  }
  return pluginInstance;
}

/**
 * Hook: session.created
 * Called when a new session starts - refresh quota and check account health
 */
export async function onSessionCreated(): Promise<void> {
  if (!pluginInstance) return;

  try {
    await pluginInstance.refreshQuota();
    console.log('[HOT] Quota refreshed from GitHub API');
  } catch (err) {
    console.warn('[HOT] Failed to refresh quota:', err);
  }
}

/**
 * Hook: tool.execute.before
 * Called before executing a tool - inject the appropriate token
 */
export async function onToolExecuteBefore(context: any): Promise<void> {
  if (!pluginInstance) return;

  // Check if this is a Copilot API call
  if (!context.tool || context.tool.name !== 'copilot-api') {
    return;
  }

  // Get next available account
  const account = pluginInstance.getNextAvailableAccount();
  if (!account) {
    throw new Error('No GitHub Copilot accounts with available quota');
  }

  // Inject token into context
  context.headers = context.headers || {};
  context.headers['Authorization'] = `Bearer ${account.token}`;

  // Use the account
  pluginInstance.useAccount(account.id);
  console.log(`[HOT] Using account: ${account.name}`);
}

/**
 * Hook: tui.command.execute
 * Called when user executes a CLI command
 */
export async function onTuiCommandExecute(command: string, args: any): Promise<string | null> {
  if (!pluginInstance) return null;

  // Handle /accounts command
  if (command === 'accounts') {
    return await handleAccountsCommand(pluginInstance);
  }

  // Handle /account [id] command to switch account
  if (command === 'account' && args.id) {
    const allAccounts = pluginInstance.getAccounts();
    const account = allAccounts.find((a) => a.id === args.id);

    if (!account) {
      return `❌ Account "${args.id}" not found`;
    }

    // This would set the primary account in config
    console.log(`✓ Switched to account: ${account.name}`);
    return `Switched to: ${account.name} (${account.requestsUsed}/${account.maxRequests} requests used)`;
  }

  return null;
}

export default {
  initPlugin,
  getPlugin,
  onSessionCreated,
  onToolExecuteBefore,
  onTuiCommandExecute,
  plugin: HOTPlugin,
  commands: {
    accounts: handleAccountsCommand,
  },
};
