/**
 * Migration: Tạo bảng "roles" - định nghĩa các vai trò trong hệ thống
 * Ví dụ: Admin, Manager, Receptionist, Housekeeping, Accountant
 */
exports.up = function (knex) {
  return knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.string('description', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('roles');
};
