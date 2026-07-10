/**
 * Cron Jobs - các tác vụ chạy định kỳ nền.
 *
 * Dùng setInterval thuần (không cần thư viện node-cron) để giữ đơn giản.
 * Với production traffic cao nên dùng Bull Queue hoặc Agenda.js.
 *
 * Danh sách jobs:
 *   1. cleanExpiredTokens     - xóa refresh token hết hạn (chạy mỗi 24h lúc 2:00 sáng)
 *   2. autoMarkNoShow         - đánh dấu no-show booking quá ngày check-in (chạy mỗi 1h)
 *   3. invalidateReportCache  - xóa cache báo cáo lỗi thời lúc nửa đêm (chạy mỗi ngày)
 */
const refreshTokenModel = require('../models/refreshToken.model');
const db = require('../config/database');
const { invalidatePattern } = require('../utils/cache');
const logger = require('../utils/logger');

// ─── Job 1: Dọn refresh token hết hạn ────────────────────────────────────────
async function cleanExpiredTokens() {
  try {
    const deleted = await refreshTokenModel.deleteExpired();
    logger.info('[Cron] Dọn refresh token hết hạn', { deleted });
  } catch (error) {
    logger.error('[Cron] cleanExpiredTokens thất bại', { error: error.message });
  }
}

// ─── Job 2: Tự động đánh dấu no-show ─────────────────────────────────────────
/**
 * Booking có check_in_date < hôm nay mà vẫn còn status 'pending' hoặc 'confirmed'
 * → tự động chuyển sang 'no_show' để tránh làm tắc nghẽn danh sách phòng cần check-in.
 *
 * Chỉ xét booking có check_in_date là HÔM QUA trở về trước (không đụng đến hôm nay
 * vì lễ tân có thể vẫn đang chờ khách đến muộn).
 */
async function autoMarkNoShow() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const updated = await db('bookings')
      .whereIn('status', ['pending', 'confirmed'])
      .where('check_in_date', '<', yesterdayStr)
      .update({
        status: 'no_show',
        updated_at: db.fn.now(),
      });

    if (updated > 0) {
      logger.info('[Cron] Tự động đánh dấu no-show', { count: updated });
    }
  } catch (error) {
    logger.error('[Cron] autoMarkNoShow thất bại', { error: error.message });
  }
}

// ─── Job 3: Xóa cache báo cáo ngày trước ─────────────────────────────────────
/**
 * Lúc nửa đêm, báo cáo ngày hôm qua đã hoàn chỉnh (không còn thay đổi),
 * nhưng cache key hôm qua vẫn còn sống. Xóa để lần query tiếp theo lấy
 * data chính xác nhất từ DB, sau đó cache lại với TTL dài hơn.
 */
async function invalidateDailyReportCache() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const d = yesterday.toISOString().slice(0, 10);

    await invalidatePattern(`report:revenue:daily:*${d}*`);
    await invalidatePattern(`report:occupancy:daily:*${d}*`);
    await invalidatePattern(`dashboard:summary:${d}`);
    logger.info('[Cron] Đã xóa cache báo cáo ngày hôm qua', { date: d });
  } catch (error) {
    logger.error('[Cron] invalidateDailyReportCache thất bại', { error: error.message });
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
/**
 * Tính milliseconds từ bây giờ đến lần đầu job chạy (theo giờ target trong ngày),
 * sau đó lặp lại mỗi `intervalMs`.
 */
function scheduleDaily(targetHour, targetMinute, intervalMs, jobFn, jobName) {
  const now = new Date();
  const first = new Date(now);
  first.setHours(targetHour, targetMinute, 0, 0);
  if (first <= now) first.setDate(first.getDate() + 1); // Nếu đã qua giờ hôm nay → hẹn ngày mai

  const delayMs = first - now;
  logger.info(`[Cron] ${jobName} sẽ chạy lần đầu lúc ${first.toLocaleString('vi-VN')}`);

  setTimeout(() => {
    jobFn();
    setInterval(jobFn, intervalMs);
  }, delayMs);
}

function startCronJobs() {
  const MS_PER_HOUR = 60 * 60 * 1000;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  // Job 1: Dọn token - chạy lúc 2:00 sáng mỗi ngày
  scheduleDaily(2, 0, MS_PER_DAY, cleanExpiredTokens, 'cleanExpiredTokens');

  // Job 2: Auto no-show - chạy mỗi giờ
  setInterval(autoMarkNoShow, MS_PER_HOUR);
  autoMarkNoShow(); // Chạy ngay lần đầu khi server khởi động

  // Job 3: Xóa cache - chạy lúc 0:05 sáng mỗi ngày (sau nửa đêm 5 phút)
  scheduleDaily(0, 5, MS_PER_DAY, invalidateDailyReportCache, 'invalidateDailyReportCache');

  logger.info('[Cron] Đã khởi động tất cả cron jobs');
}

module.exports = { startCronJobs, cleanExpiredTokens, autoMarkNoShow, invalidateDailyReportCache };
