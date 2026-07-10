/**
 * Sinh mã booking duy nhất theo định dạng: BK-YYYYMMDD-XXXX
 * Ví dụ: BK-20260704-A3F9
 * Dùng crypto.randomBytes để đảm bảo tính ngẫu nhiên thật sự, không dùng Math.random().
 */
const crypto = require('crypto');

function generateBookingCode() {
  const today = new Date();
  const datePart = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ''); // "20260704"
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase(); // "A3F9"
  return `BK-${datePart}-${randomPart}`;
}

module.exports = { generateBookingCode };
