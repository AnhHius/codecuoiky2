/**
 * Room Model - tầng truy vấn dữ liệu cho bảng "rooms"
 */
const db = require('../config/database');

const TABLE = 'rooms';

const SELECT_WITH_TYPE = [
  'rooms.id',
  'rooms.room_number',
  'rooms.room_type_id',
  'rooms.floor',
  'rooms.status',
  'rooms.notes',
  'rooms.is_active',
  'rooms.created_at',
  'rooms.updated_at',
  'room_types.name as room_type_name',
  'room_types.base_price',
  'room_types.max_occupancy',
];

/**
 * Tìm danh sách phòng có phân trang + filter theo status/loại phòng/từ khóa tìm kiếm
 */
async function findAllPaginated({ page = 1, limit = 20, status, roomTypeId, search }) {
  const offset = (page - 1) * limit;

  const baseQuery = db(TABLE).join('room_types', 'room_types.id', 'rooms.room_type_id');

  if (status) baseQuery.andWhere('rooms.status', status);
  if (roomTypeId) baseQuery.andWhere('rooms.room_type_id', roomTypeId);
  if (search) baseQuery.andWhere('rooms.room_number', 'ilike', `%${search}%`);
  baseQuery.andWhere('rooms.is_active', true);

  const [{ count }] = await baseQuery.clone().count('rooms.id as count');

  const data = await baseQuery
    .clone()
    .select(SELECT_WITH_TYPE)
    .orderBy('rooms.room_number', 'asc')
    .limit(limit)
    .offset(offset);

  return { data, total: parseInt(count, 10) };
}

async function findById(id) {
  return db(TABLE)
    .join('room_types', 'room_types.id', 'rooms.room_type_id')
    .select(SELECT_WITH_TYPE)
    .where('rooms.id', id)
    .first();
}

async function roomNumberExists(roomNumber, excludeId = null) {
  const query = db(TABLE).whereRaw('LOWER(room_number) = LOWER(?)', [roomNumber]);
  if (excludeId) query.andWhereNot({ id: excludeId });
  const result = await query.first('id');
  return !!result;
}

async function create(data) {
  const [room] = await db(TABLE).insert(data).returning('id');
  return findById(room.id);
}

async function update(id, data) {
  await db(TABLE)
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() });
  return findById(id);
}

async function updateStatus(id, status) {
  await db(TABLE).where({ id }).update({ status, updated_at: db.fn.now() });
  return findById(id);
}

async function softDelete(id) {
  return db(TABLE).where({ id }).update({ is_active: false, updated_at: db.fn.now() });
}

/**
 * Lấy danh sách phòng còn trống trong khoảng thời gian [checkIn, checkOut)
 * Logic: 1 phòng được coi là KHÔNG trống nếu tồn tại booking_rooms với status
 * đang hoạt động (confirmed/checked_in) mà khoảng ngày giao nhau với khoảng yêu cầu.
 * Hàm này sẽ được dùng ở Module Booking, đặt sẵn ở đây vì thuộc về Room domain.
 */
async function findAvailableRooms({ checkInDate, checkOutDate, roomTypeId }) {
  const query = db(TABLE)
    .join('room_types', 'room_types.id', 'rooms.room_type_id')
    .select(SELECT_WITH_TYPE)
    .where('rooms.is_active', true)
    .whereNotIn('rooms.status', ['maintenance', 'out_of_service'])
    .whereNotExists(function () {
      this.select('*')
        .from('booking_rooms')
        .join('bookings', 'bookings.id', 'booking_rooms.booking_id')
        .whereRaw('booking_rooms.room_id = rooms.id')
        .whereIn('bookings.status', ['confirmed', 'checked_in'])
        // Hai khoảng ngày giao nhau khi: start1 < end2 AND start2 < end1
        .andWhere('bookings.check_in_date', '<', checkOutDate)
        .andWhere('bookings.check_out_date', '>', checkInDate);
    });

  if (roomTypeId) query.andWhere('rooms.room_type_id', roomTypeId);

  return query.orderBy('rooms.room_number', 'asc');
}

module.exports = {
  findAllPaginated,
  findById,
  roomNumberExists,
  create,
  update,
  updateStatus,
  softDelete,
  findAvailableRooms,
};
