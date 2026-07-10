/**
 * Migration: Tạo bảng "guests" - hồ sơ khách hàng lưu trú.
 * Tách biệt hoàn toàn với bảng "users" (nhân viên hệ thống).
 * Một guest có thể đặt phòng nhiều lần (1-n với bookings).
 */
exports.up = function (knex) {
  return knex.schema.createTable('guests', (table) => {
    table.increments('id').primary();
    table.string('full_name', 150).notNullable();
    table.string('email', 150).unique().nullable();
    table.string('phone', 20).notNullable();
    table
      .enu('gender', ['male', 'female', 'other'], {
        useNative: true,
        enumName: 'gender_enum',
      })
      .nullable();
    table.date('date_of_birth').nullable();
    table.string('nationality', 100).nullable();

    // Giấy tờ tùy thân
    table
      .enu('id_type', ['cccd', 'passport', 'other'], {
        useNative: true,
        enumName: 'id_type_enum',
      })
      .nullable();
    table.string('id_number', 50).nullable();

    table.text('address').nullable();
    table.text('notes').nullable(); // Ghi chú nội bộ (vd: VIP, dị ứng thực phẩm...)
    table.integer('total_stays').unsigned().defaultTo(0); // Đếm số lần lưu trú (cache, cập nhật khi checkout)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Index tìm kiếm thường dùng
    table.index('phone');
    table.index('full_name');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('guests');
  await knex.raw('DROP TYPE IF EXISTS gender_enum');
  await knex.raw('DROP TYPE IF EXISTS id_type_enum');
};
