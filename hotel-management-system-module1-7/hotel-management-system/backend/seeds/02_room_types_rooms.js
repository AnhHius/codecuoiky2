/**
 * Seed: Khởi tạo dữ liệu mẫu cho loại phòng và phòng
 */
exports.seed = async function (knex) {
  await knex('rooms').del();
  await knex('room_types').del();

  const roomTypes = await knex('room_types')
    .insert([
      {
        name: 'Standard',
        description: 'Phòng tiêu chuẩn, đầy đủ tiện nghi cơ bản',
        base_price: 500000,
        max_occupancy: 2,
        num_beds: 1,
        area_sqm: 20,
        amenities: JSON.stringify(['wifi', 'tv', 'air_conditioner']),
      },
      {
        name: 'Deluxe',
        description: 'Phòng cao cấp, view đẹp, rộng rãi hơn',
        base_price: 850000,
        max_occupancy: 2,
        num_beds: 1,
        area_sqm: 28,
        amenities: JSON.stringify(['wifi', 'tv', 'air_conditioner', 'minibar', 'city_view']),
      },
      {
        name: 'Suite',
        description: 'Phòng hạng sang, có phòng khách riêng',
        base_price: 1500000,
        max_occupancy: 4,
        num_beds: 2,
        area_sqm: 45,
        amenities: JSON.stringify(['wifi', 'tv', 'air_conditioner', 'minibar', 'jacuzzi', 'sea_view']),
      },
    ])
    .returning(['id', 'name']);

  const typeMap = roomTypes.reduce((acc, t) => ({ ...acc, [t.name]: t.id }), {});

  const rooms = [];
  // Tầng 2-3: Standard, Tầng 4-5: Deluxe, Tầng 6: Suite
  for (let floor = 2; floor <= 6; floor += 1) {
    let typeId = typeMap.Standard;
    if (floor >= 4 && floor <= 5) typeId = typeMap.Deluxe;
    if (floor === 6) typeId = typeMap.Suite;

    for (let i = 1; i <= 5; i += 1) {
      rooms.push({
        room_number: `${floor}0${i}`,
        room_type_id: typeId,
        floor,
        status: 'available',
      });
    }
  }

  await knex('rooms').insert(rooms);
};
