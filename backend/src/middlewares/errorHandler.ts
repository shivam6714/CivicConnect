import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../errors/appError.js';
import { config } from '../config/index.js';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      },
    });
    return;
  }

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    let msg = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      msg = `File size exceeds allowed limit (${Math.round(config.storage.maxFileSizeBytes / (1024 * 1024))}MB).`;
    }
    res.status(400).json({
      success: false,
      error: {
        message: msg,
        statusCode: 400,
        code: err.code,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Request validation failed',
        statusCode: 400,
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Handle standard SyntaxError (e.g. malformed JSON in request body)
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON payload in request body',
        statusCode: 400,
      },
    });
    return;
  }

  // Generic or unexpected internal errors
  const isDev = config.nodeEnv === 'development';
  const errorMessage = err instanceof Error ? err.message : 'Internal server error';
  const stack = err instanceof Error ? err.stack : undefined;

  console.error('[Unhandled Error]', err);

  res.status(500).json({
    success: false,
    error: {
      message: isDev ? errorMessage : 'An unexpected internal server error occurred',
      statusCode: 500,
      ...(isDev && stack ? { stack } : {}),
    },
  });
};
