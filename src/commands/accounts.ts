import HOTPlugin from '../hot';

/**
 * Generate a progress bar
 */
function generateProgressBar(percentage: number, width: number = 10): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)}]`;
}

/**
 * Display accounts dashboard
 */
export function displayAccountsDashboard(plugin: HOTPlugin): string {
  const accounts = plugin.getAccounts();

  if (accounts.length === 0) {
    return 'No GitHub Copilot accounts configured.\nRun: ./setup-hot.sh';
  }

  const statuses = accounts.map((acc) => plugin.getAccountStatus(acc));

  const totalUsed = statuses.reduce((sum: number, s: any) => sum + s.used, 0);
  const totalMax = statuses.reduce((sum: number, s: any) => sum + s.max, 0);
  const totalPercentage = Math.round((totalUsed / totalMax) * 100);

  let output = '\n┌─ 🔥 HOT - High On Tokens ─────────────────┐\n';
  output += '│                                            │\n';

  statuses.forEach((status: any, index: number) => {
    const isPrimary = index === 0;
    const label = isPrimary ? ' (Primary)' : '';
    const bar = generateProgressBar(status.percentage);
    output += `│ ${status.name.padEnd(18)}${label.padEnd(10)} ${bar} ${status.percentage
      .toString()
      .padStart(3)}%   │\n`;
    output += `│   ${status.used}/${status.max} requests used${' '.repeat(13)}│\n`;
    output += `│   Resets: ${status.resetTime}${' '.repeat(16)}│\n`;
    if (index < statuses.length - 1) {
      output += '│                                            │\n';
    }
  });

  output += '│                                            │\n';
  output += `│ Total Available: ${totalUsed}/${totalMax} requests (${totalPercentage}%)    │\n`;
  output += '└────────────────────────────────────────────┘\n';

  return output;
}

/**
 * Command handler for /accounts
 */
export async function handleAccountsCommand(plugin: HOTPlugin): Promise<string> {
  try {
    await plugin.refreshQuota();
  } catch (err) {
    console.warn('Failed to refresh quota from GitHub:', err);
  }

  return displayAccountsDashboard(plugin);
}
