/**
 * Chuẩn hóa format response trả về client, đảm bảo mọi API endpoint
 * đều trả cùng 1 cấu trúc, giúp frontend xử lý dễ dàng và nhất quán.
 */

/**
 * Trả về response thành công
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {number} options.statusCode - HTTP status code (default 200)
 * @param {string} options.message - Thông điệp mô tả
 * @param {*} options.data - Dữ liệu trả về
 * @param {Object} options.meta - Thông tin bổ sung (vd: pagination)
 */
function sendSuccess(res, { statusCode = 200, message = 'Thành công', data = null, meta = null } = {}) {
  const response = {
    success: true,
    message,
    data,
  };
  if (meta) response.meta = meta;

  return res.status(statusCode).json(response);
}

/**
 * Trả về response lỗi
 * @param {import('express').Response} res
 * @param {Object} options
 */
function sendError(res, { statusCode = 500, message = 'Đã xảy ra lỗi', errorCode = 'INTERNAL_ERROR', details = null } = {}) {
  const response = {
    success: false,
    message,
    errorCode,
  };
  if (details) response.details = details;

  return res.status(statusCode).json(response);
}

/**
 * Tạo object meta cho phân trang
 */
function buildPaginationMeta({ page, limit, total }) {
  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = { sendSuccess, sendError, buildPaginationMeta };
