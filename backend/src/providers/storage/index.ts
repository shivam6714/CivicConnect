import { config } from '../../config/index.js';
import type { IStorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './localStorageProvider.js';
import { S3StorageProvider } from './s3StorageProvider.js';

let storageProviderInstance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (!storageProviderInstance) {
    if (config.storage.provider === 's3') {
      storageProviderInstance = new S3StorageProvider();
    } else {
      storageProviderInstance = new LocalStorageProvider();
    }
  }
  return storageProviderInstance;
}

export function resetStorageProvider(): void {
  storageProviderInstance = null;
}

export * from './storage.interface.js';
