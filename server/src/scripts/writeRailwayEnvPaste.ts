/**
 * Merges root `.env` + `client/.env` into a single file for Railway Variables (raw paste).
 * Replaces localhost APP_URL / CLIENT_URL with a placeholder so you don't deploy wrong links.
 *
 * Output: `railway-paste.env` at repo root (gitignored).
 *
 * Run: npm --prefix server run railway:env-paste
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const rootEnv = path.join(root, '.env');
const clientEnv = path.join(root, 'client', '.env');
const outFile = path.join(root, 'railway-paste.env');

function loadEnvFile(p: string): Record<string, string> {
  if (!fs.existsSync(p)) return {};
  return dotenv.parse(fs.readFileSync(p));
}

function isLocalhostUrl(v: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(v);
}

const server = loadEnvFile(rootEnv);
const client = loadEnvFile(clientEnv);

const merged = new Map<string, string>();

for (const [k, v] of Object.entries(server)) {
  merged.set(k, v);
}
for (const [k, v] of Object.entries(client)) {
  merged.set(k, v);
}

merged.set('NODE_ENV', 'production');
// Railway injects PORT; a pasted local PORT breaks binding.
merged.delete('PORT');

const appUrl = merged.get('APP_URL')?.trim() ?? '';
const clientUrl = merged.get('CLIENT_URL')?.trim() ?? '';
if (!appUrl || isLocalhostUrl(appUrl)) {
  merged.set(
    'APP_URL',
    'https://REPLACE_WITH_YOUR_RAILWAY_OR_CUSTOM_DOMAIN',
  );
}
if (!clientUrl || isLocalhostUrl(clientUrl)) {
  merged.set(
    'CLIENT_URL',
    merged.get('APP_URL') ?? 'https://REPLACE_WITH_YOUR_RAILWAY_OR_CUSTOM_DOMAIN',
  );
}

// Never ship dev-only Pro unlock to production builds
merged.delete('VITE_DEV_PRO');

const keys = [...merged.keys()].sort((a, b) => a.localeCompare(b));
const lines = keys.map((k) => `${k}=${merged.get(k) ?? ''}`);
const body = [
  '# Paste into Railway → Service → Variables (bulk / raw editor).',
  '# Then replace REPLACE_WITH_YOUR_RAILWAY_OR_CUSTOM_DOMAIN with your real public URL.',
  '# After first deploy, run: npm --prefix server run paypal:register-webhook',
  '',
  ...lines,
  '',
].join('\n');

fs.writeFileSync(outFile, body, 'utf8');
// eslint-disable-next-line no-console
console.log(`Wrote ${outFile} (${keys.length} variables). Open it and paste into Railway.`);
