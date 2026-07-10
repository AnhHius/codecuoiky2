module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
  ],
  // Lưu ý: threshold global sẽ được áp dụng đầy đủ khi TOÀN BỘ các module nghiệp vụ
  // (rooms, bookings, guests, invoices...) đã hoàn thành và có test tương ứng.
  // Trong giai đoạn phát triển từng module, coverage được kiểm tra qua lệnh
  // `npm run test:coverage` và review thủ công theo từng module, không enforce cứng ở đây
  // để tránh các module CHƯA code (0% coverage) làm fail toàn bộ CI.
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
};
