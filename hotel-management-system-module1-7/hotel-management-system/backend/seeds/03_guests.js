/**
 * Seed: Khởi tạo dữ liệu mẫu khách hàng để phục vụ dev/test
 */
exports.seed = async function (knex) {
  await knex('guests').del();

  await knex('guests').insert([
    {
      full_name: 'Nguyễn Văn An',
      email: 'an.nguyen@example.com',
      phone: '0901111111',
      gender: 'male',
      date_of_birth: '1990-05-15',
      nationality: 'Vietnamese',
      id_type: 'cccd',
      id_number: '001090001234',
      address: '123 Lý Thường Kiệt, Hà Nội',
      total_stays: 3,
    },
    {
      full_name: 'Trần Thị Bình',
      email: 'binh.tran@example.com',
      phone: '0902222222',
      gender: 'female',
      date_of_birth: '1985-08-22',
      nationality: 'Vietnamese',
      id_type: 'cccd',
      id_number: '001085002345',
      total_stays: 1,
    },
    {
      full_name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1-555-123-4567',
      gender: 'male',
      date_of_birth: '1978-11-30',
      nationality: 'American',
      id_type: 'passport',
      id_number: 'US123456789',
      address: '456 Main St, New York, USA',
      total_stays: 2,
    },
    {
      full_name: 'Phạm Quốc Cường',
      phone: '0903333333',
      gender: 'male',
      nationality: 'Vietnamese',
      total_stays: 0,
    },
  ]);
};
