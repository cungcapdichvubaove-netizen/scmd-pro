import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/index.js';
import { metrics } from '../metrics.js';

function canExposeUnhandledErrorMessage() {
  const appUrl = process.env.APP_URL || '';
  const appEnv = (process.env.APP_ENV || process.env.VITE_APP_ENV || '').toLowerCase();
  return process.env.NODE_ENV !== 'production' ||
    appEnv === 'local' ||
    appEnv === 'development' ||
    appUrl.startsWith('http://localhost') ||
    appUrl.startsWith('http://127.0.0.1');
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.code || err.name || 'UNKNOWN_ERROR';
  let isSafeClientMessage = false;

  if (err.isDomainError) {
    status = err.status;
    message = err.message;
    errorCode = err.name;
    isSafeClientMessage = true;
    logger.warn({ path: req.path, error: err.message, status }, 'Domain Error');
  } else {
    logger.error({ err, path: req.path }, 'Unhandled Exception Caught in Gateway');
  }

  if (err.name === 'ZodError') {
    logger.warn({ path: req.path, errors: err.issues || err.errors }, 'Request validation failed (Gateway handler)');
    return res.status(400).json({
      error: {
        message: 'Dữ liệu không hợp lệ',
        details: err.issues?.map((e: any) => ({ path: e.path, message: e.message })) || err.errors,
        code: 'VALIDATION_ERROR'
      }
    });
  }

  // Record Error Rate Metric
  metrics.record('api_errors', 1, { path: req.path, status: status.toString() });

  // Handle Quota Exceeded specifically
  if (err.message === 'QUOTA_EXCEEDED: STAFF_LIMIT') {
    return res.status(403).json({
      error: {
        message: 'Bạn đã đạt giới hạn tối đa 2 nhân sự cho gói SCMD FREE. Vui lòng nâng cấp lên gói SCMD PRO để thêm không giới hạn.',
        code: 'QUOTA_EXCEEDED_STAFF',
        traceId: res.getHeader('x-trace-id') || req.headers['x-trace-id']
      }
    });
  }

  // FIX C-04: Mapping Prisma errors to user-friendly messages
  // Ngăn chặn rò rỉ cấu trúc cơ sở dữ liệu qua error message
  if (err.name === 'PrismaClientKnownRequestError') {
    isSafeClientMessage = true;
    switch (err.code) {
      case 'P2002':
        message = 'Dữ liệu đã tồn tại trong hệ thống (Duplicate entry).';
        errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
        break;
      case 'P2025':
        message = 'Không tìm thấy dữ liệu yêu cầu hoặc dữ liệu đã bị xóa.';
        errorCode = 'RECORD_NOT_FOUND';
        break;
      case 'P2003':
        message = 'Ràng buộc quan hệ dữ liệu không hợp lệ (Foreign key constraint).';
        errorCode = 'FOREIGN_KEY_VIOLATION';
        break;
      default:
        message = 'Lỗi xử lý cơ sở dữ liệu nội bộ.';
        errorCode = `DB_ERROR_${err.code}`;
        break;
    }
  }
  
  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({
    error: {
      message: status >= 500 && !isSafeClientMessage && !canExposeUnhandledErrorMessage()
        ? 'Internal Server Error'
        : message,
      code: errorCode,
      traceId: res.getHeader('x-trace-id') || req.headers['x-trace-id'] // Include trace ID in error response
    }
  });
}
