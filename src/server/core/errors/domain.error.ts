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
