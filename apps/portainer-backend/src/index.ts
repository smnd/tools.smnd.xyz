/**
 * @file Main application entry point for the Portainer Updater Backend
 *
 * This module bootstraps an Express server that:
 * - Receives webhook notifications from Diun (Docker Image Update Notifier)
 * - Manages pending container/stack updates in a SQLite database
 * - Triggers Portainer webhooks to update containers and stacks
 * - Provides REST APIs for update management, history, and manual webhook triggering
 *
 * The server initializes the database, loads configuration from a JSON file,
 * and sets up middleware for CORS, JSON parsing, request logging, and error handling.
 */

import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './models/database.js';
import { loadConfig } from './utils/config.js';
import diunRouter from './routes/diun.js';
import updatesRouter from './routes/updates.js';
import historyRouter from './routes/history.js';
import triggerRouter from './routes/trigger.js';

/** Server port from environment or default to 3000 */
const PORT = process.env.PORT || 3000;

/** Express application instance */
const app = express();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

/** Enable Cross-Origin Resource Sharing for all origins */
app.use(cors());

/** Parse incoming JSON request bodies */
app.use(express.json());

/**
 * Request logging middleware
 * Logs timestamp, HTTP method, and request path for all incoming requests
 */
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Health check endpoint for monitoring
 * @route GET /health
 * @returns {Object} Status object with 'ok' status and current timestamp
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Diun webhook routes - Receives image update notifications from Diun
 * @route POST /api/diun/webhook - Accept new update notifications
 */
app.use('/api/diun', diunRouter);

/**
 * Update management routes - CRUD operations on pending updates
 * @route GET /api/updates - List all pending updates
 * @route POST /api/updates/:id/trigger - Trigger single update
 * @route POST /api/updates/batch - Trigger multiple updates
 * @route DELETE /api/updates/:id - Dismiss an update
 * @route POST /api/updates/stack/:stackName/trigger - Trigger all updates in a stack
 */
app.use('/api/updates', updatesRouter);

/**
 * History/audit log routes - Retrieve update execution history
 * @route GET /api/history - Get paginated update history
 */
app.use('/api/history', historyRouter);

/**
 * Direct webhook trigger route - Manually trigger any webhook URL
 * @route POST /api/trigger-webhook - Send POST request to specified webhook
 */
app.use('/api/trigger-webhook', triggerRouter);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 Not Found handler
 * Catches all requests that don't match any defined routes
 */
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Global error handler
 * Catches all errors thrown during request processing and returns a 500 response
 *
 * @param {Error} err - The error object
 * @param {express.Request} _req - The request object (unused)
 * @param {express.Response} res - The response object
 * @param {express.NextFunction} _next - The next middleware function (unused)
 */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

/**
 * Initialize and start the Express server
 *
 * This function:
 * 1. Initializes the SQLite database and creates tables if needed
 * 2. Loads webhook configuration from config.json
 * 3. Starts the Express server on the configured port
 * 4. Handles startup errors and exits the process if initialization fails
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If database initialization or config loading fails
 */
async function start() {
  try {
    console.log('Initializing database...');
    initializeDatabase();

    console.log('Loading configuration...');
    loadConfig();

    app.listen(PORT, () => {
      console.log(`\n🚀 Portainer Updater Backend running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   Diun webhook: http://localhost:${PORT}/api/diun/webhook`);
      console.log(`   Updates API: http://localhost:${PORT}/api/updates`);
      console.log(`   Trigger webhook: http://localhost:${PORT}/api/trigger-webhook\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
start();
