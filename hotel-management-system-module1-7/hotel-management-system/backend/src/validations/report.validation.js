/**
 * Joi validation schemas cho module Reports
 */
const Joi = require('joi');

const currentYear = new Date().getFullYear();

const dateRangeSchema = Joi.object({
  fromDate: Joi.date().iso().required().messages({
    'any.required': 'Ngày bắt đầu (fromDate) là bắt buộc',
    'date.format': 'fromDate phải theo định dạng YYYY-MM-DD',
  }),
  toDate: Joi.date()
    .iso()
    .min(Joi.ref('fromDate'))
    .required()
    .messages({
      'any.required': 'Ngày kết thúc (toDate) là bắt buộc',
      'date.min': 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu',
    }),
});

const monthlyReportSchema = Joi.object({
  year: Joi.number()
    .integer()
    .min(2020)
    .max(currentYear + 1)
    .default(currentYear)
    .messages({
      'number.min': 'Năm không hợp lệ (tối thiểu 2020)',
      'number.max': `Năm không được vượt quá ${currentYear + 1}`,
    }),
});

const topRoomsSchema = Joi.object({
  fromDate: Joi.date().iso().required(),
  toDate: Joi.date().iso().min(Joi.ref('fromDate')).required(),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const topGuestsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = {
  dateRangeSchema,
  monthlyReportSchema,
  topRoomsSchema,
  topGuestsSchema,
};
