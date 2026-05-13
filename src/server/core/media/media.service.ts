import sharp from 'sharp';
import { StorageProvider, UploadResult, PresignedUploadResult } from './storage-provider.js';
import { S3Provider, S3ProviderConfig } from './providers/s3.provider.js';
import { logger } from '../logger/index.js';
import { db } from '../db/prisma.js';

export class MediaService {
  private static provider: StorageProvider | null = null;

  private static async getProvider(): Promise<StorageProvider> {
    if (this.provider) return this.provider;

    // Fetch config from DB
    const config = await db.system().systemConfig.findUnique({
      where: { key: 'STORAGE_CONFIG' }
    });

    if (config) {
      const { type, credentials } = config.value as any;
      if (type === 's3' || type === 'r2') {
        this.provider = new S3Provider(credentials as S3ProviderConfig);
        return this.provider;
      }
    }

    // Default to R2 from env as fallback
    if (process.env.R2_ACCOUNT_ID) {
      this.provider = new S3Provider({
        bucketName: process.env.R2_BUCKET!,
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      });
      return this.provider;
    }

    throw new Error('NO_STORAGE_PROVIDER_CONFIGURED');
  }

  static async getPresignedUpload(
    context: { tenantId: string; type: string; ext: string },
    options: { contentType?: string; maxSizeBytes?: number } = {}
  ): Promise<PresignedUploadResult> {
    const provider = await this.getProvider();
    if (!provider.getPresignedUpload) {
      throw new Error(`Provider ${provider.name} does not support pre-signed URLs`);
    }

    const { tenantId, ext } = context;
    // Generate an ID for the image record
    const { randomUUID } = await import('crypto');
    const imageId = randomUUID();
    
    // Path structure: tenant/{tenantId}/images/{imageId}/original.{ext}
    const path = `tenant/${tenantId}/images/${imageId}/original.${ext}`;

    const presigned = await provider.getPresignedUpload(path, options);

    return presigned;
  }

  /**
   * Optimizes and uploads an image directly.
   */
  static async uploadImage(
    file: Buffer, 
    context: { tenantId: string; guardId: string; type: string }
  ): Promise<UploadResult> {
    const provider = await this.getProvider();
    
    logger.info({ context }, 'Optimizing and uploading image');

    // 1. Optimization with Sharp
    const optimizedBuffer = await sharp(file)
      .resize(1200, null, { withoutEnlargement: true }) // Responsive max-width
      .jpeg({ quality: 80 }) // 80% quality is a sweet spot for security photos
      .toBuffer();

    // 2. Organized Path: tenantId/guardId/type/YYYY-MM-DD
    const date = new Date().toISOString().split('T')[0];
    const path = `tenant/${context.tenantId}/guards/${context.guardId}/${context.type}/${date}`;

    // 3. Upload
    return await provider.upload(optimizedBuffer, path, { contentType: 'image/jpeg' });
  }

  static async refreshConfig() {
    this.provider = null;
  }
}
