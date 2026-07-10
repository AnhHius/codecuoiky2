/**
 * Migration: Tạo bảng "services" - danh mục dịch vụ khách sạn
 * (giặt ủi, spa, đưa đón, minibar, phòng gym, nhà hàng...)
 */
exports.up = function (knex) {
  return knex.schema.createTable('services', (table) => {
    table.increments('id').primary();
    table.string('name', 150).notNullable().unique();
    table.text('description').nullable();
    table
      .enu('category', ['food_beverage', 'laundry', 'spa', 'transport', 'other'], {
        useNative: true,
        enumName: 'service_category_enum',
      })
      .notNullable()
      .defaultTo('other');
    table.decimal('unit_price', 12, 2).notNullable();
    table.string('unit', 50).defaultTo('lần'); // Đơn vị tính: "lần", "kg", "giờ", "phần"...
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('category');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('services');
  await knex.raw('DROP TYPE IF EXISTS service_category_enum');
};
