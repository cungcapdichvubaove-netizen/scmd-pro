import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { MediaService } from '../../../core/media/media.service.js';
import { db } from '../../../core/db/prisma.js';

type ReportArtifactKind = 'pdf' | 'excel';

interface StoreReportArtifactInput {
  tenantId: string;
  reportId: string;
  fileName: string;
  fileType: string;
  content: Buffer;
  kind: ReportArtifactKind;
  generatedBy: string;
}

const resolveReportPublicBaseUrl = () => {
  const candidates = [
    process.env.REPORT_PUBLIC_BASE_URL,
    process.env.PUBLIC_APP_URL,
    process.env.APP_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = candidate.trim().replace(/\/$/, '');
    if (normalized) {
      return normalized;
    }
  }

  return 'http://localhost:3000';
};

const buildDownloadUrl = (reportId: string, attachmentId: string) => {
  const baseUrl = resolveReportPublicBaseUrl();
  return `${baseUrl}/api/tenant/monthly-acceptance-reports/${reportId}/artifacts/${attachmentId}/download`;
};

const isStrictProductionStorageMode = () => {
  const appUrl = resolveReportPublicBaseUrl();
  const isLocalApp = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');
  return process.env.NODE_ENV === 'production' && !isLocalApp;
};

const createArtifactMetadata = (input: {
  reportId: string;
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  generatedAt: string;
  generatedBy: string;
  kind: ReportArtifactKind;
  storageDriver: string;
  localPath?: string;
}) => ({
  reportId: input.reportId,
  storageKey: input.storageKey,
  fileName: input.fileName,
  fileSize: input.fileSize,
  mimeType: input.mimeType,
  checksum: input.checksum,
  generatedAt: input.generatedAt,
  generatedBy: input.generatedBy,
  kind: input.kind,
  storageDriver: input.storageDriver,
  ...(input.localPath ? { localPath: input.localPath } : {}),
});

export class ReportArtifactStorageService {
  static async store(input: StoreReportArtifactInput) {
    const checksum = createHash('sha256').update(input.content).digest('hex');
    const generatedAt = new Date().toISOString();

    let metadata: Record<string, any>;
    try {
      const upload = await MediaService.uploadBinary(input.content, {
        tenantId: input.tenantId,
        scope: `reports/monthly-acceptance/${input.reportId}`,
        fileName: input.fileName,
        contentType: input.fileType,
      });

      metadata = createArtifactMetadata({
        reportId: input.reportId,
        storageKey: upload.publicId,
        fileName: input.fileName,
        fileSize: input.content.length,
        mimeType: input.fileType,
        checksum,
        generatedAt,
        generatedBy: input.generatedBy,
        kind: input.kind,
        storageDriver: upload.url.includes('cloudflarestorage.com') ? 'r2' : 's3-compatible',
      });
    } catch (error: any) {
      if (error?.message !== 'NO_STORAGE_PROVIDER_CONFIGURED') {
        throw error;
      }

      if (isStrictProductionStorageMode()) {
        throw new Error('REPORT_STORAGE_PROVIDER_REQUIRED');
      }

      const localDir = path.resolve(process.cwd(), 'storage', 'reports', input.tenantId, input.reportId);
      await mkdir(localDir, { recursive: true });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
      const localPath = path.join(localDir, safeName);
      await writeFile(localPath, input.content);

      metadata = createArtifactMetadata({
        reportId: input.reportId,
        storageKey: `local://${input.tenantId}/${input.reportId}/${safeName}`,
        fileName: input.fileName,
        fileSize: input.content.length,
        mimeType: input.fileType,
        checksum,
        generatedAt,
        generatedBy: input.generatedBy,
        kind: input.kind,
        storageDriver: 'local-fs',
        localPath,
      });
    }

    return db.withTenant(input.tenantId, async (tx) => {
      const attachment = await tx.attachment.create({
        data: {
          tenantId: input.tenantId,
          name: input.fileName,
          url: buildDownloadUrl(input.reportId, 'pending'),
          fileType: input.fileType,
          size: input.content.length,
          category: 'REPORT',
          tags: ['monthly-acceptance', input.kind],
          uploadedBy: input.generatedBy,
          metadata,
        },
      });

      const finalizedAttachment = await tx.attachment.update({
        where: { id: attachment.id },
        data: {
          url: buildDownloadUrl(input.reportId, attachment.id),
        },
      });

      await tx.monthlyAcceptanceReport.update({
        where: { id: input.reportId },
        data: input.kind === 'pdf'
          ? { exportPdfAttachmentId: attachment.id }
          : { exportExcelAttachmentId: attachment.id },
      });

      return finalizedAttachment;
    });
  }

  static async read(attachment: { metadata: unknown }) {
    const metadata = attachment.metadata && typeof attachment.metadata === 'object'
      ? attachment.metadata as Record<string, any>
      : {};

    if (typeof metadata.localPath === 'string' && metadata.localPath) {
      return readFile(metadata.localPath);
    }

    if (typeof metadata.storageKey === 'string' && metadata.storageKey && !metadata.storageKey.startsWith('local://')) {
      return MediaService.downloadBinary(metadata.storageKey);
    }

    if (typeof metadata.contentBase64 === 'string' && metadata.contentBase64) {
      if (isStrictProductionStorageMode()) {
        throw new Error('REPORT_ARTIFACT_STORAGE_VIOLATION');
      }
      return Buffer.from(metadata.contentBase64, 'base64');
    }

    throw new Error('REPORT_ARTIFACT_NOT_FOUND');
  }
}
