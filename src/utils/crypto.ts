import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function getConfigDir(): string {
  return path.join(process.env.HOME || '', '.config', 'opencode');
}

function getSaltFile(): string {
  return path.join(getConfigDir(), '.salt');
}

/**
 * Generate or retrieve encryption salt
 */
export function getSalt(): Buffer {
  const CONFIG_DIR = getConfigDir();
  const SALT_FILE = getSaltFile();
  
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (fs.existsSync(SALT_FILE)) {
    return fs.readFileSync(SALT_FILE);
  }

  const salt = crypto.randomBytes(32);
  fs.writeFileSync(SALT_FILE, salt, { mode: 0o600 });
  return salt;
}

/**
 * Derive encryption key from master password using PBKDF2
 */
export function deriveKey(masterPassword: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt sensitive data (tokens)
 */
export function encrypt(data: string, masterPassword: string): string {
  const salt = getSalt();
  const key = deriveKey(masterPassword, salt);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv + authTag + encrypted (all hex encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data (tokens)
 */
export function decrypt(encryptedData: string, masterPassword: string): string {
  const salt = getSalt();
  const key = deriveKey(masterPassword, salt);

  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
