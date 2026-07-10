/**
 * Report Service - tổng hợp dữ liệu báo cáo và áp dụng Redis caching.
 *
 * ── Chiến lược caching ─────────────────────────────────────────────────────
 *   - Dashboard summary: TTL 5 phút (thay đổi thường xuyên theo hoạt động)
 *   - Báo cáo theo ngày: TTL 15 phút (đủ fresh cho quản lý xem)
 *   - Báo cáo theo tháng/năm dữ liệu cũ: TTL 1 giờ (ít thay đổi)
 *   - Báo cáo tháng hiện tại: TTL 10 phút (vẫn đang cập nhật)
 *
 * Cache key dùng tham số query để mỗi combination params có cache riêng.
 */
const reportModel = require('../models/report.model');
const { cacheAside } = require('../utils/cache');
const { ValidationError } = require('../errors/AppError');

const TTL = {
  DASHBOARD: 5 * 60,
  DAILY_REPORT: 15 * 60,
  MONTHLY_CURRENT: 10 * 60,
  MONTHLY_HISTORICAL: 60 * 60,
  TOP_N: 30 * 60,
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function getDashboardSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const key = `dashboard:summary:${today}`;
  return cacheAside(key, () => reportModel.getDashboardSummary(), TTL.DASHBOARD);
}

// ─── Doanh thu ────────────────────────────────────────────────────────────────

async function getRevenueByDay({ fromDate, toDate }) {
  // Giới hạn khoảng thời gian tối đa 90 ngày để tránh query quá nặng
  const days = Math.round(
    (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
  );
  if (days > 90) {
    throw new ValidationError('Khoảng thời gian tối đa cho báo cáo theo ngày là 90 ngày');
  }

  const key = `report:revenue:daily:${fromDate}:${toDate}`;
  return cacheAside(key, () => reportModel.getRevenueByDay(fromDate, toDate), TTL.DAILY_REPORT);
}

async function getRevenueByMonth({ year }) {
  const currentYear = new Date().getFullYear();
  // Dữ liệu năm cũ ít thay đổi → cache lâu hơn
  const ttl = year < currentYear ? TTL.MONTHLY_HISTORICAL : TTL.MONTHLY_CURRENT;
  const key = `report:revenue:monthly:${year}`;
  return cacheAside(key, () => reportModel.getRevenueByMonth(year), ttl);
}

// ─── Công suất phòng ─────────────────────────────────────────────────────────

async function getOccupancyByDay({ fromDate, toDate }) {
  const days = Math.round((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24));
  if (days > 90) {
    throw new ValidationError('Khoảng thời gian tối đa cho báo cáo công suất theo ngày là 90 ngày');
  }

  const key = `report:occupancy:daily:${fromDate}:${toDate}`;
  return cacheAside(key, () => reportModel.getOccupancyByDay(fromDate, toDate), TTL.DAILY_REPORT);
}

async function getOccupancyByMonth({ year }) {
  const currentYear = new Date().getFullYear();
  const ttl = year < currentYear ? TTL.MONTHLY_HISTORICAL : TTL.MONTHLY_CURRENT;
  const key = `report:occupancy:monthly:${year}`;
  return cacheAside(key, () => reportModel.getOccupancyByMonth(year), ttl);
}

// ─── Top rooms / guests ───────────────────────────────────────────────────────

async function getTopRooms({ fromDate, toDate, limit }) {
  const key = `report:top-rooms:${fromDate}:${toDate}:${limit}`;
  return cacheAside(key, () => reportModel.getTopRooms(fromDate, toDate, limit), TTL.TOP_N);
}

async function getTopGuests({ limit }) {
  const key = `report:top-guests:${limit}`;
  return cacheAside(key, () => reportModel.getTopGuests(limit), TTL.TOP_N);
}

async function getGuestsByNationality() {
  const key = 'report:guests:nationality';
  return cacheAside(key, () => reportModel.getGuestsByNationality(), TTL.TOP_N);
}

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
