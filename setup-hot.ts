import * as readline from 'readline';
import { validateToken } from './src/utils/github-api';
import { saveAccountsConfig, CopilotAccount } from './src/utils/config';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🔥 HOT - High On Tokens Setup\n');

  // Get master password
  const masterPassword = await question('Set a master password (for encrypting tokens): ');
  if (!masterPassword) {
    console.log('❌ Master password required');
    process.exit(1);
  }

  // Get number of accounts
  const numAccountsStr = await question('How many GitHub Copilot accounts do you want to add? ');
  const numAccounts = parseInt(numAccountsStr, 10);

  if (isNaN(numAccounts) || numAccounts < 1) {
    console.log('❌ Invalid number of accounts');
    process.exit(1);
  }

  const accounts: CopilotAccount[] = [];

  for (let i = 0; i < numAccounts; i++) {
    console.log(`\n[Account ${i + 1}]`);

    const name = await question('Friend\'s name? ');
    const username = await question('GitHub username? ');
    const token = await question('Paste GitHub token (ghu_...): ');

    if (!name || !username || !token) {
      console.log('❌ All fields required');
      process.exit(1);
    }

    // Validate token
    process.stdout.write('Validating token... ');
    const isValid = await validateToken(token);
    if (!isValid) {
      console.log('❌ Token invalid');
      process.exit(1);
    }
    console.log('✓');

    // Estimate requests (GitHub Copilot Pro: 300/month, Pro+: 1500/month)
    // For now, assume Pro with 300 requests
    const maxRequests = 300;
    const resetTime = getNextResetDate().toISOString();

    accounts.push({
      id: username.toLowerCase(),
      token, // Will be encrypted on save
      name,
      username,
      maxRequests,
      requestsUsed: 0,
      resetTime,
    });

    console.log(`✓ ${name} added with ${maxRequests} requests/month`);
  }

  // Save configuration
  const config = {
    accounts,
    primaryAccount: accounts.length > 0 ? accounts[0].id : '',
  };

  saveAccountsConfig(config, masterPassword);

  // Summary
  const totalCapacity = accounts.reduce((sum, acc) => sum + acc.maxRequests, 0);
  console.log(`\n✅ All accounts configured!`);
  console.log(`🔥 HOT - Total capacity: ${totalCapacity} requests/month\n`);
  console.log(`Run 'opencode /accounts' to see status`);
  console.log(`Tokens are encrypted and stored securely.\n`);

  rl.close();
}

function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
