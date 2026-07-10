/**
 * Unit test cho src/services/room.service.js
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/room.model');
jest.mock('../../src/models/roomType.model');

const roomModel = require('../../src/models/room.model');
const roomTypeModel = require('../../src/models/roomType.model');
const roomService = require('../../src/services/room.service');
const { ConflictError, NotFoundError, ValidationError } = require('../../src/errors/AppError');

describe('Room Service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createRoom', () => {
    it('nên throw ValidationError nếu roomTypeId không tồn tại', async () => {
      roomTypeModel.findById.mockResolvedValue(null);

      await expect(
        roomService.createRoom({ roomNumber: '101', roomTypeId: 999 })
      ).rejects.toThrow(ValidationError);
    });

    it('nên throw ConflictError nếu số phòng đã tồn tại', async () => {
      roomTypeModel.findById.mockResolvedValue({ id: 1, name: 'Standard' });
      roomModel.roomNumberExists.mockResolvedValue(true);

      await expect(
        roomService.createRoom({ roomNumber: '101', roomTypeId: 1 })
      ).rejects.toThrow(ConflictError);
    });

    it('nên tạo phòng thành công với dữ liệu hợp lệ', async () => {
      roomTypeModel.findById.mockResolvedValue({ id: 1, name: 'Standard' });
      roomModel.roomNumberExists.mockResolvedValue(false);
      roomModel.create.mockResolvedValue({ id: 10, room_number: '101' });

      const result = await roomService.createRoom({
        roomNumber: '101',
        roomTypeId: 1,
        floor: 1,
        status: 'available',
      });

      expect(result.id).toBe(10);
      expect(roomModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ room_number: '101', room_type_id: 1 })
      );
    });
  });

  describe('updateRoomStatus', () => {
    it('nên throw NotFoundError nếu phòng không tồn tại', async () => {
      roomModel.findById.mockResolvedValue(null);
      await expect(roomService.updateRoomStatus(1, 'cleaning')).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError khi chuyển trực tiếp occupied -> available', async () => {
      roomModel.findById.mockResolvedValue({ id: 1, status: 'occupied' });

      await expect(roomService.updateRoomStatus(1, 'available')).rejects.toThrow(
        ValidationError
      );
    });

    it('nên cho phép chuyển occupied -> cleaning', async () => {
      roomModel.findById.mockResolvedValue({ id: 1, status: 'occupied' });
      roomModel.updateStatus.mockResolvedValue({ id: 1, status: 'cleaning' });

      const result = await roomService.updateRoomStatus(1, 'cleaning');
      expect(result.status).toBe('cleaning');
    });

    it('nên cho phép chuyển cleaning -> available', async () => {
      roomModel.findById.mockResolvedValue({ id: 1, status: 'cleaning' });
      roomModel.updateStatus.mockResolvedValue({ id: 1, status: 'available' });

      const result = await roomService.updateRoomStatus(1, 'available');
      expect(result.status).toBe('available');
    });
  });

  describe('deleteRoom', () => {
    it('nên throw NotFoundError nếu phòng không tồn tại', async () => {
      roomModel.findById.mockResolvedValue(null);
      await expect(roomService.deleteRoom(1)).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError nếu phòng đang có khách', async () => {
      roomModel.findById.mockResolvedValue({ id: 1, status: 'occupied' });
      await expect(roomService.deleteRoom(1)).rejects.toThrow(ValidationError);
    });

    it('nên xóa thành công nếu phòng trống', async () => {
      roomModel.findById.mockResolvedValue({ id: 1, status: 'available' });
      roomModel.softDelete.mockResolvedValue();

      await roomService.deleteRoom(1);
      expect(roomModel.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('getAvailableRooms', () => {
    it('nên throw ValidationError nếu checkIn >= checkOut', async () => {
      await expect(
        roomService.getAvailableRooms({ checkInDate: '2026-07-10', checkOutDate: '2026-07-10' })
      ).rejects.toThrow(ValidationError);
    });

    it('nên trả về danh sách phòng trống khi ngày hợp lệ', async () => {
      roomModel.findAvailableRooms.mockResolvedValue([{ id: 1, room_number: '101' }]);

      const result = await roomService.getAvailableRooms({
        checkInDate: '2026-07-10',
        checkOutDate: '2026-07-12',
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('getAllRooms', () => {
    it('nên trả về danh sách phòng kèm pagination', async () => {
      roomModel.findAllPaginated.mockResolvedValue({ data: [{ id: 1 }], total: 1 });

      const result = await roomService.getAllRooms({ page: 1, limit: 20 });
      expect(result.rooms).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});
