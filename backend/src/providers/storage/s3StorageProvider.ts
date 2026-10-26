import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config/index.js';
import type { IStorageProvider, StorageFile, UploadResult } from './storage.interface.js';

export class S3StorageProvider implements IStorageProvider {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    const s3 = config.storage.s3;
    if (!s3?.bucket || !s3?.accessKeyId || !s3?.secretAccessKey) {
      throw new Error(
        'Configuration Error: S3 storage provider is configured (STORAGE_PROVIDER=s3), but required S3 credentials (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) are missing. Please provide the required S3 environment variables.'
      );
    }

    this.bucket = s3.bucket;
    this.s3Client = new S3Client({
      region: s3.region || 'us-east-1',
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
      endpoint: s3.endpoint || undefined,
    });
  }

  async uploadFile(file: StorageFile): Promise<UploadResult> {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const randomHex = crypto.randomBytes(8).toString('hex');
    const key = `grievances/${Date.now()}-${randomHex}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    const baseUrl = config.storage.publicBaseUrl?.replace(/\/$/, '');
    const url = baseUrl
      ? `${baseUrl}/${key}`
      : `https://${this.bucket}.s3.${config.storage.s3?.region || 'us-east-1'}.amazonaws.com/${key}`;

    return {
      url,
      key,
      filename: path.basename(key),
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3Client.send(command);
  }
}
