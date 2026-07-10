/**
 * Unit test cho src/jobs/cron.js
 */
process.env.JWT_ACCESS_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/refreshToken.model');
jest.mock('../../src/config/database');
jest.mock('../../src/utils/cache');
jest.mock('../../src/config/redis', () => ({
  redisClient: { isOpen: false },
  connectRedis: jest.fn(),
}));

const refreshTokenModel = require('../../src/models/refreshToken.model');
const db = require('../../src/config/database');
const { invalidatePattern } = require('../../src/utils/cache');
const { cleanExpiredTokens, autoMarkNoShow, invalidateDailyReportCache } = require('../../src/jobs/cron');

describe('Cron Jobs', () => {
  afterEach(() => jest.clearAllMocks());

  describe('cleanExpiredTokens', () => {
    it('nên gọi deleteExpired và không throw', async () => {
      refreshTokenModel.deleteExpired.mockResolvedValue(5);
      await expect(cleanExpiredTokens()).resolves.not.toThrow();
      expect(refreshTokenModel.deleteExpired).toHaveBeenCalledTimes(1);
    });

    it('nên bắt lỗi và không crash server', async () => {
      refreshTokenModel.deleteExpired.mockRejectedValue(new Error('DB error'));
      await expect(cleanExpiredTokens()).resolves.not.toThrow();
    });
  });

  describe('autoMarkNoShow', () => {
    it('nên update booking quá ngày check-in sang no_show', async () => {
      const mockChain = {
        whereIn: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(3),
      };
      db.mockImplementation(() => mockChain);
      db.fn = { now: () => new Date() };

      await expect(autoMarkNoShow()).resolves.not.toThrow();
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'no_show' })
      );
    });

    it('nên bắt lỗi và không crash server', async () => {
      db.mockImplementation(() => { throw new Error('DB error'); });
      await expect(autoMarkNoShow()).resolves.not.toThrow();
    });
  });

  describe('invalidateDailyReportCache', () => {
    it('nên gọi invalidatePattern đúng 3 lần', async () => {
      invalidatePattern.mockResolvedValue();
      await expect(invalidateDailyReportCache()).resolves.not.toThrow();
      expect(invalidatePattern).toHaveBeenCalledTimes(3);
    });

    it('nên bắt lỗi và không crash server', async () => {
      invalidatePattern.mockRejectedValue(new Error('Redis error'));
      await expect(invalidateDailyReportCache()).resolves.not.toThrow();
    });
  });
});
