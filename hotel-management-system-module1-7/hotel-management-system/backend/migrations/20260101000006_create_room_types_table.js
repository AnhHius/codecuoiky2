/**
 * Migration: Tạo bảng "room_types" - định nghĩa các loại phòng
 * (Standard, Deluxe, Suite...) cùng giá cơ bản và sức chứa.
 */
exports.up = function (knex) {
  return knex.schema.createTable('room_types', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.text('description');
    table.decimal('base_price', 12, 2).notNullable(); // Giá phòng/đêm mặc định
    table.integer('max_occupancy').unsigned().notNullable().defaultTo(2); // Số khách tối đa
    table.integer('num_beds').unsigned().notNullable().defaultTo(1);
    table.decimal('area_sqm', 6, 2); // Diện tích phòng (m2)
    table.jsonb('amenities').defaultTo('[]'); // Danh sách tiện nghi: ["wifi", "tv", "minibar"]
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('room_types');
};
