/**
 * Unit test cho src/utils/cache.js
 */
process.env.JWT_ACCESS_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    isOpen: true,
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
  },
  connectRedis: jest.fn(),
}));

const { redisClient } = require('../../src/config/redis');
const { cacheGet, cacheSet, cacheDel, invalidatePattern, cacheAside } = require('../../src/utils/cache');

describe('Cache Utility', () => {
  afterEach(() => jest.clearAllMocks());

  describe('cacheGet', () => {
    it('nên trả về null khi key không tồn tại', async () => {
      redisClient.get.mockResolvedValue(null);
      expect(await cacheGet('missing:key')).toBeNull();
    });

    it('nên parse JSON khi key tồn tại', async () => {
      const data = { total: 100 };
      redisClient.get.mockResolvedValue(JSON.stringify(data));
      expect(await cacheGet('some:key')).toEqual(data);
    });

    it('nên trả về null khi Redis lỗi (không throw)', async () => {
      redisClient.get.mockRejectedValue(new Error('Redis down'));
      expect(await cacheGet('some:key')).toBeNull();
    });

    it('nên trả về null khi isOpen = false', async () => {
      redisClient.isOpen = false;
      expect(await cacheGet('any:key')).toBeNull();
      redisClient.isOpen = true;
    });
  });

  describe('cacheSet', () => {
    it('nên gọi setEx với đúng tham số', async () => {
      redisClient.setEx.mockResolvedValue('OK');
      const data = [{ month: 1 }];
      await cacheSet('report:key', data, 600);
      expect(redisClient.setEx).toHaveBeenCalledWith('report:key', 600, JSON.stringify(data));
    });

    it('nên không throw khi Redis lỗi', async () => {
      redisClient.setEx.mockRejectedValue(new Error('Redis error'));
      await expect(cacheSet('key', 'val', 60)).resolves.not.toThrow();
    });
  });

  describe('cacheDel', () => {
    it('nên gọi del đúng key', async () => {
      redisClient.del.mockResolvedValue(1);
      await cacheDel('test:key');
      expect(redisClient.del).toHaveBeenCalledWith('test:key');
    });

    it('nên không throw khi Redis lỗi', async () => {
      redisClient.del.mockRejectedValue(new Error('Redis error'));
      await expect(cacheDel('key')).resolves.not.toThrow();
    });
  });

  describe('invalidatePattern', () => {
    it('nên scan và xóa key khớp pattern', async () => {
      redisClient.scan
        .mockResolvedValueOnce({ cursor: 5, keys: ['report:k1'] })
        .mockResolvedValueOnce({ cursor: 0, keys: ['report:k2'] });
      redisClient.del.mockResolvedValue(1);
      await invalidatePattern('report:*');
      expect(redisClient.del).toHaveBeenCalledTimes(2);
    });

    it('nên không gọi del khi không có key nào', async () => {
      redisClient.scan.mockResolvedValue({ cursor: 0, keys: [] });
      await invalidatePattern('none:*');
      expect(redisClient.del).not.toHaveBeenCalled();
    });

    it('nên không throw khi Redis lỗi', async () => {
      redisClient.scan.mockRejectedValue(new Error('Scan error'));
      await expect(invalidatePattern('any:*')).resolves.not.toThrow();
    });
  });

  describe('cacheAside', () => {
    it('nên trả về từ cache khi hit, không gọi fetchFn', async () => {
      const data = { rooms: 25 };
      redisClient.get.mockResolvedValue(JSON.stringify(data));
      const fetchFn = jest.fn();
      const result = await cacheAside('hit:key', fetchFn, 300);
      expect(result).toEqual(data);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('nên gọi fetchFn và lưu cache khi miss', async () => {
      redisClient.get.mockResolvedValue(null);
      redisClient.setEx.mockResolvedValue('OK');
      const fetchFn = jest.fn().mockResolvedValue({ rooms: 25 });
      const result = await cacheAside('miss:key', fetchFn, 300);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ rooms: 25 });
      expect(redisClient.setEx).toHaveBeenCalled();
    });

    it('nên trả về data từ fetchFn ngay cả khi cache lỗi', async () => {
      redisClient.get.mockRejectedValue(new Error('Redis down'));
      redisClient.setEx.mockRejectedValue(new Error('Redis down'));
      const fetchFn = jest.fn().mockResolvedValue({ rooms: 10 });
      const result = await cacheAside('error:key', fetchFn, 300);
      expect(result).toEqual({ rooms: 10 });
    });
  });
});
