import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'updates.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
export const db: BetterSqlite3.Database = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables
export function initializeDatabase() {
  // Updates table - tracks detected updates from Diun
  db.exec(`
    CREATE TABLE IF NOT EXISTS updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image TEXT NOT NULL,
      container_name TEXT,
      container_id TEXT,
      stack TEXT,
      current_digest TEXT,
      new_digest TEXT NOT NULL,
      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      webhook_url TEXT,
      metadata TEXT,
      UNIQUE(image, container_name, new_digest)
    )
  `);

  // Update history - audit log of all triggered updates
  db.exec(`
    CREATE TABLE IF NOT EXISTS update_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      update_id INTEGER,
      image TEXT NOT NULL,
      container_name TEXT,
      stack TEXT,
      triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP,
      status TEXT DEFAULT 'triggered',
      error_message TEXT,
      webhook_url TEXT,
      FOREIGN KEY (update_id) REFERENCES updates(id)
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_updates_status ON updates(status);
    CREATE INDEX IF NOT EXISTS idx_updates_stack ON updates(stack);
    CREATE INDEX IF NOT EXISTS idx_history_triggered ON update_history(triggered_at);
  `);

  console.log('Database initialized successfully');
}

// Prepared statements for common operations
export const statements: {
  getPendingUpdates: BetterSqlite3.Statement;
  getUpdateById: BetterSqlite3.Statement;
  insertUpdate: BetterSqlite3.Statement;
  updateStatus: BetterSqlite3.Statement;
  deleteUpdate: BetterSqlite3.Statement;
  insertHistory: BetterSqlite3.Statement;
  updateHistoryStatus: BetterSqlite3.Statement;
  getHistory: BetterSqlite3.Statement;
  getHistoryCount: BetterSqlite3.Statement;
} = {
  // Get all pending updates
  getPendingUpdates: db.prepare(`
    SELECT * FROM updates
    WHERE status = 'pending'
    ORDER BY stack, container_name, detected_at DESC
  `),

  // Get update by ID
  getUpdateById: db.prepare(`
    SELECT * FROM updates WHERE id = ?
  `),

  // Insert new update
  insertUpdate: db.prepare(`
    INSERT INTO updates (
      image, container_name, container_id, stack,
      current_digest, new_digest, webhook_url, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // Update status
  updateStatus: db.prepare(`
    UPDATE updates SET status = ? WHERE id = ?
  `),

  // Delete update
  deleteUpdate: db.prepare(`
    DELETE FROM updates WHERE id = ?
  `),

  // Insert history record
  insertHistory: db.prepare(`
    INSERT INTO update_history (
      update_id, image, container_name, stack,
      status, webhook_url
    ) VALUES (?, ?, ?, ?, ?, ?)
  `),

  // Update history status
  updateHistoryStatus: db.prepare(`
    UPDATE update_history
    SET status = ?, completed_at = CURRENT_TIMESTAMP, error_message = ?
    WHERE id = ?
  `),

  // Get history with pagination
  getHistory: db.prepare(`
    SELECT * FROM update_history
    ORDER BY triggered_at DESC
    LIMIT ? OFFSET ?
  `),

  // Get history count
  getHistoryCount: db.prepare(`
    SELECT COUNT(*) as count FROM update_history
  `),
};

// Types
export interface Update {
  id: number;
  image: string;
  container_name: string | null;
  container_id: string | null;
  stack: string | null;
  current_digest: string | null;
  new_digest: string;
  detected_at: string;
  status: 'pending' | 'updating' | 'completed' | 'failed';
  webhook_url: string | null;
  metadata: string | null;
}

export interface UpdateHistory {
  id: number;
  update_id: number | null;
  image: string;
  container_name: string | null;
  stack: string | null;
  triggered_at: string;
  completed_at: string | null;
  status: 'triggered' | 'completed' | 'failed';
  error_message: string | null;
  webhook_url: string | null;
}
