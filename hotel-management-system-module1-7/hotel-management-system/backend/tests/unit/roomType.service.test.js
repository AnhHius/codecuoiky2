/**
 * Unit test cho src/services/roomType.service.js
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/roomType.model');

const roomTypeModel = require('../../src/models/roomType.model');
const roomTypeService = require('../../src/services/roomType.service');
const { ConflictError, NotFoundError, ValidationError } = require('../../src/errors/AppError');

describe('RoomType Service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createRoomType', () => {
    it('nên throw ConflictError nếu tên loại phòng đã tồn tại', async () => {
      roomTypeModel.nameExists.mockResolvedValue(true);

      await expect(
        roomTypeService.createRoomType({ name: 'Standard', basePrice: 500000, maxOccupancy: 2 })
      ).rejects.toThrow(ConflictError);
    });

    it('nên tạo thành công khi tên chưa tồn tại', async () => {
      roomTypeModel.nameExists.mockResolvedValue(false);
      roomTypeModel.create.mockResolvedValue({ id: 1, name: 'Deluxe' });

      const result = await roomTypeService.createRoomType({
        name: 'Deluxe',
        basePrice: 800000,
        maxOccupancy: 2,
        numBeds: 1,
        amenities: ['wifi'],
      });

      expect(roomTypeModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Deluxe', base_price: 800000 })
      );
      expect(result.id).toBe(1);
    });
  });

  describe('updateRoomType', () => {
    it('nên throw NotFoundError nếu loại phòng không tồn tại', async () => {
      roomTypeModel.findById.mockResolvedValue(null);

      await expect(roomTypeService.updateRoomType(999, { name: 'X' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('nên throw ConflictError nếu đổi tên trùng với loại phòng khác', async () => {
      roomTypeModel.findById.mockResolvedValue({ id: 1, name: 'Standard' });
      roomTypeModel.nameExists.mockResolvedValue(true);

      await expect(roomTypeService.updateRoomType(1, { name: 'Deluxe' })).rejects.toThrow(
        ConflictError
      );
    });

    it('nên cập nhật thành công với dữ liệu hợp lệ', async () => {
      roomTypeModel.findById.mockResolvedValue({ id: 1, name: 'Standard' });
      roomTypeModel.nameExists.mockResolvedValue(false);
      roomTypeModel.update.mockResolvedValue({ id: 1, name: 'Standard Plus' });

      const result = await roomTypeService.updateRoomType(1, { name: 'Standard Plus' });
      expect(result.name).toBe('Standard Plus');
    });
  });

  describe('deleteRoomType', () => {
    it('nên throw NotFoundError nếu không tồn tại', async () => {
      roomTypeModel.findById.mockResolvedValue(null);
      await expect(roomTypeService.deleteRoomType(1)).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError nếu vẫn còn phòng thuộc loại này', async () => {
      roomTypeModel.findById.mockResolvedValue({ id: 1 });
      roomTypeModel.countRoomsUsingType.mockResolvedValue(5);

      await expect(roomTypeService.deleteRoomType(1)).rejects.toThrow(ValidationError);
    });

    it('nên xóa thành công khi không còn phòng nào', async () => {
      roomTypeModel.findById.mockResolvedValue({ id: 1 });
      roomTypeModel.countRoomsUsingType.mockResolvedValue(0);
      roomTypeModel.softDelete.mockResolvedValue();

      await roomTypeService.deleteRoomType(1);
      expect(roomTypeModel.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('getRoomTypeById', () => {
    it('nên throw NotFoundError nếu không tồn tại', async () => {
      roomTypeModel.findById.mockResolvedValue(null);
      await expect(roomTypeService.getRoomTypeById(1)).rejects.toThrow(NotFoundError);
    });

    it('nên trả về dữ liệu khi tồn tại', async () => {
      roomTypeModel.findById.mockResolvedValue({ id: 1, name: 'Standard' });
      const result = await roomTypeService.getRoomTypeById(1);
      expect(result.name).toBe('Standard');
    });
  });
});
