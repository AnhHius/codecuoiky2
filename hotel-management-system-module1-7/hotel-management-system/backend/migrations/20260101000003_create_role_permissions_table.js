/**
 * Migration: Tạo bảng "role_permissions" - bảng nối many-to-many
 * giữa roles và permissions (1 role có nhiều permissions, 1 permission có thể thuộc nhiều role)
 */
exports.up = function (knex) {
  return knex.schema.createTable('role_permissions', (table) => {
    table.increments('id').primary();
    table
      .integer('role_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE');
    table
      .integer('permission_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('permissions')
      .onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Đảm bảo không trùng lặp cặp role-permission
    table.unique(['role_id', 'permission_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('role_permissions');
};
