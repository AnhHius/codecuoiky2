/**
 * Report Model - các truy vấn tổng hợp (aggregate) phục vụ báo cáo và dashboard.
 * Các query này thường nặng (JOIN nhiều bảng, GROUP BY, SUM...) nên sẽ được
 * cache bằng Redis ở tầng service để tránh load DB liên tục.
 */
const db = require('../config/database');

// ─── Dashboard tổng quan ──────────────────────────────────────────────────────

/**
 * Thống kê nhanh cho màn hình dashboard chính:
 * - Tổng phòng / phòng trống / phòng đang có khách / phòng cần dọn
 * - Tổng booking hôm nay (check-in + check-out)
 * - Doanh thu hôm nay (hóa đơn đã thanh toán)
 */
async function getDashboardSummary() {
  const today = new Date().toISOString().slice(0, 10);

  const [roomStats, bookingStats, revenueToday] = await Promise.all([
    // Thống kê phòng theo trạng thái
    db('rooms')
      .where('is_active', true)
      .select('status')
      .count('id as count')
      .groupBy('status'),

    // Booking hôm nay
    db('bookings')
      .where((qb) => {
        qb.where('check_in_date', today).orWhere('check_out_date', today);
      })
      .select(
        db.raw("COUNT(*) FILTER (WHERE check_in_date = ? AND status IN ('confirmed','pending')) as expected_checkins", [today]),
        db.raw("COUNT(*) FILTER (WHERE check_in_date = ? AND status = 'checked_in') as actual_checkins", [today]),
        db.raw("COUNT(*) FILTER (WHERE check_out_date = ? AND status = 'checked_in') as expected_checkouts", [today]),
        db.raw("COUNT(*) FILTER (WHERE check_out_date = ? AND status = 'checked_out') as actual_checkouts", [today])
      )
      .first(),

    // Doanh thu hôm nay (payments ghi nhận hôm nay)
    db('payments')
      .whereRaw("DATE(paid_at) = ?", [today])
      .sum('amount as total')
      .first(),
  ]);

  const roomMap = roomStats.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count, 10) }), {});

  return {
    rooms: {
      total: Object.values(roomMap).reduce((a, b) => a + b, 0),
      available: roomMap.available || 0,
      occupied: roomMap.occupied || 0,
      cleaning: roomMap.cleaning || 0,
      maintenance: (roomMap.maintenance || 0) + (roomMap.out_of_service || 0),
    },
    bookingsToday: {
      expectedCheckins: parseInt(bookingStats?.expected_checkins || 0, 10),
      actualCheckins: parseInt(bookingStats?.actual_checkins || 0, 10),
      expectedCheckouts: parseInt(bookingStats?.expected_checkouts || 0, 10),
      actualCheckouts: parseInt(bookingStats?.actual_checkouts || 0, 10),
    },
    revenueToday: parseFloat(revenueToday?.total || 0),
  };
}

// ─── Báo cáo doanh thu ────────────────────────────────────────────────────────

/**
 * Doanh thu theo ngày trong 1 khoảng thời gian.
 * Tổng hợp từ payments.paid_at, group by ngày.
 */
async function getRevenueByDay(fromDate, toDate) {
  return db('payments')
    .join('invoices', 'invoices.id', 'payments.invoice_id')
    .join('bookings', 'bookings.id', 'invoices.booking_id')
    .whereRaw("DATE(payments.paid_at) BETWEEN ? AND ?", [fromDate, toDate])
    .select(
      db.raw("DATE(payments.paid_at) as date"),
      db.raw("SUM(payments.amount) as total_revenue"),
      db.raw("COUNT(DISTINCT invoices.booking_id) as num_bookings"),
      db.raw("SUM(CASE WHEN bookings.room_amount > 0 THEN payments.amount * (bookings.room_amount / NULLIF(bookings.total_amount, 0)) ELSE 0 END) as room_revenue"),
      db.raw("SUM(CASE WHEN bookings.service_amount > 0 THEN payments.amount * (bookings.service_amount / NULLIF(bookings.total_amount, 0)) ELSE 0 END) as service_revenue")
    )
    .groupByRaw("DATE(payments.paid_at)")
    .orderBy('date', 'asc');
}

/**
 * Doanh thu tổng hợp theo tháng trong 1 năm.
 */
async function getRevenueByMonth(year) {
  return db('payments')
    .join('invoices', 'invoices.id', 'payments.invoice_id')
    .whereRaw("EXTRACT(YEAR FROM payments.paid_at) = ?", [year])
    .select(
      db.raw("EXTRACT(MONTH FROM payments.paid_at)::int as month"),
      db.raw("SUM(payments.amount) as total_revenue"),
      db.raw("COUNT(DISTINCT invoices.booking_id) as num_bookings"),
      db.raw("AVG(invoices.total_amount) as avg_booking_value")
    )
    .groupByRaw("EXTRACT(MONTH FROM payments.paid_at)")
    .orderBy('month', 'asc');
}

// ─── Báo cáo công suất phòng (Occupancy Rate) ────────────────────────────────

