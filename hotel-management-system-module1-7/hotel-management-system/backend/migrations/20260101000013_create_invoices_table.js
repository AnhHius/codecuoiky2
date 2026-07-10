/**
 * Migration: Tạo bảng "invoices" - hóa đơn thanh toán.
 * Mỗi booking có 1 hóa đơn duy nhất.
 * Hóa đơn chứa snapshot tổng hợp tại thời điểm phát hành.
 */
exports.up = function (knex) {
  return knex.schema.createTable('invoices', (table) => {
    table.increments('id').primary();
    table.string('invoice_number', 30).notNullable().unique(); // INV-20260101-XXXX
    table
      .integer('booking_id')
      .unsigned()
      .notNullable()
      .unique() // 1 booking chỉ có 1 hóa đơn
      .references('id')
      .inTable('bookings')
      .onDelete('RESTRICT');
    table
      .integer('issued_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');

    // Các khoản tiền (snapshot tại thời điểm phát hành)
    table.decimal('room_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('service_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('discount_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('total_amount', 14, 2).notNullable().defaultTo(0);

    table
      .enu('status', ['unpaid', 'partially_paid', 'paid'], {
        useNative: true,
        enumName: 'invoice_status_enum',
      })
      .notNullable()
      .defaultTo('unpaid');

    table.decimal('paid_amount', 14, 2).notNullable().defaultTo(0); // Tổng đã thanh toán
    table.text('notes').nullable();
    table.timestamp('issued_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('status');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('invoices');
  await knex.raw('DROP TYPE IF EXISTS invoice_status_enum');
};
