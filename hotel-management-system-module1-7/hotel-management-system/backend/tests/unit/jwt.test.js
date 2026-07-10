/**
 * Unit test cho src/utils/jwt.js
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

const jwtUtil = require('../../src/utils/jwt');

describe('JWT Utility', () => {
  const payload = { sub: 1, role: 'admin' };

  describe('signAccessToken & verifyAccessToken', () => {
    it('nên ký và xác thực thành công access token hợp lệ', () => {
      const token = jwtUtil.signAccessToken(payload);
      const decoded = jwtUtil.verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.role).toBe(payload.role);
    });

    it('nên throw lỗi khi verify token bị giả mạo', () => {
      const token = jwtUtil.signAccessToken(payload);
      const tamperedToken = `${token}tampered`;
      expect(() => jwtUtil.verifyAccessToken(tamperedToken)).toThrow();
    });
  });

  describe('signRefreshToken & verifyRefreshToken', () => {
    it('nên ký và xác thực thành công refresh token hợp lệ', () => {
      const token = jwtUtil.signRefreshToken({ sub: 1 });
      const decoded = jwtUtil.verifyRefreshToken(token);
      expect(decoded.sub).toBe(1);
    });

    it('không thể dùng access secret để verify refresh token', () => {
      const token = jwtUtil.signRefreshToken({ sub: 1 });
      expect(() => jwtUtil.verifyAccessToken(token)).toThrow();
    });
  });

  describe('hashToken', () => {
    it('nên trả về cùng 1 hash cho cùng input', () => {
      const token = 'sample-refresh-token';
      expect(jwtUtil.hashToken(token)).toBe(jwtUtil.hashToken(token));
    });

    it('nên trả về hash khác nhau cho input khác nhau', () => {
      expect(jwtUtil.hashToken('token-a')).not.toBe(jwtUtil.hashToken('token-b'));
    });
  });

  describe('getExpiryDate', () => {
    it('nên tính đúng thời gian hết hạn cho đơn vị phút', () => {
      const before = Date.now();
      const expiry = jwtUtil.getExpiryDate('15m');
      const diff = expiry.getTime() - before;
      expect(diff).toBeGreaterThan(14 * 60 * 1000);
      expect(diff).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
    });

    it('nên tính đúng thời gian hết hạn cho đơn vị ngày', () => {
      const before = Date.now();
      const expiry = jwtUtil.getExpiryDate('7d');
      const diff = expiry.getTime() - before;
      expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    });

    it('nên throw lỗi khi định dạng không hợp lệ', () => {
      expect(() => jwtUtil.getExpiryDate('invalid')).toThrow();
    });
  });
});
