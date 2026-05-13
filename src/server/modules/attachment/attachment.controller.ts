import { Request, Response } from 'express';
import { AttachmentRepository } from './attachment.repository.js';
import { CreateAttachmentSchema, UpdateAttachmentSchema, AttachmentFilterSchema } from './attachment.schema.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { logger } from '../../core/logger/index.js';

export class AttachmentController {
  static async upload(req: Request, res: Response) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      
      // Nếu có file từ multer, tự động điền metadata cơ bản
      let payload = req.body;
      if (req.file) {
        let url = '';
        try {
          const { MediaService } = await import('../../core/media/media.service.js');
          const uploadResult = await MediaService.uploadImage(req.file.buffer, {
            tenantId: ctx.tenantId,
            guardId: ctx.userId,
            type: req.body.category || 'ATTACHMENT'
          });
          url = uploadResult.url;
        } catch (mediaErr) {
          logger.warn('Storage provider not configured, falling back to Base64 data URI');
          url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
        
        payload = {
          ...payload,
          name: payload.name || req.file.originalname,
          url,
          fileType: req.file.mimetype,
          size: req.file.size,
        };
      }

      const validatedInput = CreateAttachmentSchema.parse(payload);
      const attachment = await AttachmentRepository.create(ctx, validatedInput);
      
      return res.status(201).json(attachment);
    } catch (err: any) {
      logger.error({ err }, 'Attachment upload failed');
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
      }
      return res.status(500).json({ error: 'Lỗi server khi tải tệp' });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const filters = AttachmentFilterSchema.parse(req.query);
      
      const result = await AttachmentRepository.list(ctx, filters);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Attachment list failed');
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Filter không hợp lệ', details: err.errors });
      }
      return res.status(500).json({ error: 'Lỗi server khi lấy danh sách tệp' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { id } = req.params;
      const validatedInput = UpdateAttachmentSchema.parse(req.body);
      
      const existing = await AttachmentRepository.getById(ctx, id as string);
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy tệp đính kèm' });
      }

      if (existing.uploadedBy !== ctx.userId && !['tenant-admin', 'supervisor', 'super-admin'].includes(ctx.role)) {
        return res.status(403).json({ error: 'Bạn không có quyền thao tác với tệp này' });
      }

      const attachment = await AttachmentRepository.update(ctx, id as string, validatedInput);
      return res.json(attachment);
    } catch (err: any) {
      logger.error({ err, id: req.params.id }, 'Attachment update failed');
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
      }
      return res.status(500).json({ error: 'Lỗi server khi cập nhật tệp' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { id } = req.params;
      
      const existing = await AttachmentRepository.getById(ctx, id as string);
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy tệp đính kèm' });
      }

      if (existing.uploadedBy !== ctx.userId && !['tenant-admin', 'supervisor', 'super-admin'].includes(ctx.role)) {
        return res.status(403).json({ error: 'Bạn không có quyền thao tác với tệp này' });
      }

      await AttachmentRepository.delete(ctx, id as string);
      return res.status(204).send();
    } catch (err: any) {
      logger.error({ err, id: req.params.id }, 'Attachment delete failed');
      return res.status(500).json({ error: 'Lỗi server khi xóa tệp' });
    }
  }
}
