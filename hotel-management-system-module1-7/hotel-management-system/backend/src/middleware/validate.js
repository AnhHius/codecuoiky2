/**
 * Middleware factory cho validation bằng Joi.
 * Dùng chung cho mọi route: validate(schema, 'body' | 'query' | 'params')
 *
 * Cách dùng:
 *   router.post('/rooms', validate(createRoomSchema), roomController.create);
 */
const { ValidationError } = require('../errors/AppError');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Trả về tất cả lỗi, không dừng ở lỗi đầu tiên
      stripUnknown: true, // Loại bỏ field không định nghĩa trong schema
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return next(new ValidationError('Dữ liệu đầu vào không hợp lệ', details));
    }

    // Gán lại giá trị đã được validate/sanitize vào request
    req[property] = value;
    return next();
  };
}

module.exports = validate;
