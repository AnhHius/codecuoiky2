/**
 * Service Model - query layer cho bảng "services" (danh mục) và "booking_services" (dịch vụ dùng)
 */
const db = require('../config/database');

const TABLE = 'services';
const BOOKING_SERVICES_TABLE = 'booking_services';

// ─── Danh mục dịch vụ ────────────────────────────────────────────────────────
async function findAllPaginated({ page = 1, limit = 20, category, search }) {
  const offset = (page - 1) * limit;
  const base = db(TABLE).where('is_active', true);
  if (category) base.andWhere({ category });
  if (search) base.andWhereILike('name', `%${search}%`);

  const [{ count }] = await base.clone().count('id as count');
  const data = await base.clone().select('*').orderBy('category').orderBy('name').limit(limit).offset(offset);
  return { data, total: parseInt(count, 10) };
}

async function findAll(includeInactive = false) {
  const q = db(TABLE).select('*').orderBy('category').orderBy('name');
  if (!includeInactive) q.where('is_active', true);
  return q;
}

async function findById(id) {
  return db(TABLE).where({ id }).first();
}

async function nameExists(name, excludeId = null) {
  const q = db(TABLE).whereRaw('LOWER(name) = LOWER(?)', [name]);
  if (excludeId) q.andWhereNot({ id: excludeId });
  return !!(await q.first('id'));
}

async function create(data) {
  const [service] = await db(TABLE).insert(data).returning('*');
  return service;
}

async function update(id, data) {
  const [service] = await db(TABLE).where({ id }).update({ ...data, updated_at: db.fn.now() }).returning('*');
  return service;
}

async function softDelete(id) {
  return db(TABLE).where({ id }).update({ is_active: false, updated_at: db.fn.now() });
}

// ─── Dịch vụ theo booking ─────────────────────────────────────────────────────
async function findBookingServices(bookingId) {
  return db(BOOKING_SERVICES_TABLE)
    .join('services', 'services.id', 'booking_services.service_id')
    .select(
      'booking_services.id',
      'booking_services.booking_id',
      'booking_services.service_id',
      'booking_services.unit_price',
      'booking_services.quantity',
      'booking_services.subtotal',
      'booking_services.notes',
      'booking_services.used_at',
      'services.name as service_name',
      'services.category',
      'services.unit'
    )
    .where('booking_services.booking_id', bookingId)
    .orderBy('booking_services.used_at', 'asc');
}

async function findBookingServiceById(id) {
  return db(BOOKING_SERVICES_TABLE).where({ id }).first();
}

async function addBookingService(data, trx = db) {
  const [row] = await trx(BOOKING_SERVICES_TABLE).insert(data).returning('*');
  return row;
}

async function removeBookingService(id, trx = db) {
  return trx(BOOKING_SERVICES_TABLE).where({ id }).del();
}

/** Tổng tiền dịch vụ của 1 booking - dùng để cập nhật lại service_amount và total_amount */
async function sumServiceAmount(bookingId, trx = db) {
  const [{ total }] = await trx(BOOKING_SERVICES_TABLE)
    .where({ booking_id: bookingId })
    .sum('subtotal as total');
  return parseFloat(total || 0);
}

module.exports = {
  findAllPaginated,
  findAll,
  findById,
  nameExists,
  create,
  update,
  softDelete,
  findBookingServices,
  findBookingServiceById,
  addBookingService,
  removeBookingService,
  sumServiceAmount,
};
