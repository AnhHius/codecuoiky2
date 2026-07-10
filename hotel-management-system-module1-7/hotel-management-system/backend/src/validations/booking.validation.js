/**
 * Joi validation schemas cho module Booking Core
 */
const Joi = require('joi');

const createBookingSchema = Joi.object({
  guestId: Joi.number().integer().positive().required().messages({
    'any.required': 'Khách hàng (guestId) là bắt buộc',
  }),
  roomIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .unique()
    .required()
    .messages({
      'array.min': 'Phải chọn ít nhất 1 phòng',
      'array.unique': 'Danh sách phòng không được trùng',
    }),
  checkInDate: Joi.date().iso().min('now').required().messages({
    'date.min': 'Ngày check-in không thể là ngày trong quá khứ',
    'any.required': 'Ngày check-in là bắt buộc',
  }),
  checkOutDate: Joi.date()
    .iso()
    .greater(Joi.ref('checkInDate'))
    .required()
    .messages({
      'date.greater': 'Ngày check-out phải sau ngày check-in',
      'any.required': 'Ngày check-out là bắt buộc',
    }),
  numGuests: Joi.number().integer().min(1).max(20).default(1),
  specialRequests: Joi.string().trim().max(1000).allow(null, '').optional(),
  discountAmount: Joi.number().min(0).precision(2).default(0),
});

const updateBookingSchema = Joi.object({
  specialRequests: Joi.string().trim().max(1000).allow(null, '').optional(),
  numGuests: Joi.number().integer().min(1).max(20).optional(),
  discountAmount: Joi.number().min(0).precision(2).optional(),
});

const cancelBookingSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required().messages({
    'string.empty': 'Lý do huỷ là bắt buộc',
    'string.min': 'Lý do huỷ phải có ít nhất 5 ký tự',
  }),
});

const checkInSchema = Joi.object({
  numGuests: Joi.number().integer().min(1).max(20).optional(),
});

const listBookingQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')
    .optional(),
  guestId: Joi.number().integer().positive().optional(),
  checkInDate: Joi.date().iso().optional(),
  checkOutDate: Joi.date().iso().optional(),
  search: Joi.string().trim().max(50).optional(), // Tìm theo booking_code
});

module.exports = {
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  checkInSchema,
  listBookingQuerySchema,
};
