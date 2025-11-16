/**
 * @file Database layer for managing SQLite persistence of container updates
 *
 * This module sets up a BetterSqlite3 database with two main tables:
 * - `updates`: Tracks detected image updates from Diun (pending, updating, completed, failed)
 * - `update_history`: Audit log of all triggered updates with results and errors
 *
 * Features:
 * - WAL (Write-Ahead Logging) mode for better concurrency
 * - Migration support for schema changes
 * - Pre-compiled prepared statements for common operations
 * - TypeScript interfaces for type safety
 * - Indexed queries for performance
 *
 * The database stores:
 * - Pending updates waiting to be triggered
 * - Both container-level and stack-level webhook URLs
 * - Complete audit trail of what was triggered, when, and with what result
 */

import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/** Directory where the SQLite database file is stored */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

/** Full path to the SQLite database file */
const DB_PATH = path.join(DATA_DIR, 'updates.db');

// Ensure data directory exists - create it if needed
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** BetterSqlite3 database instance - singleton for the entire application */
export const db: BetterSqlite3.Database = new Database(DB_PATH);

/** Enable WAL mode for better concurrent read/write access */
db.pragma('journal_mode = WAL');

/**
 * Initialize the database schema
 *
 * Creates two main tables if they don't exist:
 * 1. `updates` - Tracks detected image updates from Diun
 * 2. `update_history` - Audit log of triggered updates
 *
 * Also creates indexes for performance optimization and handles schema migrations.
 *
 * @returns {void}
 */
export function initializeDatabase() {
  /**
   * Updates table - Stores detected Docker image updates from Diun
   *
   * Schema:
   * - id: Unique auto-incrementing primary key
   * - image: Docker image name (e.g., 'myregistry/myapp:latest')
   * - container_name: Name of the container running this image
   * - container_id: Docker container ID
   * - stack: Portainer stack name (nullable - inferred from webhook config)
   * - current_digest: Digest of currently running image
   * - new_digest: Digest of available new image
   * - detected_at: Timestamp when Diun detected the update
   * - status: 'pending' | 'updating' | 'completed' | 'failed'
   * - webhook_url: Portainer webhook to trigger for container-level update
   * - stack_webhook_url: Portainer webhook to trigger for stack-level update
   * - metadata: JSON string with additional info (container state, etc.)
   * - UNIQUE constraint: (image, container_name, new_digest) prevents duplicates
   */
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
      stack_webhook_url TEXT,
      metadata TEXT,
      UNIQUE(image, container_name, new_digest)
    )
  `);

  /**
   * Schema migration: Add stack_webhook_url column
   * This handles older databases that don't have the stack_webhook_url column
   * The column stores the webhook URL for stack-level updates (optional)
   * Errors are silently ignored if the column already exists
   */
  try {
    db.exec(`ALTER TABLE updates ADD COLUMN stack_webhook_url TEXT`);
    console.log('Added stack_webhook_url column to updates table');
  } catch (error) {
    // Column already exists in newer databases - ignore the error
  }

  /**
   * Update history table - Immutable audit log of all triggered updates
   *
   * Schema:
   * - id: Unique auto-incrementing primary key
   * - update_id: Foreign key to the update that was triggered (nullable)
   * - image: Docker image name (denormalized for audit trail)
   * - container_name: Container name at trigger time
   * - stack: Stack name at trigger time
   * - triggered_at: Timestamp when webhook was triggered
   * - completed_at: Timestamp when webhook completed (null while pending)
   * - status: 'triggered' | 'completed' | 'failed'
   * - error_message: Error details if status is 'failed'
   * - webhook_url: The webhook URL that was triggered (immutable record)
   *
   * This table is append-only for an immutable audit trail.
   */
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

  /**
   * Create indexes for query performance optimization
   *
   * Indexes speed up:
   * - Finding pending updates (status filtering)
   * - Finding updates by stack (stack filtering)
   * - Sorting history by triggered_at (pagination)
   */
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_updates_status ON updates(status);
    CREATE INDEX IF NOT EXISTS idx_updates_stack ON updates(stack);
    CREATE INDEX IF NOT EXISTS idx_history_triggered ON update_history(triggered_at);
  `);

  console.log('Database initialized successfully');
}

// Initialize database on module load
initializeDatabase();

// ============================================================================
// PREPARED STATEMENTS - Pre-compiled SQL queries for performance
// ============================================================================

