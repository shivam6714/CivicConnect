import express, { type Express } from 'express';
import cors from 'cors';
import { config, type AppConfig } from './config/index.js';
import { rootRouter } from './routes/index.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';

export function createApp(overrides?: Partial<AppConfig>): Express {
  const app: Express = express();

  const corsOrigin = overrides?.corsOrigin ?? config.corsOrigin;
  const corsCredentials = overrides?.corsCredentials ?? config.corsCredentials;

  // Configure CORS: wildcard origins are NEVER combined with credentials: true
  app.use(
    cors({
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: corsCredentials,
    })
  );

  // Parse JSON payloads and URL-encoded bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API routes
  app.use('/', rootRouter);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Centralized error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
