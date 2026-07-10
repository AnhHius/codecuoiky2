/**
 * RoomType Controller
 */
const roomTypeService = require('../services/roomType.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');

const getAll = catchAsync(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const roomTypes = await roomTypeService.getAllRoomTypes(includeInactive);
  return sendSuccess(res, { message: 'Lấy danh sách loại phòng thành công', data: roomTypes });
});

const getById = catchAsync(async (req, res) => {
  const roomType = await roomTypeService.getRoomTypeById(req.params.id);
  return sendSuccess(res, { message: 'Lấy thông tin loại phòng thành công', data: roomType });
});

const create = catchAsync(async (req, res) => {
  const roomType = await roomTypeService.createRoomType(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Tạo loại phòng thành công',
    data: roomType,
  });
});

const update = catchAsync(async (req, res) => {
  const roomType = await roomTypeService.updateRoomType(req.params.id, req.body);
  return sendSuccess(res, { message: 'Cập nhật loại phòng thành công', data: roomType });
});

const remove = catchAsync(async (req, res) => {
  await roomTypeService.deleteRoomType(req.params.id);
  return sendSuccess(res, { message: 'Xóa loại phòng thành công' });
});

module.exports = { getAll, getById, create, update, remove };
