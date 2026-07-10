/**
 * Invoice Model - query layer cho bảng "invoices" và "payments"
 */
const db = require('../config/database');
const crypto = require('crypto');

const TABLE = 'invoices';
const PAYMENTS_TABLE = 'payments';

// ─── Sinh số hóa đơn ─────────────────────────────────────────────────────────
function generateInvoiceNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `INV-${datePart}-${rand}`;
}

// ─── Invoice CRUD ─────────────────────────────────────────────────────────────
async function findById(id) {
  const invoice = await db(TABLE)
    .join('bookings', 'bookings.id', 'invoices.booking_id')
    .join('guests', 'guests.id', 'bookings.guest_id')
    .join('users', 'users.id', 'invoices.issued_by')
    .select(
      'invoices.*',
      'bookings.booking_code',
      'bookings.check_in_date',
      'bookings.check_out_date',
      'guests.full_name as guest_name',
      'guests.phone as guest_phone',
      'users.full_name as issued_by_name'
    )
    .where('invoices.id', id)
    .first();

  if (!invoice) return null;

  invoice.payments = await db(PAYMENTS_TABLE)
    .join('users', 'users.id', 'payments.received_by')
    .select('payments.*', 'users.full_name as received_by_name')
    .where('payments.invoice_id', id)
    .orderBy('payments.paid_at', 'asc');

  return invoice;
}

async function findByBookingId(bookingId) {
  return db(TABLE).where({ booking_id: bookingId }).first();
}

async function create(data, trx = db) {
  const [invoice] = await trx(TABLE).insert(data).returning('*');
  return invoice;
}

async function update(id, data, trx = db) {
  const [invoice] = await trx(TABLE)
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return invoice;
}

// ─── Payment ─────────────────────────────────────────────────────────────────
async function addPayment(data, trx = db) {
  const [payment] = await trx(PAYMENTS_TABLE).insert(data).returning('*');
  return payment;
}

/** Tổng tiền đã thanh toán của 1 hóa đơn */
async function sumPaidAmount(invoiceId, trx = db) {
  const [{ total }] = await trx(PAYMENTS_TABLE).where({ invoice_id: invoiceId }).sum('amount as total');
  return parseFloat(total || 0);
}

module.exports = {
  generateInvoiceNumber,
  findById,
  findByBookingId,
  create,
  update,
  addPayment,
  sumPaidAmount,
};
