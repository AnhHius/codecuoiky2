/**
 * Room Service - business logic cho quản lý phòng vật lý
 */
const roomModel = require('../models/room.model');
const roomTypeModel = require('../models/roomType.model');
const { ConflictError, NotFoundError, ValidationError } = require('../errors/AppError');
const logger = require('../utils/logger');

async function getAllRooms(query) {
  const { page, limit, status, roomTypeId, search } = query;
  const { data, total } = await roomModel.findAllPaginated({
    page,
    limit,
    status,
    roomTypeId,
    search,
  });
  return { rooms: data, pagination: { page, limit, total } };
}

async function getRoomById(id) {
  const room = await roomModel.findById(id);
  if (!room) throw new NotFoundError('Phòng');
  return room;
}

async function createRoom(payload) {
  // Đảm bảo room_type_id tham chiếu tới loại phòng tồn tại và đang active
  const roomType = await roomTypeModel.findById(payload.roomTypeId);
  if (!roomType) {
    throw new ValidationError('Loại phòng không tồn tại');
  }

  const numberTaken = await roomModel.roomNumberExists(payload.roomNumber);
  if (numberTaken) throw new ConflictError('Số phòng này đã tồn tại');

  const room = await roomModel.create({
    room_number: payload.roomNumber,
    room_type_id: payload.roomTypeId,
    floor: payload.floor ?? null,
    status: payload.status || 'available',
    notes: payload.notes || null,
  });

  logger.info('Tạo phòng mới', { roomId: room.id, roomNumber: room.room_number });
  return room;
}

async function updateRoom(id, payload) {
  const existing = await roomModel.findById(id);
  if (!existing) throw new NotFoundError('Phòng');

  if (payload.roomTypeId) {
    const roomType = await roomTypeModel.findById(payload.roomTypeId);
    if (!roomType) throw new ValidationError('Loại phòng không tồn tại');
  }

  if (payload.roomNumber) {
    const numberTaken = await roomModel.roomNumberExists(payload.roomNumber, id);
    if (numberTaken) throw new ConflictError('Số phòng này đã tồn tại');
  }

  const updateData = {};
  if (payload.roomNumber !== undefined) updateData.room_number = payload.roomNumber;
  if (payload.roomTypeId !== undefined) updateData.room_type_id = payload.roomTypeId;
  if (payload.floor !== undefined) updateData.floor = payload.floor;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.notes !== undefined) updateData.notes = payload.notes;

  const updated = await roomModel.update(id, updateData);
  logger.info('Cập nhật thông tin phòng', { roomId: id });
  return updated;
}

/**
 * Cập nhật trạng thái phòng (dùng riêng cho luồng vận hành nhanh: housekeeping đánh dấu
 * "đang dọn" -> "trống", lễ tân đánh dấu "đang ở"...). Không cho phép chuyển trạng thái
 * tùy tiện nếu phòng đang có khách (occupied) sang "available" trực tiếp - phải qua check-out.
 */
async function updateRoomStatus(id, newStatus) {
  const room = await roomModel.findById(id);
  if (!room) throw new NotFoundError('Phòng');

  if (room.status === 'occupied' && newStatus === 'available') {
    throw new ValidationError(
      'Không thể chuyển trực tiếp từ "đang ở" sang "trống". Vui lòng thực hiện check-out trước.'
    );
  }

  const updated = await roomModel.updateStatus(id, newStatus);
  logger.info('Cập nhật trạng thái phòng', { roomId: id, from: room.status, to: newStatus });
  return updated;
}

async function deleteRoom(id) {
  const existing = await roomModel.findById(id);
  if (!existing) throw new NotFoundError('Phòng');

  if (existing.status === 'occupied') {
    throw new ValidationError('Không thể xóa phòng đang có khách lưu trú');
  }

  await roomModel.softDelete(id);
  logger.info('Xóa (vô hiệu hóa) phòng', { roomId: id });
}

async function getAvailableRooms({ checkInDate, checkOutDate, roomTypeId }) {
  if (new Date(checkInDate) >= new Date(checkOutDate)) {
    throw new ValidationError('Ngày check-in phải trước ngày check-out');
  }
  return roomModel.findAvailableRooms({ checkInDate, checkOutDate, roomTypeId });
}

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom,
  getAvailableRooms,
};
