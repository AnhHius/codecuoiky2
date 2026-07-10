/**
 * Service Controller - /api/v1/services và /api/v1/bookings/:id/services
 */
const serviceCatalogService = require('../services/serviceCatalog.service');
const bookingServiceService = require('../services/bookingService.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, buildPaginationMeta } = require('../utils/apiResponse');

// ─── Danh mục dịch vụ ─────────────────────────────────────────────────────
const getAll = catchAsync(async (req, res) => {
  const { services, pagination } = await serviceCatalogService.getAllServices(req.query);
  return sendSuccess(res, {
    message: 'Lấy danh sách dịch vụ thành công',
    data: services,
    meta: buildPaginationMeta(pagination),
  });
});

const getById = catchAsync(async (req, res) => {
  const service = await serviceCatalogService.getServiceById(req.params.id);
  return sendSuccess(res, { message: 'Lấy thông tin dịch vụ thành công', data: service });
});

const create = catchAsync(async (req, res) => {
  const service = await serviceCatalogService.createService(req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Tạo dịch vụ thành công', data: service });
});

const update = catchAsync(async (req, res) => {
  const service = await serviceCatalogService.updateService(req.params.id, req.body);
  return sendSuccess(res, { message: 'Cập nhật dịch vụ thành công', data: service });
});

const remove = catchAsync(async (req, res) => {
  await serviceCatalogService.deleteService(req.params.id);
  return sendSuccess(res, { message: 'Vô hiệu hóa dịch vụ thành công' });
});

// ─── Dịch vụ trong booking ──────────────────────────────────────────────────
const getBookingServices = catchAsync(async (req, res) => {
  const services = await bookingServiceService.getBookingServices(req.params.bookingId);
  return sendSuccess(res, { message: 'Lấy danh sách dịch vụ đặt phòng thành công', data: services });
});

const addToBooking = catchAsync(async (req, res) => {
  const result = await bookingServiceService.addServiceToBooking(
    req.params.bookingId,
    req.body
  );
  return sendSuccess(res, { statusCode: 201, message: 'Thêm dịch vụ vào đặt phòng thành công', data: result });
});

const removeFromBooking = catchAsync(async (req, res) => {
  await bookingServiceService.removeServiceFromBooking(
    req.params.bookingId,
    req.params.bookingServiceId
  );
  return sendSuccess(res, { message: 'Xóa dịch vụ khỏi đặt phòng thành công' });
});

module.exports = { getAll, getById, create, update, remove, getBookingServices, addToBooking, removeFromBooking };
