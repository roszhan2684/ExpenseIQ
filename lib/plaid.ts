/**
 * Plaid client singleton + access-token encryption.
 *
 * Access tokens are AES-256-GCM encrypted before writing to MongoDB.
 * Encryption key is derived from NEXTAUTH_SECRET so the tokens are useless
 * even if the DB is dumped without the app secret.
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import crypto from 'crypto';

// ── Plaid client ──────────────────────────────────────────────────────────────

// plaid v41 only exports sandbox + production in PlaidEnvironments
// development must be hardcoded
const BASE_PATHS: Record<string, string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

const env = process.env.PLAID_ENV ?? 'sandbox';

export const plaidClient = new PlaidApi(
  new Configuration({
    basePath: BASE_PATHS[env] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': (process.env.PLAID_CLIENT_ID ?? '').trim(),
        'PLAID-SECRET': (process.env.PLAID_SECRET ?? '').trim(),
      },
    },
  })
);

// ── Access-token encryption ───────────────────────────────────────────────────

const ALGO = 'aes-256-gcm';

function encKey(): Buffer {
  // SHA-256 of NEXTAUTH_SECRET → 32-byte key
  return crypto
    .createHash('sha256')
    .update(process.env.NEXTAUTH_SECRET ?? 'dev-only-secret-change-me')
    .digest();
}

/** Encrypt a Plaid access_token before writing to the database. */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, encKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
}

/** Decrypt a stored Plaid access_token for API calls. */
export function decryptToken(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted-token format');
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = crypto.createDecipheriv(
    ALGO,
    encKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return (
    decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8') +
    decipher.final('utf8')
  );
}
