/**
 * Invoice Routes - /api/v1/invoices
 * Route phát hành hóa đơn theo booking nằm ở:
 *   POST /api/v1/bookings/:bookingId/invoice
 *   GET  /api/v1/bookings/:bookingId/invoice
 */
const express = require('express');
const invoiceController = require('../controllers/invoice.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { addPaymentSchema } = require('../validations/service.validation');

const router = express.Router();
router.use(authenticate);

/**
 * @route   GET /api/v1/invoices/:id
 * @desc    Lấy chi tiết hóa đơn kèm danh sách thanh toán
 * @access  Private - invoice:read
 */
router.get('/:id', authorize('invoice:read'), invoiceController.getById);

/**
 * @route   POST /api/v1/invoices/:id/payments
 * @desc    Ghi nhận 1 lần thanh toán - tự động cập nhật trạng thái hóa đơn
 * @access  Private - payment:create
 */
router.post(
  '/:id/payments',
  authorize('payment:create'),
  validate(addPaymentSchema),
  invoiceController.addPayment
);

module.exports = router;
