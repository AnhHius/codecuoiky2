/**
 * Joi validation schemas cho module Room & Room Type
 */
const Joi = require('joi');

// ===== Room Type =====
const createRoomTypeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Tên loại phòng không được để trống',
  }),
  description: Joi.string().trim().max(2000).allow('', null),
  basePrice: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Giá phòng phải lớn hơn 0',
    'any.required': 'Giá phòng cơ bản là bắt buộc',
  }),
  maxOccupancy: Joi.number().integer().min(1).max(20).required().messages({
    'number.min': 'Số khách tối đa phải ít nhất là 1',
  }),
  numBeds: Joi.number().integer().min(1).max(10).default(1),
  areaSqm: Joi.number().positive().allow(null),
  amenities: Joi.array().items(Joi.string().trim().max(50)).default([]),
});

const updateRoomTypeSchema = createRoomTypeSchema.fork(
  ['name', 'basePrice', 'maxOccupancy'],
  (schema) => schema.optional()
);

// ===== Room =====
const ROOM_STATUSES = ['available', 'occupied', 'cleaning', 'maintenance', 'out_of_service'];

const createRoomSchema = Joi.object({
  roomNumber: Joi.string().trim().min(1).max(20).required().messages({
    'string.empty': 'Số phòng không được để trống',
  }),
  roomTypeId: Joi.number().integer().positive().required().messages({
    'any.required': 'Loại phòng (roomTypeId) là bắt buộc',
  }),
  floor: Joi.number().integer().min(0).max(200).allow(null),
  status: Joi.string()
    .valid(...ROOM_STATUSES)
    .default('available'),
  notes: Joi.string().trim().max(1000).allow('', null),
});

const updateRoomSchema = createRoomSchema.fork(['roomNumber', 'roomTypeId'], (schema) =>
  schema.optional()
);

const updateRoomStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...ROOM_STATUSES)
    .required(),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid(...ROOM_STATUSES)
    .optional(),
  roomTypeId: Joi.number().integer().positive().optional(),
  search: Joi.string().trim().max(100).optional(),
});

const availabilityQuerySchema = Joi.object({
  checkInDate: Joi.date().iso().required().messages({
    'any.required': 'Ngày check-in là bắt buộc',
    'date.format': 'Ngày check-in phải theo định dạng ISO (YYYY-MM-DD)',
  }),
  checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required().messages({
    'any.required': 'Ngày check-out là bắt buộc',
    'date.greater': 'Ngày check-out phải sau ngày check-in',
  }),
  roomTypeId: Joi.number().integer().positive().optional(),
});

module.exports = {
  createRoomTypeSchema,
  updateRoomTypeSchema,
  createRoomSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
  listQuerySchema,
  availabilityQuerySchema,
  ROOM_STATUSES,
};
