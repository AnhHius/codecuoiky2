/**
 * Migration: Tạo bảng "booking_rooms" - bảng nối giữa bookings và rooms.
 * Lưu giá phòng TẠI THỜI ĐIỂM đặt (snapshot), không bị ảnh hưởng khi base_price thay đổi sau này.
 */
exports.up = function (knex) {
  return knex.schema.createTable('booking_rooms', (table) => {
    table.increments('id').primary();
    table
      .integer('booking_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('bookings')
      .onDelete('CASCADE');
    table
      .integer('room_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('rooms')
      .onDelete('RESTRICT');

    // Snapshot giá tại thời điểm đặt phòng
    table.decimal('price_per_night', 12, 2).notNullable();
    table.integer('num_nights').unsigned().notNullable();
    table.decimal('subtotal', 14, 2).notNullable(); // price_per_night × num_nights

    table.unique(['booking_id', 'room_id']); // Mỗi phòng chỉ xuất hiện 1 lần trong 1 booking
    table.index('booking_id');
    table.index('room_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('booking_rooms');
};
