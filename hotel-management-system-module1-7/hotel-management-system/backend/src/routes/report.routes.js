/**
 * Report Routes - /api/v1/reports
 * Tất cả endpoint đều yêu cầu quyền "report:view"
 */
const express = require('express');
const reportController = require('../controllers/report.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  dateRangeSchema,
  monthlyReportSchema,
  topRoomsSchema,
  topGuestsSchema,
} = require('../validations/report.validation');

const router = express.Router();
router.use(authenticate, authorize('report:view'));

/**
 * @route   GET /api/v1/reports/dashboard
 * @desc    Tổng quan dashboard: trạng thái phòng, booking hôm nay, doanh thu hôm nay
 * @cache   Redis 5 phút
 */
router.get('/dashboard', reportController.getDashboardSummary);

/**
 * @route   GET /api/v1/reports/revenue/daily?fromDate=&toDate=
 * @desc    Doanh thu theo từng ngày (tối đa 90 ngày)
 * @cache   Redis 15 phút
 */
router.get(
  '/revenue/daily',
  validate(dateRangeSchema, 'query'),
  reportController.getRevenueByDay
);

/**
 * @route   GET /api/v1/reports/revenue/monthly?year=
 * @desc    Doanh thu tổng hợp 12 tháng trong 1 năm
 * @cache   Redis 10 phút (năm hiện tại) / 1 giờ (năm cũ)
 */
router.get(
  '/revenue/monthly',
  validate(monthlyReportSchema, 'query'),
  reportController.getRevenueByMonth
);

/**
 * @route   GET /api/v1/reports/occupancy/daily?fromDate=&toDate=
 * @desc    Công suất phòng theo ngày (occupancy rate %), tối đa 90 ngày
 * @cache   Redis 15 phút
 */
router.get(
  '/occupancy/daily',
  validate(dateRangeSchema, 'query'),
  reportController.getOccupancyByDay
);

/**
 * @route   GET /api/v1/reports/occupancy/monthly?year=
 * @desc    Công suất phòng tổng hợp theo tháng trong năm
 * @cache   Redis 10 phút (năm hiện tại) / 1 giờ (năm cũ)
 */
router.get(
  '/occupancy/monthly',
  validate(monthlyReportSchema, 'query'),
  reportController.getOccupancyByMonth
);

/**
 * @route   GET /api/v1/reports/top-rooms?fromDate=&toDate=&limit=
 * @desc    Top phòng được đặt nhiều nhất
 * @cache   Redis 30 phút
 */
router.get(
  '/top-rooms',
  validate(topRoomsSchema, 'query'),
  reportController.getTopRooms
);

/**
 * @route   GET /api/v1/reports/top-guests?limit=
 * @desc    Top khách hàng thân thiết (nhiều lần lưu trú nhất)
 * @cache   Redis 30 phút
 */
router.get(
  '/top-guests',
  validate(topGuestsSchema, 'query'),
  reportController.getTopGuests
);

/**
 * @route   GET /api/v1/reports/guests/nationality
 * @desc    Thống kê khách theo quốc tịch
 * @cache   Redis 30 phút
 */
router.get('/guests/nationality', reportController.getGuestsByNationality);

module.exports = router;
