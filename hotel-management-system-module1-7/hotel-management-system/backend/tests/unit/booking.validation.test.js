/**
 * Unit test cho booking validation schemas và bookingCode utility
 */
const {
  createBookingSchema,
  cancelBookingSchema,
  listBookingQuerySchema,
} = require('../../src/validations/booking.validation');
const { generateBookingCode } = require('../../src/utils/bookingCode');

describe('Booking Validation Schemas', () => {
  describe('createBookingSchema', () => {
    const validPayload = {
      guestId: 1,
      roomIds: [10, 11],
      checkInDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // ngày mai
      checkOutDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // 3 ngày nữa
    };

    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = createBookingSchema.validate(validPayload);
      expect(error).toBeUndefined();
    });

    it('nên fail khi thiếu guestId', () => {
      const { error } = createBookingSchema.validate({ ...validPayload, guestId: undefined });
      expect(error).toBeDefined();
    });

    it('nên fail khi roomIds rỗng', () => {
      const { error } = createBookingSchema.validate({ ...validPayload, roomIds: [] });
      expect(error).toBeDefined();
    });

    it('nên fail khi roomIds chứa phần tử trùng', () => {
      const { error } = createBookingSchema.validate({ ...validPayload, roomIds: [10, 10] });
      expect(error).toBeDefined();
    });

    it('nên fail khi checkOutDate trước checkInDate', () => {
      const { error } = createBookingSchema.validate({
        ...validPayload,
        checkOutDate: validPayload.checkInDate,
      });
      expect(error).toBeDefined();
    });

    it('nên dùng numGuests mặc định = 1 khi không truyền', () => {
      const { value } = createBookingSchema.validate(validPayload);
      expect(value.numGuests).toBe(1);
    });
  });

  describe('cancelBookingSchema', () => {
    it('nên pass với lý do hợp lệ', () => {
      const { error } = cancelBookingSchema.validate({ reason: 'Khách thay đổi kế hoạch' });
      expect(error).toBeUndefined();
    });

    it('nên fail khi lý do quá ngắn (< 5 ký tự)', () => {
      const { error } = cancelBookingSchema.validate({ reason: 'Hủy' });
      expect(error).toBeDefined();
    });

    it('nên fail khi thiếu lý do', () => {
      const { error } = cancelBookingSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  describe('listBookingQuerySchema', () => {
    it('nên dùng giá trị mặc định khi không truyền', () => {
      const { value } = listBookingQuerySchema.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
    });

    it('nên fail khi status không hợp lệ', () => {
      const { error } = listBookingQuerySchema.validate({ status: 'invalid_status' });
      expect(error).toBeDefined();
    });
  });
});

describe('BookingCode Utility', () => {
  it('nên sinh mã đúng định dạng BK-YYYYMMDD-XXXX', () => {
    const code = generateBookingCode();
    expect(code).toMatch(/^BK-\d{8}-[A-F0-9]{4}$/);
  });

  it('nên sinh mã ngẫu nhiên (2 lần gọi cho kết quả khác nhau với xác suất cao)', () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateBookingCode()));
    // Với 4 bytes hex ngẫu nhiên (65536 giá trị), xác suất trùng trong 10 lần rất thấp
    expect(codes.size).toBeGreaterThan(5);
  });
});
