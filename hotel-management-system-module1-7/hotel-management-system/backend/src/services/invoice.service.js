/**
 * Invoice Service - business logic phát hành hóa đơn và ghi nhận thanh toán.
 *
 * Luồng nghiệp vụ:
 *   1. Lễ tân/kế toán gọi createInvoice sau khi khách check-out (hoặc trước)
 *   2. Ghi nhận từng lần thanh toán qua addPayment (tiền mặt / chuyển khoản / thẻ)
 *   3. Hóa đơn tự động chuyển trạng thái: unpaid → partially_paid → paid
 */
const db = require('../config/database');
const invoiceModel = require('../models/invoice.model');
const bookingModel = require('../models/booking.model');
const { NotFoundError, ConflictError, ValidationError } = require('../errors/AppError');
const logger = require('../utils/logger');

async function getInvoiceByBookingId(bookingId) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  const invoice = await invoiceModel.findByBookingId(bookingId);
  if (!invoice) throw new NotFoundError('Hóa đơn');

  return invoiceModel.findById(invoice.id);
}

async function getInvoiceById(id) {
  const invoice = await invoiceModel.findById(id);
  if (!invoice) throw new NotFoundError('Hóa đơn');
  return invoice;
}

/**
 * Phát hành hóa đơn cho booking.
 * - Booking phải đang hoạt động (không phải cancelled/no_show)
 * - Mỗi booking chỉ có 1 hóa đơn - throw ConflictError nếu đã tồn tại
 */
async function createInvoice(bookingId, issuedBy, notes = null) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  if (['cancelled', 'no_show'].includes(booking.status)) {
    throw new ValidationError('Không thể phát hành hóa đơn cho booking đã huỷ hoặc no-show');
  }

  const existing = await invoiceModel.findByBookingId(bookingId);
  if (existing) {
    throw new ConflictError('Hóa đơn cho đặt phòng này đã được phát hành');
  }

  // Sinh số hóa đơn duy nhất (thử lại tối đa 5 lần nếu trùng)
  let invoiceNumber;
  for (let i = 0; i < 5; i += 1) {
    const candidate = invoiceModel.generateInvoiceNumber();
    // eslint-disable-next-line no-await-in-loop
    const dup = await db('invoices').where({ invoice_number: candidate }).first('id');
    if (!dup) { invoiceNumber = candidate; break; }
  }

  const invoice = await invoiceModel.create({
    invoice_number: invoiceNumber,
    booking_id: bookingId,
    issued_by: issuedBy,
    room_amount: booking.room_amount,
    service_amount: booking.service_amount,
    discount_amount: booking.discount_amount,
    total_amount: booking.total_amount,
    paid_amount: 0,
    status: 'unpaid',
    notes,
  });

  logger.info('Phát hành hóa đơn', {
    invoiceId: invoice.id,
    invoiceNumber,
    bookingId,
    totalAmount: invoice.total_amount,
  });

  return invoiceModel.findById(invoice.id);
}

/**
 * Ghi nhận 1 lần thanh toán.
 * - Không cho phép thanh toán vượt quá số tiền còn lại
 * - Tự động cập nhật paid_amount và trạng thái hóa đơn sau khi ghi nhận
 */
async function addPayment(invoiceId, { amount, method, referenceNumber, notes }, receivedBy) {
  const invoice = await invoiceModel.findById(invoiceId);
  if (!invoice) throw new NotFoundError('Hóa đơn');

  if (invoice.status === 'paid') {
    throw new ValidationError('Hóa đơn này đã được thanh toán đầy đủ');
  }

  const remaining = parseFloat((invoice.total_amount - invoice.paid_amount).toFixed(2));
  if (amount > remaining + 0.01) {
    // Cho phép sai số làm tròn nhỏ (0.01đ)
    throw new ValidationError(
      `Số tiền thanh toán (${amount.toLocaleString('vi-VN')}đ) vượt quá số tiền còn lại (${remaining.toLocaleString('vi-VN')}đ)`
    );
  }

  return db.transaction(async (trx) => {
    await invoiceModel.addPayment(
      {
        invoice_id: invoiceId,
        received_by: receivedBy,
        amount,
        method,
        reference_number: referenceNumber || null,
        notes: notes || null,
      },
      trx
    );

    // Tính lại tổng đã thanh toán và cập nhật trạng thái hóa đơn
    const newPaidAmount = await invoiceModel.sumPaidAmount(invoiceId, trx);
    const newStatus = determineInvoiceStatus(newPaidAmount, invoice.total_amount);

    await invoiceModel.update(invoiceId, { paid_amount: newPaidAmount, status: newStatus }, trx);

    logger.info('Ghi nhận thanh toán', {
      invoiceId,
      amount,
      method,
      newPaidAmount,
      newStatus,
    });
  });
}

/**
 * Xác định trạng thái hóa đơn dựa trên tỷ lệ đã thanh toán
 */
function determineInvoiceStatus(paidAmount, totalAmount) {
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount >= totalAmount - 0.01) return 'paid'; // Cho phép sai số làm tròn
  return 'partially_paid';
}

module.exports = {
  getInvoiceByBookingId,
  getInvoiceById,
  createInvoice,
  addPayment,
};
