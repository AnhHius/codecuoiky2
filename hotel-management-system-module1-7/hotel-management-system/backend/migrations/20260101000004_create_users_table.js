/**
 * Migration: Tạo bảng "users" - tài khoản nhân viên vận hành hệ thống
 * (Admin, Manager, Lễ tân, Buồng phòng, Kế toán...)
 * Lưu ý: bảng này KHÁC với bảng "guests" (khách lưu trú) sẽ tạo ở module Booking.
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('full_name', 150).notNullable();
    table.string('email', 150).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('phone', 20);
    table
      .integer('role_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('RESTRICT'); // Không cho xóa role nếu còn user đang dùng
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Index cho tìm kiếm/login theo email (đã có sẵn do unique, nhưng để rõ ràng)
    table.index('role_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
