/**
 * Unit test cho src/validations/guest.validation.js
 */
const {
  createGuestSchema,
  updateGuestSchema,
  listGuestQuerySchema,
} = require('../../src/validations/guest.validation');

describe('Guest Validation Schemas', () => {
  describe('createGuestSchema', () => {
    const validPayload = {
      fullName: 'Nguyễn Văn An',
      phone: '0901111111',
      email: 'an@test.com',
      gender: 'male',
      idType: 'cccd',
      idNumber: '001090001234',
    };

    it('nên pass với dữ liệu đầy đủ hợp lệ', () => {
      const { error } = createGuestSchema.validate(validPayload);
      expect(error).toBeUndefined();
    });

    it('nên pass khi chỉ có họ tên và phone (email là optional)', () => {
      const { error } = createGuestSchema.validate({
        fullName: 'Test',
        phone: '0901111111',
      });
      expect(error).toBeUndefined();
    });

    it('nên fail khi thiếu phone (trường bắt buộc)', () => {
      const { error } = createGuestSchema.validate({ fullName: 'Test' });
      expect(error).toBeDefined();
    });

    it('nên fail khi email không đúng định dạng', () => {
      const { error } = createGuestSchema.validate({ ...validPayload, email: 'not-an-email' });
      expect(error).toBeDefined();
    });

    it('nên fail khi gender không thuộc danh sách hợp lệ', () => {
      const { error } = createGuestSchema.validate({ ...validPayload, gender: 'unknown' });
      expect(error).toBeDefined();
    });

    it('nên fail khi có idNumber nhưng thiếu idType', () => {
      const { error } = createGuestSchema.validate({
        fullName: 'Test',
        phone: '0900000000',
        idNumber: '001090001234',
        // thiếu idType
      });
      expect(error).toBeDefined();
    });

    it('nên fail khi dateOfBirth là ngày trong tương lai', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const { error } = createGuestSchema.validate({ ...validPayload, dateOfBirth: futureDate });
      expect(error).toBeDefined();
    });

    it('nên pass với dateOfBirth hợp lệ trong quá khứ', () => {
      const { error } = createGuestSchema.validate({
        ...validPayload,
        dateOfBirth: '1990-05-15',
      });
      expect(error).toBeUndefined();
    });

    it('nên fail khi phone không hợp lệ (quá ngắn)', () => {
      const { error } = createGuestSchema.validate({ ...validPayload, phone: '123' });
      expect(error).toBeDefined();
    });
  });

  describe('updateGuestSchema', () => {
    it('nên pass khi chỉ update 1 trường', () => {
      const { error } = updateGuestSchema.validate({ fullName: 'New Name' });
      expect(error).toBeUndefined();
    });

    it('nên pass khi object rỗng (không update gì)', () => {
      const { error } = updateGuestSchema.validate({});
      expect(error).toBeUndefined();
    });
  });

  describe('listGuestQuerySchema', () => {
    it('nên dùng giá trị mặc định khi thiếu page và limit', () => {
      const { value } = listGuestQuerySchema.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
    });

    it('nên pass khi có search string', () => {
      const { error } = listGuestQuerySchema.validate({ search: 'Nguyễn' });
      expect(error).toBeUndefined();
    });
  });
});
