import * as fs from 'fs';
import * as path from 'path';
import { encrypt, decrypt } from './crypto';

function getConfigDir(): string {
  return path.join(process.env.HOME || '', '.config', 'opencode');
}

function getAccountsFile(): string {
  return path.join(getConfigDir(), 'copilot-accounts.json');
}

function getUsageFile(): string {
  return path.join(getConfigDir(), 'copilot-usage.json');
}

export interface CopilotAccount {
  id: string;
  token: string; // encrypted
  name: string;
  username: string;
  maxRequests: number;
  requestsUsed: number;
  resetTime: string; // ISO 8601 date
}

export interface AccountsConfig {
  accounts: CopilotAccount[];
  primaryAccount: string;
}

export interface UsageRecord {
  accountId: string;
  timestamp: string;
  requestId: string;
}

export interface UsageData {
  records: UsageRecord[];
}

/**
 * Ensure config directory exists
 */
export function ensureConfigDir(): void {
  const CONFIG_DIR = getConfigDir();
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load accounts configuration (decrypted)
 */
export function loadAccountsConfig(masterPassword: string): AccountsConfig {
  ensureConfigDir();
  const ACCOUNTS_FILE = getAccountsFile();

  if (!fs.existsSync(ACCOUNTS_FILE)) {
    return { accounts: [], primaryAccount: '' };
  }

  const rawData = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
  const config = JSON.parse(rawData) as AccountsConfig;

  // Decrypt tokens
  config.accounts = config.accounts.map((acc) => ({
    ...acc,
    token: decrypt(acc.token, masterPassword),
  }));

  return config;
}

/**
 * Save accounts configuration (encrypts tokens)
 */
export function saveAccountsConfig(config: AccountsConfig, masterPassword: string): void {
  ensureConfigDir();
  const ACCOUNTS_FILE = getAccountsFile();

  // Encrypt tokens
  const configToSave: AccountsConfig = {
    ...config,
    accounts: config.accounts.map((acc) => ({
      ...acc,
      token: encrypt(acc.token, masterPassword),
    })),
  };

  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(configToSave, null, 2), { mode: 0o600 });
}

/**
 * Load usage data
 */
export function loadUsageData(): UsageData {
  ensureConfigDir();
  const USAGE_FILE = getUsageFile();

  if (!fs.existsSync(USAGE_FILE)) {
    return { records: [] };
  }

  const rawData = fs.readFileSync(USAGE_FILE, 'utf8');
  return JSON.parse(rawData) as UsageData;
}

/**
 * Save usage data
 */
export function saveUsageData(data: UsageData): void {
  ensureConfigDir();
  const USAGE_FILE = getUsageFile();
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

/**
 * Add a usage record
 */
export function recordUsage(accountId: string): void {
  const usage = loadUsageData();
  usage.records.push({
    accountId,
    timestamp: new Date().toISOString(),
    requestId: `${accountId}-${Date.now()}`,
  });
  saveUsageData(usage);
}

/**
 * Get usage count for an account in current month
 */
export function getAccountUsageThisMonth(accountId: string): number {
  const usage = loadUsageData();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return usage.records.filter((record) => {
    const recordDate = new Date(record.timestamp);
    return record.accountId === accountId && recordDate >= monthStart;
  }).length;
}
