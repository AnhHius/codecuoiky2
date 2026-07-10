/**
 * Unit test cho src/errors/AppError.js
 */
const {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
} = require('../../src/errors/AppError');

describe('Custom Error Classes', () => {
  it('AppError nên có đúng statusCode, errorCode và isOperational mặc định', () => {
    const error = new AppError('Lỗi tổng quát', 400, 'TEST_ERROR');
    expect(error.message).toBe('Lỗi tổng quát');
    expect(error.statusCode).toBe(400);
    expect(error.errorCode).toBe('TEST_ERROR');
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('ValidationError nên có statusCode 400 và lưu được details', () => {
    const details = [{ field: 'email', message: 'Email không hợp lệ' }];
    const error = new ValidationError('Lỗi validation', details);
    expect(error.statusCode).toBe(400);
    expect(error.errorCode).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual(details);
  });

  it('UnauthorizedError nên có statusCode 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.errorCode).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError nên có statusCode 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
  });

  it('NotFoundError nên ghép đúng message theo tên resource', () => {
    const error = new NotFoundError('Phòng');
    expect(error.message).toBe('Phòng không tồn tại');
    expect(error.statusCode).toBe(404);
  });

  it('ConflictError nên có statusCode 409', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
  });

  it('TooManyRequestsError nên có statusCode 429', () => {
    const error = new TooManyRequestsError();
    expect(error.statusCode).toBe(429);
  });

  it('InternalServerError nên có isOperational = false', () => {
    const error = new InternalServerError();
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });
});
