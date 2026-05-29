import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';

// Use memory storage for optimization before upload to cloud
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên tệp hình ảnh'));
    }
  }
});

export const validateMagicBytes = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  try {
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !detected.mime.startsWith('image/')) {
      return res.status(400).json({ error: 'Loại tệp không hợp lệ. Nội dung tệp không khớp với định dạng hình ảnh được phép.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};
