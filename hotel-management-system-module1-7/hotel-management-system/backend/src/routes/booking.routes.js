/**
 * Booking Routes - /api/v1/bookings
 */
const express = require('express');
const bookingController = require('../controllers/booking.controller');
const serviceController = require('../controllers/service.controller');
const invoiceController = require('../controllers/invoice.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  checkInSchema,
  listBookingQuerySchema,
} = require('../validations/booking.validation');
const {
  addBookingServiceSchema,
} = require('../validations/service.validation');

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/v1/bookings/dashboard
 * @desc    Thống kê nhanh: booking theo status, check-in/out hôm nay
 * @access  Private - booking:read
 */
router.get('/dashboard', authorize('booking:read'), bookingController.getDashboardStats);

/**
 * @route   GET /api/v1/bookings
 * @desc    Danh sách booking - filter: status, guestId, ngày, mã booking
 * @access  Private - booking:read
 */
router.get('/', authorize('booking:read'), validate(listBookingQuerySchema, 'query'), bookingController.getAll);

/**
 * @route   GET /api/v1/bookings/:id
 * @access  Private - booking:read
 */
router.get('/:id', authorize('booking:read'), bookingController.getById);

/**
 * @route   POST /api/v1/bookings
 * @desc    Tạo đặt phòng - chống double-booking bằng transaction + row-level lock
 * @access  Private - booking:create
 */
router.post('/', authorize('booking:create'), validate(createBookingSchema), bookingController.create);

/**
 * @route   PATCH /api/v1/bookings/:id
 * @desc    Cập nhật thông tin booking (special requests, số khách, giảm giá)
 * @access  Private - booking:update
 */
router.patch('/:id', authorize('booking:update'), validate(updateBookingSchema), bookingController.update);

/**
 * @route   POST /api/v1/bookings/:id/check-in
 * @desc    Check-in: status → checked_in, phòng → occupied
 * @access  Private - booking:checkin
 */
router.post('/:id/check-in', authorize('booking:checkin'), validate(checkInSchema), bookingController.checkIn);

/**
 * @route   POST /api/v1/bookings/:id/check-out
 * @desc    Check-out: status → checked_out, phòng → cleaning, tăng total_stays
 * @access  Private - booking:checkout
 */
router.post('/:id/check-out', authorize('booking:checkout'), bookingController.checkOut);

/**
 * @route   POST /api/v1/bookings/:id/cancel
 * @desc    Huỷ booking - chỉ khi pending/confirmed
 * @access  Private - booking:cancel
 */
router.post('/:id/cancel', authorize('booking:cancel'), validate(cancelBookingSchema), bookingController.cancel);

/**
 * @route   POST /api/v1/bookings/:id/no-show
 * @desc    Đánh dấu khách không đến
 * @access  Private - booking:update
 */
router.post('/:id/no-show', authorize('booking:update'), bookingController.markNoShow);

// ─── Sub-routes: dịch vụ trong booking ──────────────────────────────────────

/**
 * @route   GET  /api/v1/bookings/:bookingId/services
 * @route   POST /api/v1/bookings/:bookingId/services
 * @access  Private
 */
router.get('/:bookingId/services', authorize('booking:read'), serviceController.getBookingServices);
router.post('/:bookingId/services', authorize('booking:update'), validate(addBookingServiceSchema), serviceController.addToBooking);

/**
 * @route   DELETE /api/v1/bookings/:bookingId/services/:bookingServiceId
 * @access  Private - booking:update
 */
router.delete('/:bookingId/services/:bookingServiceId', authorize('booking:update'), serviceController.removeFromBooking);

// ─── Sub-routes: hóa đơn theo booking ───────────────────────────────────────

/**
 * @route   GET  /api/v1/bookings/:bookingId/invoice
 * @route   POST /api/v1/bookings/:bookingId/invoice
 * @access  Private
 */
router.get('/:bookingId/invoice', authorize('invoice:read'), invoiceController.getByBookingId);
router.post('/:bookingId/invoice', authorize('invoice:create'), invoiceController.create);

module.exports = router;
