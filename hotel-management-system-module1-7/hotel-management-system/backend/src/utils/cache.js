/**
 * Cache Utility - wrapper cho Redis client.
 *
 * Cung cấp interface đơn giản (get/set/del/invalidatePattern) để các service
 * dùng mà không cần biết chi tiết Redis. Nếu Redis không khả dụng → bỏ qua
 * lỗi (fail-silently) vì cache chỉ là optimization, không phải core logic.
 *
 * Naming convention cho cache key:
 *   report:{type}:{params_hash}    → báo cáo
 *   dashboard:stats                → thống kê tổng hợp
 *   occupancy:{year}:{month}       → công suất tháng
 */
const { redisClient } = require('../config/redis');
const env = require('../config/env');
const logger = require('./logger');

/**
 * Lấy giá trị từ cache. Trả về null nếu không có hoặc Redis lỗi.
 */
async function cacheGet(key) {
  try {
    if (!redisClient.isOpen) return null;
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.warn('Cache GET thất bại, bỏ qua và lấy từ DB', { key, error: error.message });
    return null;
  }
}

/**
 * Lưu giá trị vào cache với TTL (giây).
 * @param {string} key
 * @param {*} value - sẽ được JSON.stringify tự động
 * @param {number} ttlSeconds - mặc định lấy từ env (REDIS_TTL_SECONDS)
 */
async function cacheSet(key, value, ttlSeconds = env.redis.ttlSeconds) {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.warn('Cache SET thất bại, bỏ qua', { key, error: error.message });
  }
}

/**
 * Xóa 1 key khỏi cache
 */
async function cacheDel(key) {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.del(key);
  } catch (error) {
    logger.warn('Cache DEL thất bại', { key, error: error.message });
  }
}

/**
 * Xóa tất cả key theo pattern (dùng SCAN để không block Redis).
 * Ví dụ: invalidatePattern('report:revenue:*') xóa mọi cache báo cáo doanh thu.
 *
 * Lưu ý: KEYS command bị cấm dùng trên Redis production vì block toàn bộ server.
 * SCAN là giải pháp an toàn hơn — lấy từng batch nhỏ, không block.
 */
async function invalidatePattern(pattern) {
  try {
    if (!redisClient.isOpen) return;
    let cursor = 0;
    let totalDeleted = 0;
    do {
      // eslint-disable-next-line no-await-in-loop
      const { cursor: nextCursor, keys } = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = nextCursor;
      if (keys.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await redisClient.del(keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== 0);

    if (totalDeleted > 0) {
      logger.info('Đã xóa cache theo pattern', { pattern, totalDeleted });
    }
  } catch (error) {
    logger.warn('Cache invalidatePattern thất bại', { pattern, error: error.message });
  }
}

/**
 * Wrapper "cache-aside" pattern: thử lấy từ cache → nếu miss thì gọi fetchFn → lưu vào cache.
 * @param {string} key - cache key
 * @param {Function} fetchFn - async function lấy dữ liệu từ DB
 * @param {number} ttlSeconds - thời gian cache
 */
async function cacheAside(key, fetchFn, ttlSeconds = env.redis.ttlSeconds) {
  const cached = await cacheGet(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  await cacheSet(key, data, ttlSeconds);
  return data;
}

module.exports = { cacheGet, cacheSet, cacheDel, invalidatePattern, cacheAside };
