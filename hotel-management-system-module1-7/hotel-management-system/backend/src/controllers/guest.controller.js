/**
 * Guest Controller - xử lý request/response cho /api/v1/guests
 */
const guestService = require('../services/guest.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, buildPaginationMeta } = require('../utils/apiResponse');

const getAll = catchAsync(async (req, res) => {
  const { guests, pagination } = await guestService.getAllGuests(req.query);
  return sendSuccess(res, {
    message: 'Lấy danh sách khách hàng thành công',
    data: guests,
    meta: buildPaginationMeta(pagination),
  });
});

const getById = catchAsync(async (req, res) => {
  const guest = await guestService.getGuestById(req.params.id);
  return sendSuccess(res, { message: 'Lấy thông tin khách hàng thành công', data: guest });
});

const create = catchAsync(async (req, res) => {
  const guest = await guestService.createGuest(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Tạo hồ sơ khách hàng thành công',
    data: guest,
  });
});

const update = catchAsync(async (req, res) => {
  const guest = await guestService.updateGuest(req.params.id, req.body);
  return sendSuccess(res, { message: 'Cập nhật thông tin khách hàng thành công', data: guest });
});

const getStayHistory = catchAsync(async (req, res) => {
  const { guest, history, pagination } = await guestService.getGuestStayHistory(
    req.params.id,
    req.query
  );
  return sendSuccess(res, {
    message: 'Lấy lịch sử lưu trú thành công',
    data: { guest, history },
    meta: buildPaginationMeta(pagination),
  });
});

module.exports = { getAll, getById, create, update, getStayHistory };
