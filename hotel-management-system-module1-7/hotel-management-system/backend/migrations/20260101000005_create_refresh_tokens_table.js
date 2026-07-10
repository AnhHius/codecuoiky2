/**
 * Migration: Tạo bảng "refresh_tokens" - lưu trữ refresh token đã cấp
 * Cho phép: thu hồi token (logout), kiểm soát phiên đăng nhập, phát hiện reuse token bị đánh cắp
 */
exports.up = function (knex) {
  return knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('token_hash', 255).notNullable().unique(); // Lưu hash của token, không lưu plain text
    table.string('user_agent', 255);
    table.string('ip_address', 45);
    table.boolean('is_revoked').defaultTo(false);
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'is_revoked']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('refresh_tokens');
};
