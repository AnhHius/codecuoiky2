/**
 * RoomType Model - tầng truy vấn dữ liệu cho bảng "room_types"
 */
const db = require('../config/database');

const TABLE = 'room_types';

async function findAll({ includeInactive = false } = {}) {
  const query = db(TABLE).select('*').orderBy('base_price', 'asc');
  if (!includeInactive) query.where({ is_active: true });
  return query;
}

async function findById(id) {
  return db(TABLE).where({ id }).first();
}

async function nameExists(name, excludeId = null) {
  const query = db(TABLE).whereRaw('LOWER(name) = LOWER(?)', [name]);
  if (excludeId) query.andWhereNot({ id: excludeId });
  const result = await query.first('id');
  return !!result;
}

async function create(data) {
  const [roomType] = await db(TABLE).insert(data).returning('*');
  return roomType;
}

async function update(id, data) {
  const [roomType] = await db(TABLE)
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return roomType;
}

/** Soft delete: chỉ đánh dấu is_active = false thay vì xóa cứng, tránh vỡ ràng buộc dữ liệu lịch sử */
async function softDelete(id) {
  return db(TABLE).where({ id }).update({ is_active: false, updated_at: db.fn.now() });
}

/** Đếm số phòng hiện đang thuộc loại phòng này, dùng để cảnh báo trước khi xóa */
async function countRoomsUsingType(id) {
  const result = await db('rooms').where({ room_type_id: id }).count('id as count').first();
  return parseInt(result.count, 10);
}

module.exports = {
  findAll,
  findById,
  nameExists,
  create,
  update,
  softDelete,
  countRoomsUsingType,
};
