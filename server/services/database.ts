import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "bundler.db");
const dataDir = path.dirname(DB_PATH);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("synchronous = NORMAL");
  }
  return db;
}

export function initDatabase(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      encryption_salt TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT,
      is_active INTEGER DEFAULT 1,
      total_fees_paid REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      wallet_index INTEGER NOT NULL,
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      label TEXT DEFAULT 'Wallet',
      sol_balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      last_sync TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, wallet_index)
    );

    CREATE TABLE IF NOT EXISTS launches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_name TEXT NOT NULL,
      token_symbol TEXT NOT NULL,
      token_mint TEXT,
      launchpad TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      tx_signature TEXT,
      bundle_id TEXT,
      initial_sol_spent REAL DEFAULT 0,
      bundle_sol_total REAL DEFAULT 0,
      wallet_count INTEGER DEFAULT 0,
      fee_sol REAL DEFAULT 0,
      fee_paid INTEGER DEFAULT 0,
      fee_tx TEXT,
      token_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      error_msg TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS bundled_buys (
      id TEXT PRIMARY KEY,
      launch_id TEXT NOT NULL,
      wallet_public_key TEXT NOT NULL,
      sol_amount REAL NOT NULL,
      token_amount REAL,
      tx_signature TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (launch_id) REFERENCES launches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fee_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      launch_id TEXT NOT NULL,
      amount_sol REAL NOT NULL,
      fee_wallet TEXT NOT NULL,
      tx_signature TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (launch_id) REFERENCES launches(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_launches_user ON launches(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token_hash);
  `);

  console.log("Database initialized");
}

export function run(sql: string, params: any[] = []) {
  const stmt = getDb().prepare(sql);
  return stmt.run(...params);
}

export function get(sql: string, params: any[] = []): any {
  const stmt = getDb().prepare(sql);
  return stmt.get(...params);
}

export function all(sql: string, params: any[] = []): any[] {
  const stmt = getDb().prepare(sql);
  return stmt.all(...params);
}
