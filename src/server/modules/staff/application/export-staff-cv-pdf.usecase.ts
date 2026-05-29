import { z } from 'zod';
import { INTERNAL_API_SECRET } from '../../../core/auth/secrets.js';
import { logger } from '../../../core/logger/index.js';
import { PDFClient } from '../../../infra/pdf/client.js';

const exportStaffCvPdfInputSchema = z.object({
  id: z.string().min(1),
  fields: z.string().optional()
});

const VALID_EXPORT_FIELDS = new Set([
  'name',
  'staffId',
  'role',
  'qualifications',
  'certificates',
  'rewards',
  'disciplines'
]);

export class ExportStaffCvPdfUseCase {
  async execute(input: z.infer<typeof exportStaffCvPdfInputSchema>): Promise<{ buffer: Buffer; fileName: string }> {
    const { id, fields } = exportStaffCvPdfInputSchema.parse(input);
    const safeFields = (fields || '')
      .split(',')
      .map((field) => field.trim())
      .filter((field) => VALID_EXPORT_FIELDS.has(field))
      .join(',');

    const internalUrl = `http://localhost:3000/api/internal/staff/${encodeURIComponent(id)}/cv?fields=${encodeURIComponent(safeFields)}`;
    logger.info({ id, internalUrl }, 'Generating PDF for staff');

    const pdfBuffer = await PDFClient.generate(internalUrl, {
      format: 'A4',
      printBackground: true
    }, INTERNAL_API_SECRET);

    if (pdfBuffer.length < 10 || !pdfBuffer.slice(0, 4).toString().includes('%PDF')) {
      logger.error({ bufferSample: pdfBuffer.slice(0, 50).toString() }, 'Invalid PDF buffer received');
      throw new Error('PDF service returned invalid data');
    }

    return {
      buffer: pdfBuffer,
      fileName: `HoSo_${id}.pdf`
    };
  }
}
