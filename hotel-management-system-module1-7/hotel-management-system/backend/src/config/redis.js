/**
 * Khởi tạo Redis client dùng cho caching (báo cáo, session, rate-limit nâng cao...)
 * Sử dụng package "redis" v4 (Promise-based).
 */
const { createClient } = require('redis');
const env = require('./env');
const logger = require('../utils/logger');

const redisClient = createClient({
  socket: {
    host: env.redis.host,
    port: env.redis.port,
  },
  password: env.redis.password,
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

/**
 * Kết nối Redis - gọi 1 lần khi khởi động server.
 * Không throw lỗi để tránh sập toàn bộ app nếu Redis tạm thời không khả dụng;
 * cache chỉ là optimization, không phải core dependency.
 */
async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    logger.error('Không thể kết nối Redis, ứng dụng sẽ chạy không có cache', {
      error: error.message,
    });
  }
}

module.exports = { redisClient, connectRedis };
