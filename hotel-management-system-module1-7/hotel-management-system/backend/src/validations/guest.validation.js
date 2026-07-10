/**
 * Joi validation schemas cho module Guest Management
 */
const Joi = require('joi');

const GENDERS = ['male', 'female', 'other'];
const ID_TYPES = ['cccd', 'passport', 'other'];

const createGuestSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Họ tên không được để trống',
    'string.min': 'Họ tên phải có ít nhất 2 ký tự',
  }),
  email: Joi.string().trim().email().lowercase().allow(null, '').optional().messages({
    'string.email': 'Email không hợp lệ',
  }),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{8,20}$/)
    .required()
    .messages({
      'string.empty': 'Số điện thoại không được để trống',
      'string.pattern.base': 'Số điện thoại không hợp lệ',
    }),
  gender: Joi.string().valid(...GENDERS).allow(null).optional(),
  dateOfBirth: Joi.date()
    .iso()
    .max('now')
    .allow(null)
    .optional()
    .messages({ 'date.max': 'Ngày sinh không thể là ngày trong tương lai' }),
  nationality: Joi.string().trim().max(100).allow(null, '').optional(),
  idType: Joi.string().valid(...ID_TYPES).allow(null).optional(),
  idNumber: Joi.string().trim().max(50).allow(null, '').optional(),
  address: Joi.string().trim().max(500).allow(null, '').optional(),
  notes: Joi.string().trim().max(1000).allow(null, '').optional(),
}).with('idNumber', 'idType'); // Nếu có idNumber thì bắt buộc phải có idType

const updateGuestSchema = createGuestSchema.fork(['fullName', 'phone'], (schema) =>
  schema.optional()
);

const listGuestQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  // Tìm kiếm đồng thời theo tên, phone, email (khớp một phần)
  search: Joi.string().trim().max(100).optional(),
  nationality: Joi.string().trim().max(100).optional(),
});

module.exports = {
  createGuestSchema,
  updateGuestSchema,
  listGuestQuerySchema,
  GENDERS,
  ID_TYPES,
};
