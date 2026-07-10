/**
 * Seed: Dịch vụ mẫu cho khách sạn
 */
exports.seed = async function (knex) {
  await knex('services').del();

  await knex('services').insert([
    { name: 'Giặt ủi (kg)', category: 'laundry', unit_price: 30000, unit: 'kg', description: 'Giặt ủi theo kg, trả trong 24h' },
    { name: 'Giặt nhanh (kg)', category: 'laundry', unit_price: 50000, unit: 'kg', description: 'Giặt nhanh, trả trong 4h' },
    { name: 'Minibar nước suối', category: 'food_beverage', unit_price: 25000, unit: 'chai' },
    { name: 'Minibar bia', category: 'food_beverage', unit_price: 45000, unit: 'lon' },
    { name: 'Bữa sáng', category: 'food_beverage', unit_price: 120000, unit: 'phần', description: 'Buffet sáng tại nhà hàng' },
    { name: 'Massage 60 phút', category: 'spa', unit_price: 350000, unit: 'lần' },
    { name: 'Spa toàn thân', category: 'spa', unit_price: 650000, unit: 'lần' },
    { name: 'Đưa đón sân bay (nội thành)', category: 'transport', unit_price: 250000, unit: 'lượt' },
    { name: 'Thuê xe máy', category: 'transport', unit_price: 150000, unit: 'ngày' },
    { name: 'Giường phụ', category: 'other', unit_price: 200000, unit: 'đêm' },
  ]);
};
