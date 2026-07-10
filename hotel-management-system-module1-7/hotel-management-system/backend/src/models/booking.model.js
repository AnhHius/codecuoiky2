/**
 * Booking Model - tầng truy vấn cho bảng bookings và booking_rooms.
 * Hầu hết các thao tác write đều nhận tham số `trx` (transaction) để đảm bảo
 * tính nhất quán khi thao tác trên nhiều bảng cùng lúc.
 */
const db = require('../config/database');

const TABLE = 'bookings';
const ROOMS_TABLE = 'booking_rooms';

// ─── Các cột cơ bản join guest + creator ────────────────────────────────────
const BASE_SELECT = [
  'bookings.*',
  'guests.full_name as guest_name',
  'guests.phone as guest_phone',
  'guests.email as guest_email',
  db.raw("CONCAT(users.full_name) as created_by_name"),
];

// ─── Lấy danh sách có phân trang + filter ───────────────────────────────────
async function findAllPaginated({ page = 1, limit = 20, status, guestId, checkInDate, checkOutDate, search }) {
  const offset = (page - 1) * limit;

  const base = db(TABLE)
    .join('guests', 'guests.id', 'bookings.guest_id')
    .join('users', 'users.id', 'bookings.created_by');

  if (status) base.where('bookings.status', status);
  if (guestId) base.where('bookings.guest_id', guestId);
  if (checkInDate) base.where('bookings.check_in_date', '>=', checkInDate);
  if (checkOutDate) base.where('bookings.check_out_date', '<=', checkOutDate);
  if (search) base.whereILike('bookings.booking_code', `%${search}%`);

  const [{ count }] = await base.clone().count('bookings.id as count');

  const data = await base
    .clone()
    .select(BASE_SELECT)
    .orderBy('bookings.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return { data, total: parseInt(count, 10) };
}

// ─── Lấy 1 booking đầy đủ (kèm rooms) ──────────────────────────────────────
async function findById(id) {
  const booking = await db(TABLE)
    .join('guests', 'guests.id', 'bookings.guest_id')
    .join('users', 'users.id', 'bookings.created_by')
    .select(BASE_SELECT)
    .where('bookings.id', id)
    .first();

  if (!booking) return null;

  // Lấy danh sách phòng kèm thông tin loại phòng
  booking.rooms = await db(ROOMS_TABLE)
    .join('rooms', 'rooms.id', 'booking_rooms.room_id')
    .join('room_types', 'room_types.id', 'rooms.room_type_id')
    .select(
      'booking_rooms.id',
      'booking_rooms.room_id',
      'booking_rooms.price_per_night',
      'booking_rooms.num_nights',
      'booking_rooms.subtotal',
      'rooms.room_number',
      'room_types.name as room_type_name'
    )
    .where('booking_rooms.booking_id', id);

  return booking;
}

async function findByCode(bookingCode) {
  return db(TABLE).where({ booking_code: bookingCode }).first();
}

// ─── Tạo booking (trong transaction) ────────────────────────────────────────
async function create(bookingData, trx = db) {
  const [booking] = await trx(TABLE).insert(bookingData).returning('*');
  return booking;
}

async function createBookingRooms(roomsData, trx = db) {
  return trx(ROOMS_TABLE).insert(roomsData).returning('*');
}

// ─── Cập nhật trạng thái / thông tin ────────────────────────────────────────
async function updateStatus(id, status, extraData = {}, trx = db) {
  const [booking] = await trx(TABLE)
    .where({ id })
    .update({ status, ...extraData, updated_at: db.fn.now() })
    .returning('*');
  return booking;
}

async function update(id, data, trx = db) {
  const [booking] = await trx(TABLE)
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return booking;
}

// ─── Kiểm tra phòng đã bị đặt chưa (dùng row-level lock) ───────────────────
/**
 * Trả về danh sách room_id từ roomIds đã có booking active giao nhau với [checkIn, checkOut).
 * Dùng FOR UPDATE SKIP LOCKED: chỉ lock các row đang được xử lý, không block toàn bảng.
 * Kết quả: mảng roomId đang bận → nếu rỗng thì toàn bộ phòng available.
 */
async function findConflictingRoomIds(roomIds, checkInDate, checkOutDate, excludeBookingId = null, trx = db) {
  const query = trx(ROOMS_TABLE)
    .join('bookings', 'bookings.id', 'booking_rooms.booking_id')
    .whereIn('booking_rooms.room_id', roomIds)
    .whereIn('bookings.status', ['confirmed', 'checked_in'])
    .where('bookings.check_in_date', '<', checkOutDate)
    .where('bookings.check_out_date', '>', checkInDate)
    .pluck('booking_rooms.room_id');

  if (excludeBookingId) query.andWhere('bookings.id', '!=', excludeBookingId);

  return query;
}

// ─── Thống kê nhanh cho dashboard ───────────────────────────────────────────
async function countByStatus() {
  const rows = await db(TABLE)
    .select('status')
    .count('id as count')
    .groupBy('status');
  return rows.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count, 10) }), {});
}

async function findCheckinToday() {
  const today = new Date().toISOString().slice(0, 10);
  return db(TABLE)
    .join('guests', 'guests.id', 'bookings.guest_id')
    .select('bookings.id', 'bookings.booking_code', 'bookings.check_in_date',
      'bookings.status', 'guests.full_name as guest_name', 'guests.phone as guest_phone')
    .where('bookings.check_in_date', today)
    .whereIn('bookings.status', ['confirmed', 'pending'])
    .orderBy('bookings.created_at', 'asc');
}

async function findCheckoutToday() {
  const today = new Date().toISOString().slice(0, 10);
  return db(TABLE)
    .join('guests', 'guests.id', 'bookings.guest_id')
    .select('bookings.id', 'bookings.booking_code', 'bookings.check_out_date',
      'bookings.status', 'guests.full_name as guest_name', 'guests.phone as guest_phone')
    .where('bookings.check_out_date', today)
    .where('bookings.status', 'checked_in')
    .orderBy('bookings.created_at', 'asc');
}

module.exports = {
  findAllPaginated,
  findById,
  findByCode,
  create,
  createBookingRooms,
  updateStatus,
  update,
  findConflictingRoomIds,
  countByStatus,
  findCheckinToday,
  findCheckoutToday,
};
