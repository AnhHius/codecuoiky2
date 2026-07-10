/**
 * Unit test cho src/validations/auth.validation.js
 */
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require('../../src/validations/auth.validation');

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    const validPayload = {
      fullName: 'Nguyễn Văn A',
      email: 'test@hotel.com',
      password: 'Password123',
      phone: '0901234567',
      roleId: 1,
    };

    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = registerSchema.validate(validPayload);
      expect(error).toBeUndefined();
    });

    it('nên fail khi thiếu email', () => {
      const { error } = registerSchema.validate({ ...validPayload, email: undefined });
      expect(error).toBeDefined();
    });

    it('nên fail khi email sai định dạng', () => {
      const { error } = registerSchema.validate({ ...validPayload, email: 'not-an-email' });
      expect(error).toBeDefined();
    });

    it('nên fail khi password không đủ mạnh (thiếu chữ hoa)', () => {
      const { error } = registerSchema.validate({ ...validPayload, password: 'password123' });
      expect(error).toBeDefined();
    });

    it('nên fail khi password quá ngắn', () => {
      const { error } = registerSchema.validate({ ...validPayload, password: 'Pa1' });
      expect(error).toBeDefined();
    });

    it('nên fail khi thiếu roleId', () => {
      const { error } = registerSchema.validate({ ...validPayload, roleId: undefined });
      expect(error).toBeDefined();
    });

    it('nên pass khi không có phone (optional)', () => {
      const { error } = registerSchema.validate({ ...validPayload, phone: '' });
      expect(error).toBeUndefined();
    });
  });

  describe('loginSchema', () => {
    it('nên pass với email và password hợp lệ', () => {
      const { error } = loginSchema.validate({ email: 'a@b.com', password: 'anything' });
      expect(error).toBeUndefined();
    });

    it('nên fail khi thiếu password', () => {
      const { error } = loginSchema.validate({ email: 'a@b.com' });
      expect(error).toBeDefined();
    });
  });

  describe('changePasswordSchema', () => {
    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = changePasswordSchema.validate({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass123',
      });
      expect(error).toBeUndefined();
    });

    it('nên fail khi newPassword không đủ mạnh', () => {
      const { error } = changePasswordSchema.validate({
        currentPassword: 'OldPass123',
        newPassword: 'weak',
      });
      expect(error).toBeDefined();
    });
  });
});
