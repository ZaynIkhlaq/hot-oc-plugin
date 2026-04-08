import * as path from 'path';
import {
  loadAccountsConfig,
  saveAccountsConfig,
  recordUsage,
  getAccountUsageThisMonth,
  CopilotAccount,
} from './utils/config';
import { getCopilotUsage, validateToken } from './utils/github-api';

export interface PluginConfig {
  masterPassword: string;
}

class HOTPlugin {
  private masterPassword: string = '';
  private accountsCache: Map<string, CopilotAccount> = new Map();

  constructor(config: PluginConfig) {
    this.masterPassword = config.masterPassword;
  }

  /**
   * Initialize plugin and load accounts
   */
  async initialize(): Promise<void> {
    const config = loadAccountsConfig(this.masterPassword);
    config.accounts.forEach((acc) => {
      this.accountsCache.set(acc.id, acc);
    });
  }

  /**
   * Get all accounts
   */
  getAccounts(): CopilotAccount[] {
    return Array.from(this.accountsCache.values());
  }

  /**
   * Get primary account (one with most requests remaining)
   */
  getPrimaryAccount(): CopilotAccount | null {
    const accounts = this.getAccounts();
    if (accounts.length === 0) return null;

    return accounts.reduce((best, current) => {
      const bestRemaining = best.maxRequests - best.requestsUsed;
      const currentRemaining = current.maxRequests - current.requestsUsed;
      return currentRemaining > bestRemaining ? current : best;
    });
  }

  /**
   * Get account with available quota
   */
  getNextAvailableAccount(): CopilotAccount | null {
    const accounts = this.getAccounts();
    for (const acc of accounts) {
      if (acc.requestsUsed < acc.maxRequests) {
        return acc;
      }
    }
    return null;
  }

  /**
   * Use an account (increment counter, record usage)
   */
  useAccount(accountId: string): void {
    const acc = this.accountsCache.get(accountId);
    if (!acc) {
      throw new Error(`Account ${accountId} not found`);
    }

    acc.requestsUsed += 1;
    recordUsage(accountId);

    // Save updated config
    const config = loadAccountsConfig(this.masterPassword);
    const accountIndex = config.accounts.findIndex((a) => a.id === accountId);
    if (accountIndex >= 0) {
      config.accounts[accountIndex] = acc;
      saveAccountsConfig(config, this.masterPassword);
    }
  }

  /**
   * Refresh quota from GitHub API
   */
  async refreshQuota(): Promise<void> {
    for (const acc of this.getAccounts()) {
      try {
        const usage = await getCopilotUsage(acc.token);
        // GitHub returns completions count; we estimate 1 completion ~ 1 request
        acc.requestsUsed = usage.completions.count;
      } catch (err) {
        console.error(`Failed to refresh quota for ${acc.id}:`, err);
      }
    }

    // Save refreshed data
    const config = loadAccountsConfig(this.masterPassword);
    config.accounts = this.getAccounts();
    saveAccountsConfig(config, this.masterPassword);
  }

  /**
   * Get account status (for dashboard)
   */
  getAccountStatus(acc: CopilotAccount): {
    id: string;
    name: string;
    percentage: number;
    used: number;
    max: number;
    resetTime: string;
  } {
    const percentage = Math.round((acc.requestsUsed / acc.maxRequests) * 100);
    return {
      id: acc.id,
      name: acc.name,
      percentage,
      used: acc.requestsUsed,
      max: acc.maxRequests,
      resetTime: acc.resetTime,
    };
  }
}

export default HOTPlugin;
