/**
 * RoomType Service - business logic cho quản lý loại phòng
 */
const roomTypeModel = require('../models/roomType.model');
const { ConflictError, NotFoundError, ValidationError } = require('../errors/AppError');
const logger = require('../utils/logger');

async function getAllRoomTypes(includeInactive = false) {
  return roomTypeModel.findAll({ includeInactive });
}

async function getRoomTypeById(id) {
  const roomType = await roomTypeModel.findById(id);
  if (!roomType) throw new NotFoundError('Loại phòng');
  return roomType;
}

async function createRoomType(payload) {
  const exists = await roomTypeModel.nameExists(payload.name);
  if (exists) throw new ConflictError('Tên loại phòng này đã tồn tại');

  const roomType = await roomTypeModel.create({
    name: payload.name,
    description: payload.description || null,
    base_price: payload.basePrice,
    max_occupancy: payload.maxOccupancy,
    num_beds: payload.numBeds,
    area_sqm: payload.areaSqm || null,
    amenities: JSON.stringify(payload.amenities || []),
  });

  logger.info('Tạo loại phòng mới', { roomTypeId: roomType.id, name: roomType.name });
  return roomType;
}

async function updateRoomType(id, payload) {
  const existing = await roomTypeModel.findById(id);
  if (!existing) throw new NotFoundError('Loại phòng');

  if (payload.name) {
    const nameTaken = await roomTypeModel.nameExists(payload.name, id);
    if (nameTaken) throw new ConflictError('Tên loại phòng này đã tồn tại');
  }

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.basePrice !== undefined) updateData.base_price = payload.basePrice;
  if (payload.maxOccupancy !== undefined) updateData.max_occupancy = payload.maxOccupancy;
  if (payload.numBeds !== undefined) updateData.num_beds = payload.numBeds;
  if (payload.areaSqm !== undefined) updateData.area_sqm = payload.areaSqm;
  if (payload.amenities !== undefined) updateData.amenities = JSON.stringify(payload.amenities);

  const updated = await roomTypeModel.update(id, updateData);
  logger.info('Cập nhật loại phòng', { roomTypeId: id });
  return updated;
}

async function deleteRoomType(id) {
  const existing = await roomTypeModel.findById(id);
  if (!existing) throw new NotFoundError('Loại phòng');

  const roomsCount = await roomTypeModel.countRoomsUsingType(id);
  if (roomsCount > 0) {
    throw new ValidationError(
      `Không thể xóa: vẫn còn ${roomsCount} phòng đang thuộc loại phòng này. Vui lòng chuyển các phòng sang loại khác trước.`
    );
  }

  await roomTypeModel.softDelete(id);
  logger.info('Xóa (vô hiệu hóa) loại phòng', { roomTypeId: id });
}

module.exports = {
  getAllRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType,
};
