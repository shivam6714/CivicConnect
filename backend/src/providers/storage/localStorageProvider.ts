import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../../config/index.js';
import type { IStorageProvider, StorageFile, UploadResult } from './storage.interface.js';

export class LocalStorageProvider implements IStorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), config.storage.localDir);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async uploadFile(file: StorageFile): Promise<UploadResult> {
    await this.ensureDir();

    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt) ? rawExt : '.jpg';
    const randomHex = crypto.randomBytes(8).toString('hex');
    const filename = `evidence-${Date.now()}-${randomHex}${safeExt}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.writeFile(filePath, file.buffer);

    const baseUrl = config.storage.publicBaseUrl?.replace(/\/$/, '') || '';
    const url = baseUrl ? `${baseUrl}/uploads/${filename}` : `/uploads/${filename}`;

    return {
      url,
      key: filename,
      filename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const safeFilename = path.basename(key);
    const filePath = path.resolve(this.uploadDir, safeFilename);
    if (!filePath.startsWith(this.uploadDir)) {
      return;
    }
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file not found
    }
  }
}