/**
 * Tính occupancy rate (tỷ lệ lấp đầy phòng) theo từng ngày trong khoảng thời gian.
 *
 * Công thức: occupied_rooms / total_rooms × 100
 * "Occupied" = những phòng có booking confirmed/checked_in bao phủ ngày đó.
 *
 * Dùng generate_series của PostgreSQL để tạo dãy ngày liên tục (kể cả ngày không có booking).
 */
async function getOccupancyByDay(fromDate, toDate) {
  const totalRooms = await db('rooms').where('is_active', true).count('id as count').first();
  const total = parseInt(totalRooms.count, 10);
  if (total === 0) return [];

  const rows = await db.raw(`
    SELECT
      gs.date::date as date,
      COUNT(DISTINCT br.room_id) as occupied_rooms,
      ? as total_rooms,
      ROUND(COUNT(DISTINCT br.room_id)::numeric / ? * 100, 2) as occupancy_rate
    FROM generate_series(?::date, ?::date, '1 day'::interval) AS gs(date)
    LEFT JOIN bookings b
      ON b.check_in_date <= gs.date
      AND b.check_out_date > gs.date
      AND b.status IN ('confirmed', 'checked_in', 'checked_out')
    LEFT JOIN booking_rooms br ON br.booking_id = b.id
    GROUP BY gs.date
    ORDER BY gs.date ASC
  `, [total, total, fromDate, toDate]);

  return rows.rows;
}

/**
 * Tổng hợp occupancy theo tháng: số đêm phòng bán được / (tổng phòng × số ngày tháng đó).
 */
async function getOccupancyByMonth(year) {
  const totalRooms = await db('rooms').where('is_active', true).count('id as count').first();
  const total = parseInt(totalRooms.count, 10);
  if (total === 0) return [];

  const rows = await db.raw(`
    SELECT
      EXTRACT(MONTH FROM gs.date)::int as month,
      COUNT(DISTINCT (gs.date, br.room_id)) as room_nights_sold,
      ? * COUNT(DISTINCT gs.date) as room_nights_available,
      ROUND(
        COUNT(DISTINCT (gs.date, br.room_id))::numeric /
        NULLIF(? * COUNT(DISTINCT gs.date), 0) * 100, 2
      ) as occupancy_rate
    FROM generate_series(?::date, (?::text || '-12-31')::date, '1 day') AS gs(date)
    LEFT JOIN bookings b
      ON b.check_in_date <= gs.date
      AND b.check_out_date > gs.date
      AND b.status IN ('confirmed', 'checked_in', 'checked_out')
    LEFT JOIN booking_rooms br ON br.booking_id = b.id
    WHERE EXTRACT(YEAR FROM gs.date) = ?
    GROUP BY EXTRACT(MONTH FROM gs.date)
    ORDER BY month ASC
  `, [total, total, `${year}-01-01`, year, year]);

  return rows.rows;
}

// ─── Báo cáo phòng ──────────────────────────────────────────────────────────

/**
 * Các phòng được đặt nhiều nhất trong khoảng thời gian.
 */
async function getTopRooms(fromDate, toDate, limit = 10) {
  return db('booking_rooms')
    .join('bookings', 'bookings.id', 'booking_rooms.booking_id')
    .join('rooms', 'rooms.id', 'booking_rooms.room_id')
    .join('room_types', 'room_types.id', 'rooms.room_type_id')
    .whereIn('bookings.status', ['confirmed', 'checked_in', 'checked_out'])
    .whereBetween('bookings.check_in_date', [fromDate, toDate])
    .select(
      'rooms.room_number',
      'room_types.name as room_type',
      db.raw('COUNT(*) as total_bookings'),
      db.raw('SUM(booking_rooms.num_nights) as total_nights'),
      db.raw('SUM(booking_rooms.subtotal) as total_revenue')
    )
    .groupBy('rooms.id', 'rooms.room_number', 'room_types.name')
    .orderBy('total_bookings', 'desc')
    .limit(limit);
}

// ─── Báo cáo khách hàng ──────────────────────────────────────────────────────

/**
 * Khách hàng thân thiết (nhiều lần lưu trú nhất).
 */
async function getTopGuests(limit = 10) {
  return db('guests')
    .select(
      'guests.id',
      'guests.full_name',
      'guests.phone',
      'guests.nationality',
      'guests.total_stays',
      db.raw('SUM(bookings.total_amount) as total_spent')
    )
    .leftJoin('bookings', function () {
      this.on('bookings.guest_id', 'guests.id')
        .onIn('bookings.status', ['checked_out']);
    })
    .where('guests.total_stays', '>', 0)
    .groupBy('guests.id', 'guests.full_name', 'guests.phone', 'guests.nationality', 'guests.total_stays')
    .orderBy('guests.total_stays', 'desc')
    .limit(limit);
}

/**
 * Thống kê khách theo quốc tịch.
 */
async function getGuestsByNationality() {
  return db('guests')
    .select(db.raw("COALESCE(nationality, 'Không xác định') as nationality"))
    .count('id as count')
    .groupBy('nationality')
    .orderBy('count', 'desc');
}

module.exports = {
  getDashboardSummary,
  getRevenueByDay,
  getRevenueByMonth,
  getOccupancyByDay,
  getOccupancyByMonth,
  getTopRooms,
  getTopGuests,
  getGuestsByNationality,
};
