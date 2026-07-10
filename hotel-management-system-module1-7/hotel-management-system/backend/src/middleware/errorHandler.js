/**
 * Middleware xử lý lỗi tập trung (Global Error Handler).
 * Đây là middleware cuối cùng trong chain, bắt mọi lỗi được next(err) từ
 * các route/controller khác, hoặc lỗi tự động catch bởi catchAsync.
 */
const logger = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');
const { AppError } = require('../errors/AppError');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Chuyển đổi một số lỗi phổ biến không phải AppError thành AppError chuẩn
  if (!(error instanceof AppError)) {
    // Lỗi vi phạm constraint của PostgreSQL (vd: UNIQUE, FOREIGN KEY)
    if (error.code === '23505') {
      error = new AppError('Dữ liệu đã tồn tại, vui lòng kiểm tra lại', 409, 'DUPLICATE_ENTRY');
    } else if (error.code === '23503') {
      error = new AppError('Dữ liệu tham chiếu không tồn tại', 400, 'FOREIGN_KEY_VIOLATION');
    } else if (error.name === 'JsonWebTokenError') {
      error = new AppError('Token không hợp lệ', 401, 'INVALID_TOKEN');
    } else if (error.name === 'TokenExpiredError') {
      error = new AppError('Token đã hết hạn', 401, 'TOKEN_EXPIRED');
    } else {
      // Lỗi không xác định -> coi như lỗi hệ thống, không lộ chi tiết cho client
      error = new AppError(
        env.isProduction ? 'Đã xảy ra lỗi hệ thống' : err.message,
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  // Log đầy đủ chi tiết lỗi (kể cả lỗi operational) để theo dõi
  const logPayload = {
    statusCode: error.statusCode,
    errorCode: error.errorCode,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id || null,
    stack: err.stack,
  };

  if (error.statusCode >= 500) {
    logger.error(error.message, logPayload);
  } else {
    logger.warn(error.message, logPayload);
  }

  return sendError(res, {
    statusCode: error.statusCode,
    message: error.message,
    errorCode: error.errorCode,
    details: error.details || null,
  });
}

/**
 * Middleware bắt các route không tồn tại (404) - đặt trước errorHandler
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(`Không tìm thấy route: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
  next(error);
}

module.exports = { errorHandler, notFoundHandler };
