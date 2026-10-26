import { app } from './app.js';
import { config, validateConfig } from './config/index.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initAuthIndexes } from './modules/auth/index.js';
import type { Server } from 'node:http';

let server: Server | null = null;

async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();

    // Connect to database if database mode is enabled (with retries for transient socket resets)
    if (config.enableDb) {
      console.log(`[Database] Connecting to MongoDB at ${config.mongoUri.replace(/\/\/.*@/, '//***@')}...`);
      let connected = false;
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await connectDB();
          await initAuthIndexes();
          connected = true;
          break;
        } catch (dbErr) {
          lastError = dbErr;
          console.warn(
            `[Database] Connection attempt ${attempt}/3 encountered transient error: ${
              (dbErr as Error)?.message || dbErr
            }. Retrying in 1.5s...`
          );
          await disconnectDB().catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      if (!connected) {
        throw lastError;
      }
      console.log('[Database] MongoDB connection established and critical indexes verified.');
    } else {

      console.log('[Database] Database mode is disabled (ENABLE_DB=false). Running in standalone mode.');
    }

    // Start listening on configured port
    server = app.listen(config.port, () => {
      console.log(`[CivicConnect] Backend server is listening on port ${config.port}`);
      console.log(`[CivicConnect] Environment: ${config.nodeEnv}`);
      console.log(`[CivicConnect] Health check available at: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error('[CivicConnect] Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[CivicConnect] Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => {
        console.log('[CivicConnect] HTTP server closed.');
        resolve();
      });
    });
  }

  if (config.enableDb) {
    await disconnectDB();
  }

  console.log('[CivicConnect] Graceful shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// CivicConnect Backend Server entrypoint
void startServer();