import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB, dbState } from './config/db.js';
import grievanceRoutes from './routes/grievanceRoutes.js';
import wardRoutes from './routes/wardRoutes.js';
import authRoutes from './routes/authRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Core Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// System Health Endpoint (Health & DB verification)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'CivicConnect REST API',
    version: '1.0.0',
    environment: NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbState.isConnected,
      mode: dbState.mode,
      uri: dbState.uri ? dbState.uri.replace(/:([^@]+)@/, ':****@') : 'not configured',
      ...(dbState.error ? { notice: dbState.error } : {}),
    },
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'CivicConnect REST API Gateway',
    version: '1.0.0',
    documentation: '/health',
    endpoints: {
      health: 'GET /health',
      complaints: '/api/complaints',
      wards: '/api/wards',
      auth: '/api/auth',
    },
  });
});

// Mount API routes
app.use('/api/complaints', grievanceRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Server initialization
let serverInstance = null;

export async function startServer() {
  await connectDB();

  return new Promise((resolve) => {
    serverInstance = app.listen(PORT, () => {
      console.log(`[CivicConnect API] Server running in ${NODE_ENV} mode on http://localhost:${PORT}`);
      console.log(`[CivicConnect API] Health check available at http://localhost:${PORT}/health`);
      resolve(serverInstance);
    });
  });
}

// Auto-start when executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[CivicConnect API] Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
