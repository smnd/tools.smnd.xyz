import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './models/database.js';
import { loadConfig } from './utils/config.js';
import diunRouter from './routes/diun.js';
import updatesRouter from './routes/updates.js';
import historyRouter from './routes/history.js';

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/diun', diunRouter);
app.use('/api/updates', updatesRouter);
app.use('/api/history', historyRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Initialize and start server
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
      console.log(`   Updates API: http://localhost:${PORT}/api/updates\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
