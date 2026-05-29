import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { StorageProvider, UploadResult, PresignedUploadResult } from '../storage-provider.js';
import { logger } from '../../logger/index.js';

export interface S3ProviderConfig {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrlPrefix?: string;
}

export class S3Provider implements StorageProvider {
  name = 's3-compatible';
  private client: S3Client;
  private bucketName: string;
  private publicUrlPrefix: string;

  constructor(config: S3ProviderConfig) {
    this.bucketName = config.bucketName;
    this.publicUrlPrefix = config.publicUrlPrefix || `https://${this.bucketName}.s3.${config.region}.amazonaws.com`;
    
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Force path style if endpoint is provided (useful for MinIO/R2)
      forcePathStyle: !!config.endpoint, 
    });
  }

  async upload(file: Buffer, path: string, options: any = {}): Promise<UploadResult> {
    const key = `scmd/${path}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: options.contentType || 'application/octet-stream',
      ...options.s3Options
    });

    try {
      await this.client.send(command);
      return {
        url: `${this.publicUrlPrefix}/${key}`,
        publicId: key,
        format: options.contentType?.split('/')[1] || 'unknown',
        bytes: file.length,
      };
    } catch (error) {
      logger.error({ error, key }, 'S3 upload failed');
      throw error;
    }
  }

  async download(publicId: string): Promise<Buffer> {
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: publicId,
      }));

      const body = response.Body;
      if (!body) {
        throw new Error('S3 object body is empty');
      }

      if (typeof (body as any).transformToByteArray === 'function') {
        const bytes = await (body as any).transformToByteArray();
        return Buffer.from(bytes);
      }

      const chunks: Buffer[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error({ error, publicId }, 'S3 download failed');
      throw error;
    }
  }

  async delete(publicId: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: publicId,
      }));
    } catch (error) {
      logger.error({ error, publicId }, 'S3 delete failed');
      throw error;
    }
  }

  async changeStorageClass(publicId: string, storageClass: 'STANDARD' | 'COLD'): Promise<void> {
    const targetStorageClass = storageClass === 'COLD' ? 'DEEP_ARCHIVE' : 'STANDARD';

    try {
      await this.client.send(new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: publicId,
        CopySource: `${this.bucketName}/${publicId}`,
        StorageClass: targetStorageClass,
        MetadataDirective: 'COPY',
      }));
    } catch (error) {
      logger.error({ error, publicId, storageClass }, 'S3 change storage class failed');
      throw error;
    }
  }

  async getPresignedUpload(path: string, options: any = {}): Promise<PresignedUploadResult> {
    const key = `scmd/${path}`;
    const expirationSeconds = options.expiresIn || 900; // default 15 minutes
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

    const conditions: any[] = [
      ['content-length-range', 0, options.maxSizeBytes || 10485760], // 10MB default
    ];

    if (options.contentType) {
      conditions.push(['eq', '$Content-Type', options.contentType]);
    } else if (options.allowedMimeTypes && Array.isArray(options.allowedMimeTypes)) {
      // In S3, exact Content-Type constraint can be achieved by matching
      // We will skip strict condition here and rely on pre-signed POST Fields if no exact contentType is supplied.
    }

    try {
      const presignedPost = await createPresignedPost(this.client, {
        Bucket: this.bucketName,
        Key: key,
        Conditions: conditions,
        Fields: {
          ...(options.contentType && { 'Content-Type': options.contentType })
        },
        Expires: expirationSeconds,
      });

      return {
        uploadUrl: presignedPost.url,
        fields: presignedPost.fields,
        key: key,
        expiresAt: expiresAt
      };
    } catch (error) {
      logger.error({ error, key }, 'Failed to generate S3 presigned post URL');
      throw error;
    }
  }
}
