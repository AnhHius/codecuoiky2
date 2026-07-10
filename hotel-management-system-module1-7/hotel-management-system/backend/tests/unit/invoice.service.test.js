/**
 * Unit test cho src/services/invoice.service.js
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/invoice.model');
jest.mock('../../src/models/booking.model');
jest.mock('../../src/config/database');

const invoiceModel = require('../../src/models/invoice.model');
const bookingModel = require('../../src/models/booking.model');
const db = require('../../src/config/database');
const invoiceService = require('../../src/services/invoice.service');
const { NotFoundError, ConflictError, ValidationError } = require('../../src/errors/AppError');

const mockBooking = {
  id: 100,
  booking_code: 'BK-20260704-A1B2',
  status: 'checked_out',
  room_amount: 1000000,
  service_amount: 100000,
  discount_amount: 0,
  total_amount: 1100000,
};

const mockInvoice = {
  id: 1,
  invoice_number: 'INV-20260704-AB12',
  booking_id: 100,
  total_amount: 1100000,
  paid_amount: 0,
  status: 'unpaid',
};

beforeAll(() => {
  const mockTrx = jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(1),
  }));
  db.transaction = jest.fn((cb) => cb(mockTrx));
});

describe('Invoice Service', () => {
  afterEach(() => jest.clearAllMocks());

  // ── createInvoice ──────────────────────────────────────────────────────────
  describe('createInvoice', () => {
    it('nên throw NotFoundError khi booking không tồn tại', async () => {
      bookingModel.findById.mockResolvedValue(null);
      await expect(invoiceService.createInvoice(999, 1)).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError khi booking đã bị huỷ', async () => {
      bookingModel.findById.mockResolvedValue({ ...mockBooking, status: 'cancelled' });
      await expect(invoiceService.createInvoice(100, 1)).rejects.toThrow(ValidationError);
    });

    it('nên throw ConflictError khi hóa đơn đã tồn tại', async () => {
      bookingModel.findById.mockResolvedValue(mockBooking);
      invoiceModel.findByBookingId.mockResolvedValue(mockInvoice);
      await expect(invoiceService.createInvoice(100, 1)).rejects.toThrow(ConflictError);
    });

    it('nên phát hành hóa đơn thành công', async () => {
      bookingModel.findById.mockResolvedValue(mockBooking);
      invoiceModel.findByBookingId.mockResolvedValue(null);
      invoiceModel.generateInvoiceNumber.mockReturnValue('INV-20260704-AB12');
      invoiceModel.create.mockResolvedValue(mockInvoice);
      invoiceModel.findById.mockResolvedValue({ ...mockInvoice, payments: [] });

      // Mock db như một function trả về chainable query builder
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null), // Không có invoice trùng số
      };
      db.mockImplementation(() => mockQuery);

      const result = await invoiceService.createInvoice(100, 5, 'Ghi chú test');
      expect(result).toBeDefined();
      expect(invoiceModel.create).toHaveBeenCalled();
    });
  });

  // ── addPayment ─────────────────────────────────────────────────────────────
  describe('addPayment', () => {
    it('nên throw NotFoundError khi hóa đơn không tồn tại', async () => {
      invoiceModel.findById.mockResolvedValue(null);
      await expect(
        invoiceService.addPayment(999, { amount: 100000, method: 'cash' }, 1)
      ).rejects.toThrow(NotFoundError);
    });

    it('nên throw ValidationError khi hóa đơn đã thanh toán đủ', async () => {
      invoiceModel.findById.mockResolvedValue({ ...mockInvoice, status: 'paid', paid_amount: 1100000 });
      await expect(
        invoiceService.addPayment(1, { amount: 100000, method: 'cash' }, 1)
      ).rejects.toThrow(ValidationError);
    });

    it('nên throw ValidationError khi thanh toán vượt quá số tiền còn lại', async () => {
      invoiceModel.findById.mockResolvedValue({ ...mockInvoice, paid_amount: 1000000, total_amount: 1100000 });
      await expect(
        invoiceService.addPayment(1, { amount: 200000, method: 'cash' }, 1)
      ).rejects.toThrow(ValidationError);
    });

    it('nên ghi nhận thanh toán thành công và cập nhật trạng thái hóa đơn', async () => {
      invoiceModel.findById
        .mockResolvedValueOnce({ ...mockInvoice, paid_amount: 0, total_amount: 1100000 })
        .mockResolvedValueOnce({ ...mockInvoice, paid_amount: 1100000, status: 'paid' });

      const mockTrxFull = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        sum: jest.fn().mockResolvedValue([{ total: '1100000' }]),
      }));
      db.transaction.mockImplementation((cb) => cb(mockTrxFull));

      invoiceModel.addPayment.mockResolvedValue({ id: 1 });
      invoiceModel.sumPaidAmount.mockResolvedValue(1100000);
      invoiceModel.update.mockResolvedValue({ ...mockInvoice, status: 'paid' });

      await invoiceService.addPayment(1, { amount: 1100000, method: 'cash' }, 5);
      expect(invoiceModel.addPayment).toHaveBeenCalled();
    });
  });

  describe('getInvoiceById', () => {
    beforeEach(() => {
      invoiceModel.findById.mockReset();
    });

    it('nên throw NotFoundError khi không tìm thấy', async () => {
      invoiceModel.findById.mockResolvedValue(null);
      await expect(invoiceService.getInvoiceById(999)).rejects.toThrow(NotFoundError);
    });

    it('nên trả về hóa đơn khi tồn tại', async () => {
      invoiceModel.findById.mockResolvedValue({ ...mockInvoice, payments: [] });
      const result = await invoiceService.getInvoiceById(1);
      expect(result.id).toBe(1);
    });
  });
});