/**
 * Collection of pre-compiled prepared statements for common database operations
 *
 * Using prepared statements provides:
 * - Better performance (compiled once, executed many times)
 * - SQL injection protection (parameters are bound safely)
 * - Cleaner code (statements defined in one place)
 *
 * Statements are cached as module exports and reused throughout the application.
 */
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
  /**
   * Get all pending updates
   * @returns {Update[]} All updates with status='pending' ordered by stack/container/date
   */
  getPendingUpdates: db.prepare(`
    SELECT * FROM updates
    WHERE status = 'pending'
    ORDER BY stack, container_name, detected_at DESC
  `),

  /**
   * Get a single update by ID
   * @param {number} id - Update ID
   * @returns {Update|undefined} The update record or undefined if not found
   */
  getUpdateById: db.prepare(`
    SELECT * FROM updates WHERE id = ?
  `),

  /**
   * Insert a new detected update
   * @param {string} image - Docker image name
   * @param {string|null} containerName - Container name
   * @param {string|null} containerId - Container ID
   * @param {string|null} stack - Portainer stack name
   * @param {string|null} currentDigest - Current image digest
   * @param {string} newDigest - New available image digest
   * @param {string|null} webhookUrl - Container webhook URL
   * @param {string|null} stackWebhookUrl - Stack webhook URL
   * @param {string|null} metadata - JSON metadata string
   */
  insertUpdate: db.prepare(`
    INSERT INTO updates (
      image, container_name, container_id, stack,
      current_digest, new_digest, webhook_url, stack_webhook_url, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  /**
   * Update the status of an existing update
   * @param {string} status - New status ('pending' | 'updating' | 'completed' | 'failed')
   * @param {number} id - Update ID
   */
  updateStatus: db.prepare(`
    UPDATE updates SET status = ? WHERE id = ?
  `),

  /**
   * Delete/dismiss an update from the pending list
   * @param {number} id - Update ID to delete
   */
  deleteUpdate: db.prepare(`
    DELETE FROM updates WHERE id = ?
  `),

  /**
   * Create a new history record (audit log entry)
   * @param {number|null} updateId - Reference to the update being triggered
   * @param {string} image - Docker image name
   * @param {string|null} containerName - Container name
   * @param {string|null} stack - Stack name
   * @param {string} status - Initial status ('triggered')
   * @param {string|null} webhookUrl - Webhook URL that was triggered
   */
  insertHistory: db.prepare(`
    INSERT INTO update_history (
      update_id, image, container_name, stack,
      status, webhook_url
    ) VALUES (?, ?, ?, ?, ?, ?)
  `),

  /**
   * Update a history record with completion status and result
   * @param {string} status - Final status ('completed' | 'failed')
   * @param {string|null} errorMessage - Error message if status is 'failed'
   * @param {number} id - History record ID
   */
  updateHistoryStatus: db.prepare(`
    UPDATE update_history
    SET status = ?, completed_at = CURRENT_TIMESTAMP, error_message = ?
    WHERE id = ?
  `),

  /**
   * Get paginated history records (newest first)
   * @param {number} limit - Number of records to fetch
   * @param {number} offset - Starting offset for pagination
   * @returns {UpdateHistory[]} Paginated history records
   */
  getHistory: db.prepare(`
    SELECT * FROM update_history
    ORDER BY triggered_at DESC
    LIMIT ? OFFSET ?
  `),

  /**
   * Get total count of history records
   * @returns {{count: number}} Object with count property
   */
  getHistoryCount: db.prepare(`
    SELECT COUNT(*) as count FROM update_history
  `),
};

// ============================================================================
// TypeScript INTERFACES
// ============================================================================

/**
 * Represents a detected container/stack update from Diun
 *
 * A record in this table means:
 * - Diun detected a new image version is available
 * - The update is in a certain state (pending, updating, completed, or failed)
 * - The system knows which webhook(s) to trigger to update it
 */
export interface Update {
  /** Unique auto-increment identifier */
  id: number;

  /** Docker image name/reference (e.g., 'myregistry/myapp:latest') */
  image: string;

  /** Name of the container running this image */
  container_name: string | null;

  /** Docker container ID (full hash) */
  container_id: string | null;

  /** Portainer stack name (inferred from webhook config) */
  stack: string | null;

  /** Digest hash of the currently running image */
  current_digest: string | null;

  /** Digest hash of the newly available image */
  new_digest: string;

  /** ISO timestamp when Diun detected this update */
  detected_at: string;

  /** Update state: 'pending' | 'updating' | 'completed' | 'failed' */
  status: 'pending' | 'updating' | 'completed' | 'failed';

  /** Portainer webhook URL to trigger for container-level update */
  webhook_url: string | null;

  /** Portainer webhook URL to trigger for stack-level update */
  stack_webhook_url: string | null;

  /** JSON string with metadata from Diun (container state, etc.) */
  metadata: string | null;
}

/**
 * Represents an audit log entry of a triggered update
 *
 * This is an immutable record of:
 * - What update was triggered
 * - When it was triggered
 * - Whether it succeeded or failed
 * - Any error message if it failed
 *
 * Used for viewing update history and debugging webhook failures.
 */
export interface UpdateHistory {
  /** Unique auto-increment identifier */
  id: number;

  /** Reference to the update ID (nullable if webhook was triggered manually) */
  update_id: number | null;

  /** Docker image name (denormalized for audit trail) */
  image: string;

  /** Container name at trigger time (denormalized) */
  container_name: string | null;

  /** Stack name at trigger time (denormalized) */
  stack: string | null;

  /** ISO timestamp when the webhook was triggered */
  triggered_at: string;

  /** ISO timestamp when the webhook completed (null if still running) */
  completed_at: string | null;

  /** Webhook result: 'triggered' | 'completed' | 'failed' */
  status: 'triggered' | 'completed' | 'failed';

  /** Error message if the webhook failed (null on success) */
  error_message: string | null;

  /** The webhook URL that was triggered (immutable record) */
  webhook_url: string | null;
}
