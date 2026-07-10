/**
 * Joi validation schemas cho module Services & Invoice
 */
const Joi = require('joi');

const SERVICE_CATEGORIES = ['food_beverage', 'laundry', 'spa', 'transport', 'other'];
const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'];

// ─── Service (danh mục) ────────────────────────────────────────────────────
const createServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Tên dịch vụ không được để trống',
  }),
  description: Joi.string().trim().max(1000).allow(null, '').optional(),
  category: Joi.string()
    .valid(...SERVICE_CATEGORIES)
    .required()
    .messages({ 'any.required': 'Danh mục dịch vụ là bắt buộc' }),
  unitPrice: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Đơn giá phải lớn hơn 0',
    'any.required': 'Đơn giá là bắt buộc',
  }),
  unit: Joi.string().trim().max(50).default('lần'),
});

const updateServiceSchema = createServiceSchema.fork(
  ['name', 'category', 'unitPrice'],
  (s) => s.optional()
);

// ─── Thêm dịch vụ vào booking ─────────────────────────────────────────────
const addBookingServiceSchema = Joi.object({
  serviceId: Joi.number().integer().positive().required().messages({
    'any.required': 'Dịch vụ (serviceId) là bắt buộc',
  }),
  quantity: Joi.number().integer().min(1).max(999).default(1),
  notes: Joi.string().trim().max(500).allow(null, '').optional(),
  usedAt: Joi.date().iso().max('now').allow(null).optional().messages({
    'date.max': 'Thời điểm sử dụng không thể là tương lai',
  }),
});

const removeBookingServiceSchema = Joi.object({
  bookingServiceId: Joi.number().integer().positive().required(),
});

// ─── Invoice ───────────────────────────────────────────────────────────────
const createInvoiceSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required().messages({
    'any.required': 'Đặt phòng (bookingId) là bắt buộc',
  }),
  notes: Joi.string().trim().max(1000).allow(null, '').optional(),
});

// ─── Payment ───────────────────────────────────────────────────────────────
const addPaymentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Số tiền phải lớn hơn 0',
    'any.required': 'Số tiền thanh toán là bắt buộc',
  }),
  method: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required()
    .messages({ 'any.required': 'Hình thức thanh toán là bắt buộc' }),
  referenceNumber: Joi.string().trim().max(100).allow(null, '').optional(),
  notes: Joi.string().trim().max(500).allow(null, '').optional(),
});

const listServiceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  category: Joi.string().valid(...SERVICE_CATEGORIES).optional(),
  search: Joi.string().trim().max(100).optional(),
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
  addBookingServiceSchema,
  removeBookingServiceSchema,
  createInvoiceSchema,
  addPaymentSchema,
  listServiceQuerySchema,
  SERVICE_CATEGORIES,
  PAYMENT_METHODS,
};
