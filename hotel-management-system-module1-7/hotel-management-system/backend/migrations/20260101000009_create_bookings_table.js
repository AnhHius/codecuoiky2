/**
 * Migration: Tạo bảng "bookings" - đơn đặt phòng trung tâm của hệ thống.
 * 1 booking có thể gồm nhiều phòng (many-to-many qua booking_rooms).
 * Vòng đời: pending → confirmed → checked_in → checked_out
 *                              └→ cancelled
 */
exports.up = function (knex) {
  return knex.schema.createTable('bookings', (table) => {
    table.increments('id').primary();
    table.string('booking_code', 20).notNullable().unique(); // Mã đặt phòng: BK-20260101-XXXX
    table
      .integer('guest_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('guests')
      .onDelete('RESTRICT');
    table
      .integer('created_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT'); // Nhân viên tạo booking

    table.date('check_in_date').notNullable();
    table.date('check_out_date').notNullable();
    table.integer('num_nights').unsigned().notNullable(); // Số đêm = checkOut - checkIn

    table
      .enu(
        'status',
        ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
        { useNative: true, enumName: 'booking_status_enum' }
      )
      .notNullable()
      .defaultTo('pending');

    table.decimal('room_amount', 14, 2).notNullable().defaultTo(0); // Tổng tiền phòng
    table.decimal('service_amount', 14, 2).notNullable().defaultTo(0); // Tổng tiền dịch vụ
    table.decimal('discount_amount', 14, 2).notNullable().defaultTo(0); // Giảm giá
    table.decimal('total_amount', 14, 2).notNullable().defaultTo(0); // Tổng cuối

    // Thông tin thực tế check-in/check-out (khác với ngày dự kiến)
    table.timestamp('actual_check_in_at').nullable();
    table.timestamp('actual_check_out_at').nullable();

    table.integer('num_guests').unsigned().defaultTo(1); // Số khách thực tế
    table.text('special_requests').nullable(); // Yêu cầu đặc biệt của khách
    table.text('cancellation_reason').nullable();
    table.timestamp('cancelled_at').nullable();
    table
      .integer('cancelled_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Index quan trọng: tìm phòng trống dùng khoảng ngày check-in/out (composite)
    table.index(['check_in_date', 'check_out_date']);
    table.index('status');
    table.index('guest_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('bookings');
  await knex.raw('DROP TYPE IF EXISTS booking_status_enum');
};
