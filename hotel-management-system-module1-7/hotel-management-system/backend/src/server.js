/**
 * Entry point của ứng dụng: khởi động HTTP server, kết nối Database/Redis,
 * và xử lý graceful shutdown khi nhận tín hiệu dừng.
 */
const app = require('./app');
const env = require('./config/env');
const db = require('./config/database');
const { connectRedis, redisClient } = require('./config/redis');
const logger = require('./utils/logger');
const { startCronJobs } = require('./jobs/cron');

let server;

async function startServer() {
  try {
    // Kiểm tra kết nối database trước khi khởi động server
    await db.raw('SELECT 1');
    logger.info('Kết nối PostgreSQL thành công');

    await connectRedis();

    server = app.listen(env.app.port, () => {
      logger.info(`Server đang chạy ở chế độ ${env.env} trên cổng ${env.app.port}`);
      // Chỉ chạy cron jobs trong môi trường thật (không chạy khi test)
      if (!env.isTest) startCronJobs();
    });
  } catch (error) {
    logger.error('Không thể khởi động server', { error: error.message });
    process.exit(1);
  }
}

/**
 * Đóng các kết nối (DB, Redis, HTTP server) một cách an toàn
 * khi nhận tín hiệu shutdown, tránh mất dữ liệu hoặc connection bị treo.
 */
async function gracefulShutdown(signal) {
  logger.info(`Nhận tín hiệu ${signal}, đang đóng server...`);
  if (server) {
    server.close(async () => {
      try {
        await db.destroy();
        if (redisClient.isOpen) await redisClient.quit();
        logger.info('Đã đóng toàn bộ kết nối, thoát ứng dụng');
        process.exit(0);
      } catch (error) {
        logger.error('Lỗi khi đóng kết nối', { error: error.message });
        process.exit(1);
      }
    });
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Bắt các lỗi không được xử lý để tránh server crash âm thầm
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

startServer();
