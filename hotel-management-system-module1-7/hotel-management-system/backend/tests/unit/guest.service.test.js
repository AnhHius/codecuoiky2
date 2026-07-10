/**
 * Unit test cho src/services/guest.service.js
 * Mock toàn bộ tầng model để test thuần business logic
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/guest.model');

const guestModel = require('../../src/models/guest.model');
const guestService = require('../../src/services/guest.service');
const { ConflictError, NotFoundError } = require('../../src/errors/AppError');

const mockGuest = {
  id: 1,
  full_name: 'Nguyễn Văn An',
  email: 'an@test.com',
  phone: '0901111111',
  id_type: 'cccd',
  id_number: '001090001234',
  total_stays: 0,
};

describe('Guest Service', () => {
  afterEach(() => jest.clearAllMocks());

  // ===== createGuest =====
  describe('createGuest', () => {
    it('nên throw ConflictError nếu email đã tồn tại', async () => {
      guestModel.findByEmail.mockResolvedValue({ id: 99 });

      await expect(
        guestService.createGuest({ fullName: 'Test', phone: '0900000000', email: 'an@test.com' })
      ).rejects.toThrow(ConflictError);
    });

    it('nên throw ConflictError nếu giấy tờ trùng với guest khác', async () => {
      guestModel.findByEmail.mockResolvedValue(null);
      guestModel.findDuplicateIdentity.mockResolvedValue({ id: 88 });

      await expect(
        guestService.createGuest({
          fullName: 'Test',
          phone: '0900000000',
          idType: 'cccd',
          idNumber: '001090001234',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('nên tạo guest thành công khi không trùng dữ liệu', async () => {
      guestModel.findByEmail.mockResolvedValue(null);
      guestModel.findDuplicateIdentity.mockResolvedValue(null);
      guestModel.create.mockResolvedValue(mockGuest);

      const result = await guestService.createGuest({
        fullName: 'Nguyễn Văn An',
        phone: '0901111111',
        email: 'an@test.com',
        idType: 'cccd',
        idNumber: '001090001234',
      });

      expect(result.id).toBe(1);
      expect(guestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'Nguyễn Văn An', phone: '0901111111' })
      );
    });

    it('nên bỏ qua kiểm tra email nếu không có email', async () => {
      guestModel.findDuplicateIdentity.mockResolvedValue(null);
      guestModel.create.mockResolvedValue({ ...mockGuest, email: null });

      await guestService.createGuest({ fullName: 'Test', phone: '0901111111' });
      expect(guestModel.findByEmail).not.toHaveBeenCalled();
    });

    it('nên chuyển chuỗi rỗng thành null khi insert vào DB', async () => {
      guestModel.findByEmail.mockResolvedValue(null);
      guestModel.create.mockResolvedValue(mockGuest);

      await guestService.createGuest({
        fullName: 'Test',
        phone: '0900000000',
        email: '',
        notes: '',
      });

      expect(guestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: null, notes: null })
      );
    });
  });

  // ===== updateGuest =====
  describe('updateGuest', () => {
    it('nên throw NotFoundError nếu guest không tồn tại', async () => {
      guestModel.findById.mockResolvedValue(null);
      await expect(guestService.updateGuest(999, { fullName: 'X' })).rejects.toThrow(NotFoundError);
    });

    it('nên throw ConflictError nếu đổi email trùng guest khác', async () => {
      guestModel.findById.mockResolvedValue({ ...mockGuest, email: 'old@test.com' });
      guestModel.findByEmail.mockResolvedValue({ id: 99 }); // email tồn tại ở guest khác

      await expect(
        guestService.updateGuest(1, { email: 'new@test.com' })
      ).rejects.toThrow(ConflictError);
    });

    it('không throw khi email không thay đổi so với email hiện tại', async () => {
      guestModel.findById.mockResolvedValue(mockGuest);
      guestModel.update.mockResolvedValue(mockGuest);

      // email giống email hiện tại -> không kiểm tra trùng
      await expect(
        guestService.updateGuest(1, { email: mockGuest.email })
      ).resolves.not.toThrow();
      expect(guestModel.findByEmail).not.toHaveBeenCalled();
    });

    it('nên cập nhật thành công với dữ liệu hợp lệ', async () => {
      guestModel.findById.mockResolvedValue(mockGuest);
      guestModel.update.mockResolvedValue({ ...mockGuest, full_name: 'Nguyễn Văn B' });

      const result = await guestService.updateGuest(1, { fullName: 'Nguyễn Văn B' });
      expect(result.full_name).toBe('Nguyễn Văn B');
    });
  });

  // ===== getGuestById =====
  describe('getGuestById', () => {
    it('nên throw NotFoundError nếu không tìm thấy', async () => {
      guestModel.findById.mockResolvedValue(null);
      await expect(guestService.getGuestById(999)).rejects.toThrow(NotFoundError);
    });

    it('nên trả về guest khi tồn tại', async () => {
      guestModel.findById.mockResolvedValue(mockGuest);
      const result = await guestService.getGuestById(1);
      expect(result.id).toBe(1);
    });
  });

  // ===== getAllGuests =====
  describe('getAllGuests', () => {
    it('nên trả về danh sách và thông tin phân trang', async () => {
      guestModel.findAllPaginated.mockResolvedValue({
        data: [mockGuest],
        total: 1,
      });

      const result = await guestService.getAllGuests({ page: 1, limit: 20 });
      expect(result.guests).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  // ===== getGuestStayHistory =====
  describe('getGuestStayHistory', () => {
    it('nên throw NotFoundError nếu guest không tồn tại', async () => {
      guestModel.findById.mockResolvedValue(null);
      await expect(guestService.getGuestStayHistory(999, {})).rejects.toThrow(NotFoundError);
    });

    it('nên trả về guest + lịch sử lưu trú', async () => {
      guestModel.findById.mockResolvedValue(mockGuest);
      guestModel.findStayHistory.mockResolvedValue({
        data: [{ id: 10, booking_code: 'BK001' }],
        total: 1,
      });

      const result = await guestService.getGuestStayHistory(1, { page: 1, limit: 10 });
      expect(result.guest.id).toBe(1);
      expect(result.history).toHaveLength(1);
    });
  });
});
