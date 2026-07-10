/**
 * BookingService Service - business logic gắn dịch vụ vào booking.
 *
 * Mỗi khi thêm/xóa dịch vụ → tự động tính lại service_amount và total_amount
 * trên booking (và invoice nếu đã phát hành) để luôn đảm bảo tính nhất quán.
 */
const db = require('../config/database');
const serviceModel = require('../models/service.model');
const bookingModel = require('../models/booking.model');
const invoiceModel = require('../models/invoice.model');
const { NotFoundError, ValidationError } = require('../errors/AppError');
const logger = require('../utils/logger');

/**
 * Tính lại service_amount và total_amount trên booking sau khi dịch vụ thay đổi.
 * Gọi trong transaction để đảm bảo nhất quán giữa booking và invoice.
 */
async function recalcBookingAmounts(bookingId, trx) {
  const serviceAmount = await serviceModel.sumServiceAmount(bookingId, trx);

  // Lấy booking hiện tại để tính lại total
  const booking = await trx('bookings').where({ id: bookingId }).first(
    'room_amount', 'discount_amount'
  );

  const totalAmount = parseFloat(
    Math.max(0, booking.room_amount + serviceAmount - booking.discount_amount).toFixed(2)
  );

  await trx('bookings').where({ id: bookingId }).update({
    service_amount: serviceAmount,
    total_amount: totalAmount,
    updated_at: db.fn.now(),
  });

  // Nếu đã có hóa đơn → cập nhật lại các khoản tiền trên invoice luôn
  const invoice = await trx('invoices').where({ booking_id: bookingId }).first();
  if (invoice) {
    await trx('invoices').where({ id: invoice.id }).update({
      service_amount: serviceAmount,
      total_amount: totalAmount,
      updated_at: db.fn.now(),
    });
  }

  return { serviceAmount, totalAmount };
}

async function getBookingServices(bookingId) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');
  return serviceModel.findBookingServices(bookingId);
}

async function addServiceToBooking(bookingId, { serviceId, quantity, notes, usedAt }) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  // Chỉ cho phép thêm dịch vụ khi booking đang hoạt động
  if (['checked_out', 'cancelled', 'no_show'].includes(booking.status)) {
    throw new ValidationError(
      'Không thể thêm dịch vụ cho booking đã hoàn thành, đã huỷ hoặc no-show'
    );
  }

  const service = await serviceModel.findById(serviceId);
  if (!service || !service.is_active) throw new NotFoundError('Dịch vụ');

  const qty = quantity || 1;
  const subtotal = parseFloat((service.unit_price * qty).toFixed(2));

  return db.transaction(async (trx) => {
    const bookingService = await serviceModel.addBookingService(
      {
        booking_id: bookingId,
        service_id: serviceId,
        unit_price: service.unit_price, // Snapshot giá
        quantity: qty,
        subtotal,
        notes: notes || null,
        used_at: usedAt || new Date(),
      },
      trx
    );

    const { serviceAmount, totalAmount } = await recalcBookingAmounts(bookingId, trx);

    logger.info('Thêm dịch vụ vào booking', {
      bookingId,
      serviceId,
      serviceName: service.name,
      subtotal,
      newServiceAmount: serviceAmount,
      newTotalAmount: totalAmount,
    });

    return bookingService;
  });
}

async function removeServiceFromBooking(bookingId, bookingServiceId) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  if (['checked_out', 'cancelled', 'no_show'].includes(booking.status)) {
    throw new ValidationError('Không thể xóa dịch vụ cho booking đã kết thúc');
  }

  const bookingService = await serviceModel.findBookingServiceById(bookingServiceId);
  if (!bookingService || bookingService.booking_id !== parseInt(bookingId, 10)) {
    throw new NotFoundError('Dịch vụ trong đặt phòng');
  }

  return db.transaction(async (trx) => {
    await serviceModel.removeBookingService(bookingServiceId, trx);
    const { serviceAmount, totalAmount } = await recalcBookingAmounts(bookingId, trx);

    logger.info('Xóa dịch vụ khỏi booking', {
      bookingId,
      bookingServiceId,
      newServiceAmount: serviceAmount,
      newTotalAmount: totalAmount,
    });
  });
}

module.exports = {
  getBookingServices,
  addServiceToBooking,
  removeServiceFromBooking,
};
