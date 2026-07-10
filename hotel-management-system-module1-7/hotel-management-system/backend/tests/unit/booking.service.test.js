/**
 * Unit test cho src/services/booking.service.js
 * Mock DB transaction, booking model, room model, guest model
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/booking.model');
jest.mock('../../src/models/room.model');
jest.mock('../../src/models/guest.model');
jest.mock('../../src/config/database');

const bookingModel = require('../../src/models/booking.model');
const guestModel = require('../../src/models/guest.model');
const db = require('../../src/config/database');
const bookingService = require('../../src/services/booking.service');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
} = require('../../src/errors/AppError');

// ── Mock db.transaction để chạy callback ngay (bỏ qua DB thật) ──────────────
const mockTrx = {
  // Hàm trx('table') trả về query builder fake
};
mockTrx.toString = () => 'mockTrx';

// Các hàm trên mockTrx (dùng trong transaction)
const mockTrxQuery = {
  join: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  pluck: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockResolvedValue(1),
};

beforeAll(() => {
  db.transaction = jest.fn((cb) => cb(mockTrx));
  db.fn = { now: () => new Date() };
  db.raw = jest.fn();

  // Khi gọi mockTrx('tableName') trả về mockTrxQuery
  const trxFn = jest.fn(() => mockTrxQuery);
  Object.assign(mockTrx, trxFn);
  Object.setPrototypeOf(mockTrx, Function.prototype);
  mockTrx.call = trxFn;
  // Gán hàm gọi được cho mockTrx
  Object.defineProperty(mockTrx, Symbol.hasInstance, { value: () => false });
});

// ── Data fixtures ─────────────────────────────────────────────────────────────
const mockGuest = { id: 1, full_name: 'Nguyễn Văn An' };
const mockRooms = [
  { id: 10, room_number: '201', status: 'available', base_price: 500000, is_active: true },
  { id: 11, room_number: '202', status: 'available', base_price: 500000, is_active: true },
];
const mockBooking = {
  id: 100,
  booking_code: 'BK-20260704-A1B2',
  guest_id: 1,
  created_by: 5,
  check_in_date: '2026-07-10',
  check_out_date: '2026-07-12',
  num_nights: 2,
  status: 'confirmed',
  room_amount: 1000000,
  service_amount: 0,
  discount_amount: 0,
  total_amount: 1000000,
  rooms: [
    { room_id: 10, room_number: '201' },
    { room_id: 11, room_number: '202' },
  ],
};

describe('Booking Service', () => {
  afterEach(() => jest.clearAllMocks());

  // ── calcNumNights helper (via createBooking) ─────────────────────────────
  describe('createBooking', () => {
    it('nên throw NotFoundError khi guest không tồn tại', async () => {
      guestModel.findById.mockResolvedValue(null);

      await expect(
        bookingService.createBooking(
          { guestId: 999, roomIds: [10], checkInDate: '2026-08-01', checkOutDate: '2026-08-03' },
          5
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError khi checkIn = checkOut (0 đêm)', async () => {
      guestModel.findById.mockResolvedValue(mockGuest);

      await expect(
        bookingService.createBooking(
          { guestId: 1, roomIds: [10], checkInDate: '2026-08-01', checkOutDate: '2026-08-01' },
          5
        )
      ).rejects.toThrow(ValidationError);
    });

    it('nên throw ConflictError khi phòng đã bị đặt (double-booking)', async () => {
      guestModel.findById.mockResolvedValue(mockGuest);
      // Giả lập conflict: phòng 10 đã bị đặt
      bookingModel.findConflictingRoomIds.mockResolvedValue([10]);

      // Mock trx('rooms').whereIn.pluck
      const mockRoomsQuery = { whereIn: jest.fn().mockReturnThis(), pluck: jest.fn().mockResolvedValue(['201']) };
      db.transaction.mockImplementation(async (cb) => {
        const fakeTrx = jest.fn((table) => {
          if (table === 'rooms') return mockRoomsQuery;
          return mockTrxQuery;
        });
        fakeTrx.raw = jest.fn();
        return cb(fakeTrx);
      });

      await expect(
        bookingService.createBooking(
          { guestId: 1, roomIds: [10], checkInDate: '2026-08-01', checkOutDate: '2026-08-03' },
          5
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  // ── checkIn ───────────────────────────────────────────────────────────────
  describe('checkIn', () => {
    it('nên throw NotFoundError khi booking không tồn tại', async () => {
      bookingModel.findById.mockResolvedValue(null);
      await expect(bookingService.checkIn(999, {}, 5)).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError khi booking không ở trạng thái confirmed', async () => {
      bookingModel.findById.mockResolvedValue({ ...mockBooking, status: 'checked_in' });
      await expect(bookingService.checkIn(100, {}, 5)).rejects.toThrow(ValidationError);
    });

    it('nên throw ValidationError khi booking đang pending (chưa confirmed)', async () => {
      bookingModel.findById.mockResolvedValue({ ...mockBooking, status: 'pending' });
      await expect(bookingService.checkIn(100, {}, 5)).rejects.toThrow(ValidationError);
    });

    it('nên check-in thành công khi status là confirmed', async () => {
      bookingModel.findById
        .mockResolvedValueOnce(mockBooking) // lần gọi đầu (tìm booking để validate)
        .mockResolvedValueOnce({ ...mockBooking, status: 'checked_in' }); // lần gọi cuối (return)

      bookingModel.updateStatus.mockResolvedValue({ ...mockBooking, status: 'checked_in' });

      const mockTrxFull = jest.fn((table) => {
        if (table === 'rooms') {
          return { whereIn: jest.fn().mockReturnThis(), update: jest.fn().mockResolvedValue(1) };
        }
        return mockTrxQuery;
      });
      db.transaction.mockImplementation((cb) => cb(mockTrxFull));

      const result = await bookingService.checkIn(100, {}, 5);
      expect(result.status).toBe('checked_in');
    });
  });

  // ── checkOut ──────────────────────────────────────────────────────────────
  describe('checkOut', () => {
    it('nên throw NotFoundError khi booking không tồn tại', async () => {
      bookingModel.findById.mockResolvedValue(null);
      await expect(bookingService.checkOut(999, 5)).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError khi booking chưa checked_in', async () => {
      bookingModel.findById.mockResolvedValue({ ...mockBooking, status: 'confirmed' });
      await expect(bookingService.checkOut(100, 5)).rejects.toThrow(ValidationError);
    });

    it('nên check-out thành công và cập nhật phòng → cleaning', async () => {
      const checkedInBooking = { ...mockBooking, status: 'checked_in' };
      bookingModel.findById
        .mockResolvedValueOnce(checkedInBooking)
        .mockResolvedValueOnce({ ...mockBooking, status: 'checked_out' });
      bookingModel.updateStatus.mockResolvedValue({ ...mockBooking, status: 'checked_out' });
      guestModel.incrementTotalStays.mockResolvedValue();

      const mockTrxFull = jest.fn((table) => {
        if (table === 'rooms') {
          return { whereIn: jest.fn().mockReturnThis(), update: jest.fn().mockResolvedValue(1) };
        }
        return mockTrxQuery;
      });
      db.transaction.mockImplementation((cb) => cb(mockTrxFull));

      const result = await bookingService.checkOut(100, 5);
      expect(result.status).toBe('checked_out');
      expect(guestModel.incrementTotalStays).toHaveBeenCalledWith(mockBooking.guest_id, expect.anything());
    });
  });

  // ── cancelBooking ─────────────────────────────────────────────────────────
  describe('cancelBooking', () => {
    it('nên throw NotFoundError khi booking không tồn tại', async () => {
      bookingModel.findById.mockResolvedValue(null);
      await expect(
        bookingService.cancelBooking(999, { reason: 'test reason' }, 5)
      ).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError khi huỷ booking đã checked_out', async () => {
      bookingModel.findById.mockResolvedValue({ ...mockBooking, status: 'checked_out' });
      await expect(
        bookingService.cancelBooking(100, { reason: 'test reason' }, 5)
      ).rejects.toThrow(ValidationError);
    });

    it('nên throw ValidationError khi huỷ booking đã checked_in', async () => {
      bookingModel.findById.mockResolvedValue({ ...mockBooking, status: 'checked_in' });
      await expect(
        bookingService.cancelBooking(100, { reason: 'test reason' }, 5)
      ).rejects.toThrow(ValidationError);
    });

    it('nên huỷ thành công khi booking đang confirmed', async () => {
      bookingModel.findById
        .mockResolvedValueOnce({ ...mockBooking, created_by: 5 })
        .mockResolvedValueOnce({ ...mockBooking, status: 'cancelled' });
      bookingModel.updateStatus.mockResolvedValue({ ...mockBooking, status: 'cancelled' });
      db.transaction.mockImplementation((cb) => cb(mockTrxQuery));

      const result = await bookingService.cancelBooking(
        100, { reason: 'Khách thay đổi kế hoạch' }, 5, ['booking:cancel']
      );
      expect(result.status).toBe('cancelled');
    });
  });

  // ── markNoShow ────────────────────────────────────────────────────────────
  describe('markNoShow', () => {
    it('nên throw ValidationError khi booking đã checked_in', async () => {
      bookingModel.findById.mockResolvedValue({ ...mockBooking, status: 'checked_in' });
      await expect(bookingService.markNoShow(100, 5)).rejects.toThrow(ValidationError);
    });

    it('nên đánh dấu no-show thành công', async () => {
      bookingModel.findById
        .mockResolvedValueOnce({ ...mockBooking, status: 'confirmed' })
        .mockResolvedValueOnce({ ...mockBooking, status: 'no_show' });
      bookingModel.updateStatus.mockResolvedValue({ ...mockBooking, status: 'no_show' });

      const result = await bookingService.markNoShow(100, 5);
      expect(result.status).toBe('no_show');
    });
  });

  // ── updateBooking ─────────────────────────────────────────────────────────
  describe('updateBooking', () => {
    it('nên throw ValidationError khi cập nhật booking đã cancelled', async () => {
      bookingModel.findById.mockResolvedValue({ ...mockBooking, status: 'cancelled' });
      await expect(bookingService.updateBooking(100, { numGuests: 2 })).rejects.toThrow(
        ValidationError
      );
    });

    it('nên cập nhật thành công', async () => {
      bookingModel.findById
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce({ ...mockBooking, num_guests: 2 });
      bookingModel.update.mockResolvedValue({ ...mockBooking, num_guests: 2 });

      const result = await bookingService.updateBooking(100, { numGuests: 2 });
      expect(result.num_guests).toBe(2);
    });
  });
});
