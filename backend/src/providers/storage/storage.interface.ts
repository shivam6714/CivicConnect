export interface StorageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  mimetype: string;
  size: number;
}

export interface IStorageProvider {
  uploadFile(file: StorageFile): Promise<UploadResult>;
  deleteFile?(key: string): Promise<void>;
}
