/**
 * Unit test cho src/services/serviceCatalog.service.js và service.validation.js
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/service.model');

const serviceModel = require('../../src/models/service.model');
const serviceCatalogService = require('../../src/services/serviceCatalog.service');
const { ConflictError, NotFoundError } = require('../../src/errors/AppError');

const {
  createServiceSchema,
  addBookingServiceSchema,
  addPaymentSchema,
} = require('../../src/validations/service.validation');

// ─── serviceCatalog.service tests ─────────────────────────────────────────────
describe('ServiceCatalog Service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createService', () => {
    it('nên throw ConflictError nếu tên dịch vụ đã tồn tại', async () => {
      serviceModel.nameExists.mockResolvedValue(true);
      await expect(
        serviceCatalogService.createService({ name: 'Spa', category: 'spa', unitPrice: 300000 })
      ).rejects.toThrow(ConflictError);
    });

    it('nên tạo thành công khi tên chưa tồn tại', async () => {
      serviceModel.nameExists.mockResolvedValue(false);
      serviceModel.create.mockResolvedValue({ id: 1, name: 'Spa', unit_price: 300000 });

      const result = await serviceCatalogService.createService({
        name: 'Spa',
        category: 'spa',
        unitPrice: 300000,
      });
      expect(result.id).toBe(1);
      expect(serviceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Spa', unit_price: 300000 })
      );
    });
  });

  describe('updateService', () => {
    it('nên throw NotFoundError nếu dịch vụ không tồn tại', async () => {
      serviceModel.findById.mockResolvedValue(null);
      await expect(serviceCatalogService.updateService(999, {})).rejects.toThrow(NotFoundError);
    });

    it('nên throw ConflictError nếu đổi tên trùng dịch vụ khác', async () => {
      serviceModel.findById.mockResolvedValue({ id: 1, name: 'Spa' });
      serviceModel.nameExists.mockResolvedValue(true);
      await expect(
        serviceCatalogService.updateService(1, { name: 'Massage' })
      ).rejects.toThrow(ConflictError);
    });

    it('nên cập nhật thành công', async () => {
      serviceModel.findById.mockResolvedValue({ id: 1, name: 'Spa' });
      serviceModel.nameExists.mockResolvedValue(false);
      serviceModel.update.mockResolvedValue({ id: 1, name: 'Spa Plus' });

      const result = await serviceCatalogService.updateService(1, { name: 'Spa Plus' });
      expect(result.name).toBe('Spa Plus');
    });
  });

  describe('deleteService', () => {
    it('nên throw NotFoundError nếu không tồn tại', async () => {
      serviceModel.findById.mockResolvedValue(null);
      await expect(serviceCatalogService.deleteService(999)).rejects.toThrow(NotFoundError);
    });

    it('nên soft-delete thành công', async () => {
      serviceModel.findById.mockResolvedValue({ id: 1 });
      serviceModel.softDelete.mockResolvedValue();
      await serviceCatalogService.deleteService(1);
      expect(serviceModel.softDelete).toHaveBeenCalledWith(1);
    });
  });
});

// ─── service.validation tests ──────────────────────────────────────────────────
describe('Service Validation Schemas', () => {
  describe('createServiceSchema', () => {
    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = createServiceSchema.validate({
        name: 'Massage 60p',
        category: 'spa',
        unitPrice: 350000,
      });
      expect(error).toBeUndefined();
    });

    it('nên fail khi unitPrice là 0 hoặc âm', () => {
      const { error } = createServiceSchema.validate({
        name: 'Test',
        category: 'spa',
        unitPrice: -100,
      });
      expect(error).toBeDefined();
    });

    it('nên fail khi category không hợp lệ', () => {
      const { error } = createServiceSchema.validate({
        name: 'Test',
        category: 'invalid_cat',
        unitPrice: 100000,
      });
      expect(error).toBeDefined();
    });
  });

  describe('addBookingServiceSchema', () => {
    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = addBookingServiceSchema.validate({ serviceId: 1, quantity: 2 });
      expect(error).toBeUndefined();
    });

    it('nên fail khi quantity = 0', () => {
      const { error } = addBookingServiceSchema.validate({ serviceId: 1, quantity: 0 });
      expect(error).toBeDefined();
    });

    it('nên dùng quantity mặc định = 1', () => {
      const { value } = addBookingServiceSchema.validate({ serviceId: 1 });
      expect(value.quantity).toBe(1);
    });

    it('nên fail khi usedAt là tương lai', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const { error } = addBookingServiceSchema.validate({ serviceId: 1, usedAt: future });
      expect(error).toBeDefined();
    });
  });

  describe('addPaymentSchema', () => {
    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = addPaymentSchema.validate({ amount: 500000, method: 'cash' });
      expect(error).toBeUndefined();
    });

    it('nên fail khi method không hợp lệ', () => {
      const { error } = addPaymentSchema.validate({ amount: 500000, method: 'bitcoin' });
      expect(error).toBeDefined();
    });

    it('nên fail khi amount <= 0', () => {
      const { error } = addPaymentSchema.validate({ amount: 0, method: 'cash' });
      expect(error).toBeDefined();
    });
  });
});
