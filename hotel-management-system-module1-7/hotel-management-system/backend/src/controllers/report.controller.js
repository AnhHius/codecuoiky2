/**
 * Report Controller - /api/v1/reports
 */
const reportService = require('../services/report.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');

const getDashboardSummary = catchAsync(async (req, res) => {
  const data = await reportService.getDashboardSummary();
  return sendSuccess(res, { message: 'Lấy thống kê dashboard thành công', data });
});

const getRevenueByDay = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueByDay(req.query);
  return sendSuccess(res, { message: 'Báo cáo doanh thu theo ngày', data });
});

const getRevenueByMonth = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueByMonth(req.query);
  return sendSuccess(res, { message: 'Báo cáo doanh thu theo tháng', data });
});

const getOccupancyByDay = catchAsync(async (req, res) => {
  const data = await reportService.getOccupancyByDay(req.query);
  return sendSuccess(res, { message: 'Báo cáo công suất phòng theo ngày', data });
});

const getOccupancyByMonth = catchAsync(async (req, res) => {
  const data = await reportService.getOccupancyByMonth(req.query);
  return sendSuccess(res, { message: 'Báo cáo công suất phòng theo tháng', data });
});

const getTopRooms = catchAsync(async (req, res) => {
  const data = await reportService.getTopRooms(req.query);
  return sendSuccess(res, { message: 'Top phòng được đặt nhiều nhất', data });
});

const getTopGuests = catchAsync(async (req, res) => {
  const data = await reportService.getTopGuests(req.query);
  return sendSuccess(res, { message: 'Top khách hàng thân thiết', data });
});

const getGuestsByNationality = catchAsync(async (req, res) => {
  const data = await reportService.getGuestsByNationality();
  return sendSuccess(res, { message: 'Thống kê khách theo quốc tịch', data });
});

module.exports = {
  getDashboardSummary,
  getRevenueByDay,
  getRevenueByMonth,
  getOccupancyByDay,
  getOccupancyByMonth,
  getTopRooms,
  getTopGuests,
  getGuestsByNationality,
};
