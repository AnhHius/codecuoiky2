/**
 * Unit test cho src/validations/report.validation.js
 */
const {
  dateRangeSchema,
  monthlyReportSchema,
  topRoomsSchema,
  topGuestsSchema,
} = require('../../src/validations/report.validation');

describe('Report Validation Schemas', () => {
  describe('dateRangeSchema', () => {
    it('nên pass khi fromDate <= toDate', () => {
      const { error } = dateRangeSchema.validate({
        fromDate: '2026-07-01',
        toDate: '2026-07-31',
      });
      expect(error).toBeUndefined();
    });

    it('nên pass khi fromDate = toDate (cùng ngày)', () => {
      const { error } = dateRangeSchema.validate({
        fromDate: '2026-07-10',
        toDate: '2026-07-10',
      });
      expect(error).toBeUndefined();
    });

    it('nên fail khi toDate < fromDate', () => {
      const { error } = dateRangeSchema.validate({
        fromDate: '2026-07-31',
        toDate: '2026-07-01',
      });
      expect(error).toBeDefined();
    });

    it('nên fail khi thiếu fromDate', () => {
      const { error } = dateRangeSchema.validate({ toDate: '2026-07-31' });
      expect(error).toBeDefined();
    });

    it('nên fail khi thiếu toDate', () => {
      const { error } = dateRangeSchema.validate({ fromDate: '2026-07-01' });
      expect(error).toBeDefined();
    });

    it('nên fail khi định dạng ngày không hợp lệ', () => {
      const { error } = dateRangeSchema.validate({
        fromDate: '01-07-2026',
        toDate: '31-07-2026',
      });
      expect(error).toBeDefined();
    });
  });

  describe('monthlyReportSchema', () => {
    it('nên pass với năm hợp lệ', () => {
      const { error } = monthlyReportSchema.validate({ year: 2026 });
      expect(error).toBeUndefined();
    });

    it('nên dùng năm hiện tại làm mặc định', () => {
      const { value } = monthlyReportSchema.validate({});
      expect(value.year).toBe(new Date().getFullYear());
    });

    it('nên fail khi năm < 2020', () => {
      const { error } = monthlyReportSchema.validate({ year: 2019 });
      expect(error).toBeDefined();
    });
  });

  describe('topRoomsSchema', () => {
    it('nên pass với dữ liệu hợp lệ', () => {
      const { error } = topRoomsSchema.validate({
        fromDate: '2026-01-01',
        toDate: '2026-06-30',
        limit: 5,
      });
      expect(error).toBeUndefined();
    });

    it('nên dùng limit mặc định = 10', () => {
      const { value } = topRoomsSchema.validate({
        fromDate: '2026-01-01',
        toDate: '2026-06-30',
      });
      expect(value.limit).toBe(10);
    });

    it('nên fail khi limit > 50', () => {
      const { error } = topRoomsSchema.validate({
        fromDate: '2026-01-01',
        toDate: '2026-06-30',
        limit: 100,
      });
      expect(error).toBeDefined();
    });
  });

  describe('topGuestsSchema', () => {
    it('nên dùng limit mặc định = 10', () => {
      const { value } = topGuestsSchema.validate({});
      expect(value.limit).toBe(10);
    });

    it('nên fail khi limit = 0', () => {
      const { error } = topGuestsSchema.validate({ limit: 0 });
      expect(error).toBeDefined();
    });
  });
});
