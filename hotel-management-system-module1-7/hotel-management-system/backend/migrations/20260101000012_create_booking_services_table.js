/**
 * Migration: Tạo bảng "booking_services" - gắn dịch vụ vào 1 booking cụ thể.
 * Lưu snapshot giá tại thời điểm sử dụng, không phụ thuộc vào unit_price sau này.
 * Có thể thêm nhiều lần cùng 1 dịch vụ (mỗi lần là 1 row mới với quantity riêng).
 */
exports.up = function (knex) {
  return knex.schema.createTable('booking_services', (table) => {
    table.increments('id').primary();
    table
      .integer('booking_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('bookings')
      .onDelete('CASCADE');
    table
      .integer('service_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('services')
      .onDelete('RESTRICT');

    table.decimal('unit_price', 12, 2).notNullable(); // Snapshot giá tại thời điểm dùng
    table.integer('quantity').unsigned().notNullable().defaultTo(1);
    table.decimal('subtotal', 14, 2).notNullable(); // unit_price × quantity
    table.text('notes').nullable(); // Ghi chú thêm (vd: "minibar ngày 05/07")
    table.timestamp('used_at').defaultTo(knex.fn.now()); // Thời điểm sử dụng dịch vụ

    table.index('booking_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('booking_services');
};
