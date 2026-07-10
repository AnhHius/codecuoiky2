/**
 * Migration: Tạo bảng "permissions" - định nghĩa các quyền hạn chi tiết
 * Ví dụ: "booking:create", "booking:cancel", "room:delete", "report:view"
 * Quy ước đặt tên: <resource>:<action>
 */
exports.up = function (knex) {
  return knex.schema.createTable('permissions', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.string('description', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('permissions');
};
