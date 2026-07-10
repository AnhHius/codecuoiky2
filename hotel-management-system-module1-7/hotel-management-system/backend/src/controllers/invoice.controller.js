/**
 * Invoice Controller - /api/v1/invoices và /api/v1/bookings/:bookingId/invoice
 */
const invoiceService = require('../services/invoice.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');

const getByBookingId = catchAsync(async (req, res) => {
  const invoice = await invoiceService.getInvoiceByBookingId(req.params.bookingId);
  return sendSuccess(res, { message: 'Lấy hóa đơn thành công', data: invoice });
});

const getById = catchAsync(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id);
  return sendSuccess(res, { message: 'Lấy hóa đơn thành công', data: invoice });
});

const create = catchAsync(async (req, res) => {
  const invoice = await invoiceService.createInvoice(
    req.params.bookingId,
    req.user.id,
    req.body.notes
  );
  return sendSuccess(res, { statusCode: 201, message: 'Phát hành hóa đơn thành công', data: invoice });
});

const addPayment = catchAsync(async (req, res) => {
  await invoiceService.addPayment(req.params.id, req.body, req.user.id);
  const invoice = await invoiceService.getInvoiceById(req.params.id);
  return sendSuccess(res, { message: 'Ghi nhận thanh toán thành công', data: invoice });
});

module.exports = { getByBookingId, getById, create, addPayment };
