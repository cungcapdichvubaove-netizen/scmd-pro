export abstract class DomainError extends Error {
  abstract readonly status: number;
  readonly isDomainError = true;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  readonly status = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends DomainError {
  readonly status = 403;
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends DomainError {
  readonly status = 400;
  constructor(message: string = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends DomainError {
  readonly status = 401;
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends DomainError {
  readonly status = 409;
  constructor(message: string = 'Conflict occurred') {
    super(message);
    this.name = 'ConflictError';
  }
}

// FIX [BUG-503]: status 503 → 500.
// HTTP 503 = "Service Unavailable" — dành cho trường hợp upstream/infra thật sự down.
// HTTP 500 = "Internal Server Error" — đúng semantic cho lỗi code phía server.
// Dùng sai 503 khiến:
//   1. Client tự động retry liên tục (503 = "thử lại sau") → bão hòa request
//   2. Nginx/load balancer có thể circuit-break toàn bộ traffic từ upstream
//   3. Monitoring hiểu nhầm là infra down thay vì lỗi code
export class InternalServerError extends DomainError {
  readonly status = 500;
  constructor(message: string = 'Hệ thống đang gặp sự cố, vui lòng thử lại sau.') {
    super(message);
    this.name = 'InternalServerError';
  }
}

// Dùng khi dependency thật sự không reach được:
//   - DB connection pool exhausted / timeout không recover
//   - Redis down hoàn toàn
//   - External API (reCAPTCHA, SMS gateway) timeout liên tục
// Client nhận 503 nên: hiển thị thông báo "thử lại sau", backoff trước khi retry.
// KHÔNG dùng cho lỗi code nội bộ — dùng InternalServerError cho những trường hợp đó.
export class ServiceUnavailableError extends DomainError {
  readonly status = 503;
  constructor(message: string = 'Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau.') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}
