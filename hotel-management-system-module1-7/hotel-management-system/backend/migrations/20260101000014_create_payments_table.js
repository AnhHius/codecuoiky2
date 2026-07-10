/**
 * Migration: Tạo bảng "payments" - lịch sử từng lần thanh toán.
 * 1 invoice có thể được thanh toán nhiều lần (đặt cọc trước + thanh toán phần còn lại).
 */
exports.up = function (knex) {
  return knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();
    table
      .integer('invoice_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('invoices')
      .onDelete('RESTRICT');
    table
      .integer('received_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');

    table.decimal('amount', 14, 2).notNullable();
    table
      .enu('method', ['cash', 'card', 'transfer', 'other'], {
        useNative: true,
        enumName: 'payment_method_enum',
      })
      .notNullable()
      .defaultTo('cash');
    table.string('reference_number', 100).nullable(); // Mã giao dịch chuyển khoản / thẻ
    table.text('notes').nullable();
    table.timestamp('paid_at').defaultTo(knex.fn.now());

    table.index('invoice_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('payments');
  await knex.raw('DROP TYPE IF EXISTS payment_method_enum');
};
