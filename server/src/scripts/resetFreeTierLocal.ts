/**
 * Local dev helper: reset server-side free-tier enforcement and paid rows
 * so you can experience the free tier again (chat limit, billing as free).
 *
 * Run: npm run reset:free-tier (from server/) or from repo root: npm --prefix server run reset:free-tier
 *
 * Then in the browser console (dev): window.stackwiseResetFreeView()
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { getDb } from '../db/index.js';

const db = getDb();

const subCount = db.prepare('SELECT COUNT(*) as c FROM subscriptions').get() as { c: number };
const userRows = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };

db.prepare('UPDATE users SET chat_messages_used = 0').run();
db.prepare('DELETE FROM subscriptions').run();

// eslint-disable-next-line no-console
console.log(
  `[reset-free-tier] Done. Was ${userRows.c} user(s), ${subCount.c} subscription row(s). ` +
    'All chat counts set to 0; all subscription rows removed (everyone reads as free on the server).',
);
// eslint-disable-next-line no-console
console.log('[reset-free-tier] Now run in the browser console: window.stackwiseResetFreeView() then reload if needed.');
