import { Router, type Request, type Response } from 'express';
import { getDbStatus, isDbConnected } from '../config/db.js';
import { config } from '../config/index.js';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  const dbStatus = getDbStatus();

  // If database mode is enabled, verify active connection state
  if (config.enableDb) {
    const isHealthy = isDbConnected();
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'ok' : 'unhealthy',
      service: 'CivicConnect Backend API',
      location: 'Jammu, Jammu & Kashmir',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        enabled: true,
        status: dbStatus,
        ...(!isHealthy ? { message: 'Database connection is unavailable or disconnected' } : {}),
      },
    });
    return;
  }

  // When database mode is disabled, explicitly declare it is disabled
  res.status(200).json({
    status: 'ok',
    service: 'CivicConnect Backend API',
    location: 'Jammu, Jammu & Kashmir',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      enabled: false,
      status: 'disabled',
      message: 'Database connectivity is disabled (ENABLE_DB=false)',
    },
  });
});
