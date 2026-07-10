/**
 * Router gốc - tổng hợp tất cả các route module con.
 * Mỗi module nghiệp vụ (auth, rooms, bookings...) sẽ được thêm vào đây
 * khi module đó được triển khai.
 */
const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/room-types', require('./roomType.routes'));
router.use('/rooms', require('./room.routes'));
router.use('/guests', require('./guest.routes'));
router.use('/bookings', require('./booking.routes'));
router.use('/services', require('./service.routes'));
router.use('/invoices', require('./invoice.routes'));
router.use('/reports', require('./report.routes'));
// router.use('/rooms', require('./room.routes'));
// router.use('/room-types', require('./roomType.routes'));
// router.use('/guests', require('./guest.routes'));
// router.use('/bookings', require('./booking.routes'));
// router.use('/services', require('./service.routes'));
// router.use('/invoices', require('./invoice.routes'));
// router.use('/payments', require('./payment.routes'));
// router.use('/reports', require('./report.routes'));

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Hotel Management API v1' });
});

module.exports = router;
