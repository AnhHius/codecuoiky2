/**
 * Joi validation schemas cho module Authentication
 */
const Joi = require('joi');

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;
const passwordMessage =
  'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số';

const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Họ tên không được để trống',
    'string.min': 'Họ tên phải có ít nhất 2 ký tự',
  }),
  email: Joi.string().trim().email().lowercase().required().messages({
    'string.email': 'Email không hợp lệ',
  }),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base': passwordMessage,
  }),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{8,20}$/)
    .allow(null, '')
    .messages({ 'string.pattern.base': 'Số điện thoại không hợp lệ' }),
  roleId: Joi.number().integer().positive().required().messages({
    'any.required': 'Vai trò (roleId) là bắt buộc',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().required(),
});

// refreshToken có thể đến từ httpOnly cookie thay vì body, nên không bắt buộc ở đây;
// việc kiểm tra "có token hay không" được xử lý ở controller sau khi gộp cookie + body.
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base': passwordMessage,
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
};
