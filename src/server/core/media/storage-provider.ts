export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  fields?: Record<string, string>; // Only returned for Pre-signed POST
  key: string;
  expiresAt: Date;
}

export interface StorageProvider {
  name: string;
  upload(file: Buffer, path: string, options?: any): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
  getPresignedUpload?(path: string, options?: any): Promise<PresignedUploadResult>;
}
