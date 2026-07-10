/**
 * Unit test cho src/services/report.service.js
 */
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

jest.mock('../../src/models/report.model');
jest.mock('../../src/utils/cache');

const reportModel = require('../../src/models/report.model');
const { cacheAside } = require('../../src/utils/cache');
const reportService = require('../../src/services/report.service');
const { ValidationError } = require('../../src/errors/AppError');

// Mock cacheAside để gọi thẳng fetchFn (bỏ qua Redis trong test)
cacheAside.mockImplementation(async (key, fetchFn) => fetchFn());

const mockDashboard = {
  rooms: { total: 25, available: 20, occupied: 3, cleaning: 2, maintenance: 0 },
  bookingsToday: { expectedCheckins: 3, actualCheckins: 1, expectedCheckouts: 2, actualCheckouts: 2 },
  revenueToday: 3500000,
};

const mockRevenueData = [
  { date: '2026-07-01', total_revenue: '1500000', num_bookings: '2' },
  { date: '2026-07-02', total_revenue: '2000000', num_bookings: '3' },
];

describe('Report Service', () => {
  afterEach(() => jest.clearAllMocks());

  // ── getDashboardSummary ───────────────────────────────────────────────────
  describe('getDashboardSummary', () => {
    it('nên trả về dữ liệu dashboard từ model', async () => {
      reportModel.getDashboardSummary.mockResolvedValue(mockDashboard);
      const result = await reportService.getDashboardSummary();
      expect(result.rooms.total).toBe(25);
      expect(result.revenueToday).toBe(3500000);
      expect(reportModel.getDashboardSummary).toHaveBeenCalledTimes(1);
    });

    it('nên gọi cacheAside với key chứa ngày hôm nay', async () => {
      reportModel.getDashboardSummary.mockResolvedValue(mockDashboard);
      await reportService.getDashboardSummary();
      const today = new Date().toISOString().slice(0, 10);
      expect(cacheAside).toHaveBeenCalledWith(
        expect.stringContaining(today),
        expect.any(Function),
        expect.any(Number)
      );
    });
  });

  // ── getRevenueByDay ───────────────────────────────────────────────────────
  describe('getRevenueByDay', () => {
    it('nên throw ValidationError khi khoảng thời gian > 90 ngày', async () => {
      await expect(
        reportService.getRevenueByDay({ fromDate: '2026-01-01', toDate: '2026-12-31' })
      ).rejects.toThrow(ValidationError);
    });

    it('nên trả về doanh thu theo ngày trong phạm vi hợp lệ', async () => {
      reportModel.getRevenueByDay.mockResolvedValue(mockRevenueData);
      const result = await reportService.getRevenueByDay({
        fromDate: '2026-07-01',
        toDate: '2026-07-07',
      });
      expect(result).toHaveLength(2);
      expect(reportModel.getRevenueByDay).toHaveBeenCalledWith('2026-07-01', '2026-07-07');
    });

    it('nên cho phép đúng 90 ngày (boundary)', async () => {
      reportModel.getRevenueByDay.mockResolvedValue([]);
      await expect(
        reportService.getRevenueByDay({ fromDate: '2026-04-01', toDate: '2026-06-29' })
      ).resolves.not.toThrow();
    });
  });

  // ── getRevenueByMonth ─────────────────────────────────────────────────────
  describe('getRevenueByMonth', () => {
    it('nên trả về doanh thu 12 tháng của năm', async () => {
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        total_revenue: '1000000',
        num_bookings: '5',
      }));
      reportModel.getRevenueByMonth.mockResolvedValue(monthlyData);

      const result = await reportService.getRevenueByMonth({ year: 2025 });
      expect(result).toHaveLength(12);
      expect(reportModel.getRevenueByMonth).toHaveBeenCalledWith(2025);
    });

    it('nên dùng TTL dài hơn cho năm cũ', async () => {
      reportModel.getRevenueByMonth.mockResolvedValue([]);
      cacheAside.mockClear();
      await reportService.getRevenueByMonth({ year: 2024 });
      // TTL cho năm cũ phải là 3600 (1 giờ)
      expect(cacheAside).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        3600
      );
    });

    it('nên dùng TTL ngắn hơn cho năm hiện tại', async () => {
      reportModel.getRevenueByMonth.mockResolvedValue([]);
      cacheAside.mockClear();
      const currentYear = new Date().getFullYear();
      await reportService.getRevenueByMonth({ year: currentYear });
      // TTL cho năm hiện tại là 600 (10 phút)
      expect(cacheAside).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        600
      );
    });
  });

  // ── getOccupancyByDay ─────────────────────────────────────────────────────
  describe('getOccupancyByDay', () => {
    it('nên throw ValidationError khi khoảng thời gian > 90 ngày', async () => {
      await expect(
        reportService.getOccupancyByDay({ fromDate: '2026-01-01', toDate: '2026-12-31' })
      ).rejects.toThrow(ValidationError);
    });

    it('nên trả về occupancy rate theo ngày', async () => {
      const occupancyData = [
        { date: '2026-07-01', occupied_rooms: '15', total_rooms: '25', occupancy_rate: '60.00' },
      ];
      reportModel.getOccupancyByDay.mockResolvedValue(occupancyData);
      const result = await reportService.getOccupancyByDay({
        fromDate: '2026-07-01',
        toDate: '2026-07-01',
      });
      expect(result[0].occupancy_rate).toBe('60.00');
    });
  });

  // ── getOccupancyByMonth ───────────────────────────────────────────────────
  describe('getOccupancyByMonth', () => {
    it('nên trả về occupancy theo tháng', async () => {
      reportModel.getOccupancyByMonth.mockResolvedValue([
        { month: 7, occupancy_rate: '75.50' },
      ]);
      const result = await reportService.getOccupancyByMonth({ year: 2026 });
      expect(result[0].month).toBe(7);
    });
  });

  // ── getTopRooms ───────────────────────────────────────────────────────────
  describe('getTopRooms', () => {
    it('nên trả về top rooms với limit chỉ định', async () => {
      reportModel.getTopRooms.mockResolvedValue([
        { room_number: '601', total_bookings: '10', total_revenue: '15000000' },
      ]);
      const result = await reportService.getTopRooms({
        fromDate: '2026-01-01',
        toDate: '2026-06-30',
        limit: 5,
      });
      expect(reportModel.getTopRooms).toHaveBeenCalledWith('2026-01-01', '2026-06-30', 5);
      expect(result).toHaveLength(1);
    });
  });

  // ── getTopGuests ──────────────────────────────────────────────────────────
  describe('getTopGuests', () => {
    it('nên trả về top guests', async () => {
      reportModel.getTopGuests.mockResolvedValue([
        { full_name: 'Nguyễn Văn An', total_stays: 5, total_spent: '8000000' },
      ]);
      const result = await reportService.getTopGuests({ limit: 10 });
      expect(result[0].total_stays).toBe(5);
    });
  });

  // ── getGuestsByNationality ────────────────────────────────────────────────
  describe('getGuestsByNationality', () => {
    it('nên trả về thống kê theo quốc tịch', async () => {
      reportModel.getGuestsByNationality.mockResolvedValue([
        { nationality: 'Vietnamese', count: '50' },
        { nationality: 'American', count: '10' },
      ]);
      const result = await reportService.getGuestsByNationality();
      expect(result).toHaveLength(2);
      expect(result[0].nationality).toBe('Vietnamese');
    });
  });
});
