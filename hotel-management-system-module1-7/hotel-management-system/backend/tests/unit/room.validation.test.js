/**
 * Unit test cho src/validations/room.validation.js
 */
const {
  createRoomTypeSchema,
  createRoomSchema,
  availabilityQuerySchema,
} = require('../../src/validations/room.validation');

describe('Room Validation Schemas', () => {
  describe('createRoomTypeSchema', () => {
    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = createRoomTypeSchema.validate({
        name: 'Deluxe',
        basePrice: 800000,
        maxOccupancy: 2,
      });
      expect(error).toBeUndefined();
    });

    it('nên fail khi basePrice âm hoặc bằng 0', () => {
      const { error } = createRoomTypeSchema.validate({
        name: 'Deluxe',
        basePrice: 0,
        maxOccupancy: 2,
      });
      expect(error).toBeDefined();
    });

    it('nên fail khi maxOccupancy nhỏ hơn 1', () => {
      const { error } = createRoomTypeSchema.validate({
        name: 'Deluxe',
        basePrice: 100,
        maxOccupancy: 0,
      });
      expect(error).toBeDefined();
    });
  });

  describe('createRoomSchema', () => {
    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = createRoomSchema.validate({ roomNumber: '101', roomTypeId: 1 });
      expect(error).toBeUndefined();
    });

    it('nên fail khi status không nằm trong danh sách hợp lệ', () => {
      const { error } = createRoomSchema.validate({
        roomNumber: '101',
        roomTypeId: 1,
        status: 'invalid_status',
      });
      expect(error).toBeDefined();
    });

    it('nên fail khi thiếu roomTypeId', () => {
      const { error } = createRoomSchema.validate({ roomNumber: '101' });
      expect(error).toBeDefined();
    });
  });

  describe('availabilityQuerySchema', () => {
    it('nên pass khi checkOutDate sau checkInDate', () => {
      const { error } = availabilityQuerySchema.validate({
        checkInDate: '2026-07-10',
        checkOutDate: '2026-07-12',
      });
      expect(error).toBeUndefined();
    });

    it('nên fail khi checkOutDate trước hoặc bằng checkInDate', () => {
      const { error } = availabilityQuerySchema.validate({
        checkInDate: '2026-07-10',
        checkOutDate: '2026-07-10',
      });
      expect(error).toBeDefined();
    });
  });
});
