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
      cb(new Error('Only images are allowed'));
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
      return res.status(400).json({ error: 'Invalid file type. File magic bytes do not match expected image type.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};
