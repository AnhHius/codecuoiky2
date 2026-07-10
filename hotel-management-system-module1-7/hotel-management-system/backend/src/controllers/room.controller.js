/**
 * Room Controller
 */
const roomService = require('../services/room.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, buildPaginationMeta } = require('../utils/apiResponse');

const getAll = catchAsync(async (req, res) => {
  const { rooms, pagination } = await roomService.getAllRooms(req.query);
  return sendSuccess(res, {
    message: 'Lấy danh sách phòng thành công',
    data: rooms,
    meta: buildPaginationMeta(pagination),
  });
});

const getById = catchAsync(async (req, res) => {
  const room = await roomService.getRoomById(req.params.id);
  return sendSuccess(res, { message: 'Lấy thông tin phòng thành công', data: room });
});

const create = catchAsync(async (req, res) => {
  const room = await roomService.createRoom(req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Tạo phòng thành công', data: room });
});

const update = catchAsync(async (req, res) => {
  const room = await roomService.updateRoom(req.params.id, req.body);
  return sendSuccess(res, { message: 'Cập nhật phòng thành công', data: room });
});

const updateStatus = catchAsync(async (req, res) => {
  const room = await roomService.updateRoomStatus(req.params.id, req.body.status);
  return sendSuccess(res, { message: 'Cập nhật trạng thái phòng thành công', data: room });
});

const remove = catchAsync(async (req, res) => {
  await roomService.deleteRoom(req.params.id);
  return sendSuccess(res, { message: 'Xóa phòng thành công' });
});

const getAvailable = catchAsync(async (req, res) => {
  const { checkInDate, checkOutDate, roomTypeId } = req.query;
  const rooms = await roomService.getAvailableRooms({ checkInDate, checkOutDate, roomTypeId });
  return sendSuccess(res, { message: 'Lấy danh sách phòng trống thành công', data: rooms });
});

module.exports = { getAll, getById, create, update, updateStatus, remove, getAvailable };
