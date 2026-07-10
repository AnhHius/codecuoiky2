/**
 * Booking Controller - xử lý request/response cho /api/v1/bookings
 */
const bookingService = require('../services/booking.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, buildPaginationMeta } = require('../utils/apiResponse');

const getAll = catchAsync(async (req, res) => {
  const { bookings, pagination } = await bookingService.getAllBookings(req.query);
  return sendSuccess(res, {
    message: 'Lấy danh sách đặt phòng thành công',
    data: bookings,
    meta: buildPaginationMeta(pagination),
  });
});

const getById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id);
  return sendSuccess(res, { message: 'Lấy thông tin đặt phòng thành công', data: booking });
});

const create = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user.id);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Tạo đặt phòng thành công',
    data: booking,
  });
});

const update = catchAsync(async (req, res) => {
  const booking = await bookingService.updateBooking(req.params.id, req.body);
  return sendSuccess(res, { message: 'Cập nhật đặt phòng thành công', data: booking });
});

const checkIn = catchAsync(async (req, res) => {
  const booking = await bookingService.checkIn(req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Check-in thành công', data: booking });
});

const checkOut = catchAsync(async (req, res) => {
  const booking = await bookingService.checkOut(req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Check-out thành công', data: booking });
});

const cancel = catchAsync(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.body,
    req.user.id,
    req.user.permissions
  );
  return sendSuccess(res, { message: 'Huỷ đặt phòng thành công', data: booking });
});

const markNoShow = catchAsync(async (req, res) => {
  const booking = await bookingService.markNoShow(req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Đã đánh dấu no-show', data: booking });
});

const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await bookingService.getDashboardStats();
  return sendSuccess(res, { message: 'Lấy thống kê thành công', data: stats });
});

module.exports = { getAll, getById, create, update, checkIn, checkOut, cancel, markNoShow, getDashboardStats };
