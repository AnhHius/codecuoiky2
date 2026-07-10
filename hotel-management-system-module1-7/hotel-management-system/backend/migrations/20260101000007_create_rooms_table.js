/**
 * Migration: Tạo bảng "rooms" - từng phòng vật lý cụ thể trong khách sạn.
 * Trạng thái phòng (status) phục vụ vận hành hàng ngày (lễ tân, buồng phòng),
 * tách biệt với trạng thái "đã đặt hay chưa" (việc đó tính qua bảng bookings theo ngày).
 */
exports.up = function (knex) {
  return knex.schema.createTable('rooms', (table) => {
    table.increments('id').primary();
    table.string('room_number', 20).notNullable().unique();
    table
      .integer('room_type_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('room_types')
      .onDelete('RESTRICT'); // Không cho xóa room_type nếu còn phòng thuộc loại đó
    table.integer('floor').unsigned();
    table
      .enu('status', ['available', 'occupied', 'cleaning', 'maintenance', 'out_of_service'], {
        useNative: true,
        enumName: 'room_status_enum',
      })
      .notNullable()
      .defaultTo('available');
    table.text('notes'); // Ghi chú nội bộ (vd: "máy lạnh hơi yếu")
    table.boolean('is_active').defaultTo(true); // Phòng có đang được đưa vào vận hành không
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('room_type_id');
    table.index('status'); // Tăng tốc truy vấn tìm phòng theo trạng thái (dashboard, housekeeping)
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('rooms');
  await knex.raw('DROP TYPE IF EXISTS room_status_enum');
};
