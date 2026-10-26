import multer from 'multer';
import { config } from '../config/index.js';
import { BadRequestError } from '../errors/appError.js';
import type { Request, Response, NextFunction } from 'express';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: config.storage.maxFileSizeBytes, // 5MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = config.storage.allowedMimeTypes;
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Invalid file format '${file.mimetype}'. Only JPEG, PNG, and WebP images are supported.`
        )
      );
    }
  },
});

/**
 * Middleware that accepts a single image file from either 'image' or 'file' form field.
 */
export function uploadEvidenceMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Try 'image' or 'file' field
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      return next(err);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files.image && files.image.length > 0) {
        req.file = files.image[0];
      } else if (files.file && files.file.length > 0) {
        req.file = files.file[0];
      }
    }

    if (!req.file) {
      return next(new BadRequestError('No image file provided in request. Please attach an image file.'));
    }

    next();
  });
}
