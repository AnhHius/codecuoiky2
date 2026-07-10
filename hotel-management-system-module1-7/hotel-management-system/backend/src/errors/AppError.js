/**
 * Custom Error Classes
 * -----------------------------------------------------
 * AppError là lớp cha cho mọi lỗi "có chủ đích" (operational errors) -
 * tức lỗi do nghiệp vụ/người dùng gây ra (validation sai, không tìm thấy resource...),
 * khác với lỗi lập trình (programming errors/bugs).
 *
 * Việc phân loại này giúp middleware xử lý lỗi (errorHandler) biết:
 * - Lỗi nào an toàn để trả message cụ thể cho client (isOperational = true)
 * - Lỗi nào nên ẩn chi tiết, chỉ log lại và trả message chung chung (isOperational = false)
 */

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/** Lỗi 400 - dữ liệu đầu vào không hợp lệ (thường dùng kèm Joi validation) */
class ValidationError extends AppError {
  constructor(message = 'Dữ liệu đầu vào không hợp lệ', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details; // Danh sách lỗi chi tiết từng field (từ Joi)
  }
}

/** Lỗi 401 - chưa xác thực hoặc token không hợp lệ */
class UnauthorizedError extends AppError {
  constructor(message = 'Bạn cần đăng nhập để thực hiện hành động này') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** Lỗi 403 - đã xác thực nhưng không đủ quyền (RBAC) */
class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện hành động này') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** Lỗi 404 - không tìm thấy resource */
class NotFoundError extends AppError {
  constructor(resource = 'Tài nguyên') {
    super(`${resource} không tồn tại`, 404, 'NOT_FOUND');
  }
}

/** Lỗi 409 - xung đột dữ liệu (trùng email, phòng đã được đặt trong khoảng thời gian đó...) */
class ConflictError extends AppError {
  constructor(message = 'Dữ liệu xung đột với bản ghi đã tồn tại') {
    super(message, 409, 'CONFLICT');
  }
}

/** Lỗi 429 - vượt quá giới hạn request (rate limit) */
class TooManyRequestsError extends AppError {
  constructor(message = 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

/** Lỗi 500 - lỗi hệ thống / database không xác định */
class InternalServerError extends AppError {
  constructor(message = 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau') {
    super(message, 500, 'INTERNAL_ERROR');
    this.isOperational = false;
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
};
