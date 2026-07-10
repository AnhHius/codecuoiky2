/**
 * Unit test cho src/services/auth.service.js
 * Mock toàn bộ tầng model và jwt utility để test thuần business logic,
 * không phụ thuộc vào kết nối database thật.
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/user.model');
jest.mock('../../src/models/refreshToken.model');
jest.mock('bcrypt');

const bcrypt = require('bcrypt');
const userModel = require('../../src/models/user.model');
const refreshTokenModel = require('../../src/models/refreshToken.model');
const authService = require('../../src/services/auth.service');
const { ConflictError, UnauthorizedError, ValidationError } = require('../../src/errors/AppError');

describe('Auth Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('nên throw ConflictError nếu email đã tồn tại', async () => {
      userModel.emailExists.mockResolvedValue(true);

      await expect(
        authService.register({
          fullName: 'Test User',
          email: 'exist@hotel.com',
          password: 'Password123',
          roleId: 1,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('nên tạo user thành công khi email chưa tồn tại', async () => {
      userModel.emailExists.mockResolvedValue(false);
      bcrypt.hash.mockResolvedValue('hashed_password');
      userModel.create.mockResolvedValue({ id: 1, email: 'new@hotel.com' });

      const result = await authService.register({
        fullName: 'New User',
        email: 'new@hotel.com',
        password: 'Password123',
        roleId: 2,
      });

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@hotel.com', password_hash: 'hashed_password' })
      );
      expect(result.id).toBe(1);
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 1,
      email: 'admin@hotel.com',
      password_hash: 'hashed',
      is_active: true,
      role_name: 'admin',
      permissions: ['room:read'],
    };

    it('nên throw UnauthorizedError nếu user không tồn tại', async () => {
      userModel.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'notfound@hotel.com', password: 'x' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('nên throw UnauthorizedError nếu tài khoản bị khóa', async () => {
      userModel.findByEmail.mockResolvedValue({ ...mockUser, is_active: false });

      await expect(
        authService.login({ email: mockUser.email, password: 'x' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('nên throw UnauthorizedError nếu sai mật khẩu', async () => {
      userModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: mockUser.email, password: 'wrong' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('nên đăng nhập thành công và trả về accessToken + refreshToken', async () => {
      userModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      userModel.findByIdWithRoleAndPermissions.mockResolvedValue(mockUser);
      refreshTokenModel.create.mockResolvedValue({ id: 1 });
      userModel.updateLastLogin.mockResolvedValue();

      const result = await authService.login({ email: mockUser.email, password: 'correct' });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.password_hash).toBeUndefined(); // Không lộ password hash
      expect(userModel.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('changePassword', () => {
    it('nên throw ValidationError nếu mật khẩu hiện tại không đúng', async () => {
      userModel.findById.mockResolvedValue({ id: 1, password_hash: 'hashed' });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.changePassword(1, { currentPassword: 'wrong', newPassword: 'NewPass123' })
      ).rejects.toThrow(ValidationError);
    });

    it('nên đổi mật khẩu thành công và thu hồi toàn bộ refresh token cũ', async () => {
      userModel.findById.mockResolvedValue({ id: 1, password_hash: 'hashed' });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new_hashed');
      userModel.updatePassword.mockResolvedValue();
      refreshTokenModel.revokeAllByUserId.mockResolvedValue();

      await authService.changePassword(1, {
        currentPassword: 'correct',
        newPassword: 'NewPass123',
      });

      expect(userModel.updatePassword).toHaveBeenCalledWith(1, 'new_hashed');
      expect(refreshTokenModel.revokeAllByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('logout', () => {
    it('không làm gì nếu không có refreshToken', async () => {
      await authService.logout(null);
      expect(refreshTokenModel.revokeByTokenHash).not.toHaveBeenCalled();
    });

    it('nên thu hồi refreshToken khi có token hợp lệ', async () => {
      refreshTokenModel.revokeByTokenHash.mockResolvedValue();
      await authService.logout('some-refresh-token');
      expect(refreshTokenModel.revokeByTokenHash).toHaveBeenCalled();
    });
  });
});
