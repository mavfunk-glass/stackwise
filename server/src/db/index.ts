import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.STACKWISE_DATA_DIR ?? path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'stackwise.db');

let db: Database.Database | null = null;

function migrateUsersTable(database: Database.Database): void {
  const cols = new Set(
    (database.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has('chat_messages_used')) {
    database.exec('ALTER TABLE users ADD COLUMN chat_messages_used INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.has('email')) {
    database.exec('ALTER TABLE users ADD COLUMN email TEXT');
  }
  if (!cols.has('email_verified')) {
    database.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.has('display_name')) {
    database.exec('ALTER TABLE users ADD COLUMN display_name TEXT');
  }
  if (!cols.has('reminder_time')) {
    database.exec('ALTER TABLE users ADD COLUMN reminder_time TEXT');
  }
  if (!cols.has('reminder_timezone')) {
    database.exec('ALTER TABLE users ADD COLUMN reminder_timezone TEXT');
  }
  if (!cols.has('reminder_stack_json')) {
    database.exec('ALTER TABLE users ADD COLUMN reminder_stack_json TEXT');
  }
  if (!cols.has('reminder_enabled')) {
    database.exec('ALTER TABLE users ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0');
  }
}

function migrateCheckinTokensTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS checkin_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(dataDir, { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      stack_generations INTEGER NOT NULL DEFAULT 0,
      chat_messages_used INTEGER NOT NULL DEFAULT 0,
      email TEXT UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      display_name TEXT,
      reminder_time TEXT,
      reminder_timezone TEXT,
      reminder_stack_json TEXT,
      reminder_enabled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      paypal_subscription_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro')),
      status TEXT NOT NULL,
      plan_id TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE TABLE IF NOT EXISTS magic_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS stacks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      quiz_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      label TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_stacks_user ON stacks(user_id);
    CREATE INDEX IF NOT EXISTS idx_magic_tokens_user ON magic_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires ON magic_tokens(expires_at);
    CREATE TABLE IF NOT EXISTS checkin_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  migrateUsersTable(db);
  migrateCheckinTokensTable(db);
  return db;
}

export function createUser(): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  getDb().prepare('INSERT INTO users (id, created_at, stack_generations) VALUES (?, ?, 0)').run(id, now);
  return id;
}

/**
 * Ensure a `users` row exists for this id (JWT `sub` or Supabase user id).
 * Legacy JWT clients can hold a valid token after DB reset / new deploy; without this,
 * entitlement checks throw USER_NOT_FOUND.
 */
export function ensureUserRow(userId: string): void {
  if (!userId) return;
  if (getUser(userId)) return;
  const now = Date.now();
  try {
    getDb()
      .prepare('INSERT INTO users (id, created_at, stack_generations) VALUES (?, ?, 0)')
      .run(userId, now);
  } catch {
    /* duplicate insert from race — row should exist */
  }
}

export type UserRow = {
  id: string;
  created_at: number;
  stack_generations: number;
  chat_messages_used: number;
  email: string | null;
  email_verified: number;
  display_name: string | null;
  reminder_time: string | null;
  reminder_timezone: string | null;
  reminder_stack_json: string | null;
  reminder_enabled: number;
};

const USER_ROW_SELECT = `id, created_at, stack_generations, chat_messages_used,
              email, email_verified, display_name,
              reminder_time, reminder_timezone, reminder_stack_json, reminder_enabled`;

export function getUser(userId: string): UserRow | null {
  const row = getDb()
    .prepare(`SELECT ${USER_ROW_SELECT} FROM users WHERE id = ?`)
    .get(userId) as UserRow | undefined;
  return row ?? null;
}

export function getUserByEmail(email: string): UserRow | null {
  const row = getDb()
    .prepare(`SELECT ${USER_ROW_SELECT} FROM users WHERE email = ?`)
    .get(email.toLowerCase().trim()) as UserRow | undefined;
  return row ?? null;
}

export function setUserEmail(userId: string, email: string, displayName?: string): void {
  getDb()
    .prepare('UPDATE users SET email = ?, email_verified = 1, display_name = COALESCE(?, display_name) WHERE id = ?')
    .run(email.toLowerCase().trim(), displayName ?? null, userId);
}

/** Create or update local user row for a Supabase Auth user (`sub` matches `users.id`). */
export function upsertUserFromSupabaseAuth(
  supabaseUserId: string,
  email: string | null,
  emailVerified: boolean,
): void {
  const db = getDb();
  const now = Date.now();
  const existing = getUser(supabaseUserId);
  const ev = emailVerified ? 1 : 0;
  const em = email?.toLowerCase().trim() ?? null;

  if (!existing) {
    try {
      db.prepare(
        `INSERT INTO users (id, created_at, stack_generations, chat_messages_used, email, email_verified, display_name)
         VALUES (?, ?, 0, 0, ?, ?, NULL)`,
      ).run(supabaseUserId, now, em, ev);
    } catch {
      db.prepare('INSERT INTO users (id, created_at, stack_generations) VALUES (?, ?, 0)').run(supabaseUserId, now);
    }
    return;
  }

  if (em && (existing.email !== em || existing.email_verified !== ev)) {
    try {
      db.prepare('UPDATE users SET email = ?, email_verified = ? WHERE id = ?').run(em, ev, supabaseUserId);
    } catch {
      /* ignore email unique conflicts with legacy rows */
    }
  }
}

export function incrementChatMessages(userId: string): void {
  getDb()
    .prepare('UPDATE users SET chat_messages_used = chat_messages_used + 1 WHERE id = ?')
    .run(userId);
}

/** Save reminder settings for a user. stackJson is their serialised result object. */
export function setUserReminder(
  userId: string,
  reminderTime: string,
  timezone: string,
  stackJson: string,
  enabled: boolean,
): void {
  getDb()
    .prepare(`UPDATE users SET reminder_time = ?, reminder_timezone = ?,
              reminder_stack_json = ?, reminder_enabled = ? WHERE id = ?`)
    .run(reminderTime, timezone, stackJson, enabled ? 1 : 0, userId);
}

/** Returns all users whose reminder should fire right now (HH:MM in their timezone, enabled, has email). */
export function getUsersDueForReminder(currentHHMM: string, timezone: string): UserRow[] {
  return getDb()
    .prepare(`SELECT ${USER_ROW_SELECT} FROM users
              WHERE reminder_enabled = 1
              AND reminder_time = ?
              AND reminder_timezone = ?
              AND email IS NOT NULL
              AND reminder_stack_json IS NOT NULL`)
    .all(currentHHMM, timezone) as UserRow[];
}

/** Returns all distinct timezones that have at least one active reminder user. */
export function getActiveReminderTimezones(): string[] {
  const rows = getDb()
    .prepare(`SELECT DISTINCT reminder_timezone FROM users
              WHERE reminder_enabled = 1
              AND reminder_timezone IS NOT NULL
              AND email IS NOT NULL
              AND reminder_stack_json IS NOT NULL`)
    .all() as { reminder_timezone: string }[];
  return rows.map((r) => r.reminder_timezone);
}

// Magic token functions
export function createMagicToken(userId: string): string {
  const token = crypto.randomUUID() + '-' + crypto.randomUUID(); // 72 chars of randomness
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  getDb()
    .prepare('INSERT INTO magic_tokens (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)')
    .run(token, userId, expiresAt);
  return token;
}

export function verifyAndConsumeMagicToken(token: string): string | null {
  const row = getDb()
    .prepare('SELECT user_id, expires_at, used FROM magic_tokens WHERE token = ?')
    .get(token) as { user_id: string; expires_at: number; used: number } | undefined;
  if (!row) return null;
  if (row.used) return null;
  if (Date.now() > row.expires_at) return null;
  getDb().prepare('UPDATE magic_tokens SET used = 1 WHERE token = ?').run(token);
  return row.user_id;
}

export function cleanExpiredTokens(): void {
  getDb().prepare('DELETE FROM magic_tokens WHERE expires_at < ?').run(Date.now() - 60_000);
  getDb().prepare('DELETE FROM checkin_tokens WHERE expires_at < ?').run(Date.now() - 86_400_000);
}

/** Creates a one-click check-in token valid for 36 hours (survives if email arrives late). */
export function createCheckinToken(userId: string, date: string): string {
  const token = crypto.randomUUID() + '-ci-' + crypto.randomUUID();
  const expiresAt = Date.now() + 36 * 60 * 60 * 1000;
  getDb()
    .prepare('INSERT INTO checkin_tokens (token, user_id, date, used, expires_at) VALUES (?, ?, ?, 0, ?)')
    .run(token, userId, date, expiresAt);
  return token;
}

export function verifyAndConsumeCheckinToken(token: string): { userId: string; date: string } | null {
  const row = getDb()
    .prepare('SELECT user_id, date, expires_at, used FROM checkin_tokens WHERE token = ?')
    .get(token) as { user_id: string; date: string; expires_at: number; used: number } | undefined;
  if (!row || row.used || Date.now() > row.expires_at) return null;
  getDb().prepare('UPDATE checkin_tokens SET used = 1 WHERE token = ?').run(token);
  return { userId: row.user_id, date: row.date };
}

// Stack persistence functions
export type StackRow = {
  id: string;
  user_id: string;
  quiz_json: string;
  result_json: string;
  label: string | null;
  created_at: number;
  updated_at: number;
  is_active: number;
};

export function saveStack(userId: string, quizJson: string, resultJson: string, label?: string): string {
  const id = `stack_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const now = Date.now();
  // Mark all previous stacks inactive
  getDb().prepare('UPDATE stacks SET is_active = 0 WHERE user_id = ?').run(userId);
  // Insert new active stack
  getDb()
    .prepare(
      'INSERT INTO stacks (id, user_id, quiz_json, result_json, label, created_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    )
    .run(id, userId, quizJson, resultJson, label ?? null, now, now);
  return id;
}

export function getActiveStack(userId: string): StackRow | null {
  const row = getDb()
    .prepare('SELECT * FROM stacks WHERE user_id = ? AND is_active = 1 ORDER BY updated_at DESC LIMIT 1')
    .get(userId) as StackRow | undefined;
  return row ?? null;
}

export function getStackHistory(userId: string, limit = 10): StackRow[] {
  return getDb()
    .prepare('SELECT * FROM stacks WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?')
    .all(userId, limit) as StackRow[];
}

export function incrementStackGenerations(userId: string): void {
  getDb()
    .prepare('UPDATE users SET stack_generations = stack_generations + 1 WHERE id = ?')
    .run(userId);
}

export type SubscriptionRow = {
  paypal_subscription_id: string;
  user_id: string;
  tier: 'basic' | 'pro';
  status: string;
  plan_id: string | null;
  updated_at: number;
};

/** PayPal statuses that grant paid entitlements */
const ACTIVE_STATUSES = new Set(['ACTIVE', 'APPROVED']);

export function upsertSubscription(row: Omit<SubscriptionRow, 'updated_at'> & { updated_at?: number }): void {
  const updated_at = row.updated_at ?? Date.now();
  getDb()
    .prepare(
      `INSERT INTO subscriptions (paypal_subscription_id, user_id, tier, status, plan_id, updated_at)
       VALUES (@paypal_subscription_id, @user_id, @tier, @status, @plan_id, @updated_at)
       ON CONFLICT(paypal_subscription_id) DO UPDATE SET
         user_id = excluded.user_id,
         tier = excluded.tier,
         status = excluded.status,
         plan_id = excluded.plan_id,
         updated_at = excluded.updated_at`,
    )
    .run({
      ...row,
      updated_at,
    });
}

export function getActiveTierForUser(userId: string): 'free' | 'basic' | 'pro' {
  const sub = getActiveSubscription(userId);
  return sub ? sub.tier : 'free';
}

export function getActiveSubscription(userId: string): SubscriptionRow | null {
  const rows = getDb()
    .prepare(`SELECT * FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC`)
    .all(userId) as SubscriptionRow[];

  for (const r of rows) {
    if (ACTIVE_STATUSES.has(r.status)) {
      return r;
    }
  }
  return null;
}

export function getSubscriptionByPayPalId(id: string): SubscriptionRow | null {
  const row = getDb()
    .prepare('SELECT * FROM subscriptions WHERE paypal_subscription_id = ?')
    .get(id) as SubscriptionRow | undefined;
  return row ?? null;
}
