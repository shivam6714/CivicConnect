import type { Request, Response, NextFunction } from 'express';
import { getStorageProvider } from '../providers/storage/index.js';
import { BadRequestError } from '../errors/appError.js';

export async function uploadEvidenceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new BadRequestError('No image file provided for upload.');
    }

    const storageProvider = getStorageProvider();
    const result = await storageProvider.uploadFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json({
      success: true,
      message: 'Photographic evidence uploaded successfully.',
      file: result,
      url: result.url,
      key: result.key,
      metadata: {
        filename: result.filename,
        size: result.size,
        mimeType: result.mimetype,
        originalName: req.file.originalname,
      },
    });
  } catch (error) {
    next(error);
  }
}
