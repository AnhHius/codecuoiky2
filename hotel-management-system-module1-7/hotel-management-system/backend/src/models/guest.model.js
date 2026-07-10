/**
 * Guest Model - tầng truy vấn dữ liệu cho bảng "guests"
 */
const db = require('../config/database');

const TABLE = 'guests';

/**
 * Tìm danh sách khách hàng có phân trang + tìm kiếm mờ theo tên/phone/email
 */
async function findAllPaginated({ page = 1, limit = 20, search, nationality }) {
  const offset = (page - 1) * limit;

  const baseQuery = db(TABLE);

  // Tìm khớp theo bất kỳ trường nhận dạng nào (OR logic)
  if (search) {
    baseQuery.where(function () {
      this.whereILike('full_name', `%${search}%`)
        .orWhereILike('phone', `%${search}%`)
        .orWhereILike('email', `%${search}%`)
        .orWhereILike('id_number', `%${search}%`);
    });
  }
  if (nationality) baseQuery.andWhereILike('nationality', `%${nationality}%`);

  const [{ count }] = await baseQuery.clone().count('id as count');

  const data = await baseQuery
    .clone()
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return { data, total: parseInt(count, 10) };
}

async function findById(id) {
  return db(TABLE).where({ id }).first();
}

async function findByEmail(email) {
  return db(TABLE).whereRaw('LOWER(email) = LOWER(?)', [email]).first();
}

/**
 * Tìm khách hàng trùng thông tin: cùng idType + idNumber (để tránh trùng hồ sơ)
 * excludeId: bỏ qua chính record đang được cập nhật khi check duplicate
 */
async function findDuplicateIdentity(idType, idNumber, excludeId = null) {
  const query = db(TABLE).where({ id_type: idType }).andWhereRaw('LOWER(id_number) = LOWER(?)', [idNumber]);
  if (excludeId) query.andWhereNot({ id: excludeId });
  return query.first('id');
}

async function create(data) {
  const [guest] = await db(TABLE).insert(data).returning('*');
  return guest;
}

async function update(id, data) {
  const [guest] = await db(TABLE)
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return guest;
}

/** Tăng biến đếm total_stays sau mỗi lần checkout thành công */
async function incrementTotalStays(id, trx = db) {
  return trx(TABLE).where({ id }).increment('total_stays', 1);
}

/**
 * Lịch sử đặt phòng của 1 khách: join bookings để lấy thông tin lưu trú
 * (dùng ở Module Booking - khai báo sẵn ở đây vì thuộc Guest domain)
 */
async function findStayHistory(guestId, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;

  const [{ count }] = await db('bookings').where({ guest_id: guestId }).count('id as count');

  const data = await db('bookings')
    .where({ guest_id: guestId })
    .select(
      'bookings.id',
      'bookings.booking_code',
      'bookings.check_in_date',
      'bookings.check_out_date',
      'bookings.status',
      'bookings.total_amount',
      'bookings.created_at'
    )
    .orderBy('bookings.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return { data, total: parseInt(count, 10) };
}

module.exports = {
  findAllPaginated,
  findById,
  findByEmail,
  findDuplicateIdentity,
  create,
  update,
  incrementTotalStays,
  findStayHistory,
};
