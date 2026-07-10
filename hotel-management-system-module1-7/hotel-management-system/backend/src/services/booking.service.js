/**
 * Booking Service - toàn bộ business logic cho vòng đời đặt phòng.
 *
 * ── Vòng đời booking ──────────────────────────────────────────────
 *   pending → confirmed → checked_in → checked_out
 *                      └→ cancelled
 *   pending/confirmed  → no_show (khách không đến)
 *
 * ── Chống double-booking ──────────────────────────────────────────
 *   Sử dụng PostgreSQL transaction + SELECT FOR UPDATE SKIP LOCKED để
 *   đảm bảo tính nhất quán ngay cả khi nhiều lễ tân đặt cùng lúc.
 *   Nếu phòng bị đặt đồng thời: transaction thứ hai sẽ thấy conflict
 *   và rollback, trả lỗi ConflictError cho client.
 */
const db = require('../config/database');
const bookingModel = require('../models/booking.model');
const roomModel = require('../models/room.model');
const guestModel = require('../models/guest.model');
const { generateBookingCode } = require('../utils/bookingCode');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} = require('../errors/AppError');
const logger = require('../utils/logger');

// ─── Trạng thái hợp lệ để huỷ ───────────────────────────────────────────────
const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Tính số đêm giữa 2 ngày */
function calcNumNights(checkInDate, checkOutDate) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round(
    (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / msPerDay
  );
}

/** Tính tổng tiền: room_amount - discount + service (service_amount được cộng thêm sau ở Module 6) */
function calcTotalAmount(roomAmount, discountAmount, serviceAmount = 0) {
  return Math.max(0, roomAmount + serviceAmount - discountAmount);
}

// ─── Tạo booking ────────────────────────────────────────────────────────────
async function createBooking({ guestId, roomIds, checkInDate, checkOutDate, numGuests, specialRequests, discountAmount }, createdBy) {
  const guest = await guestModel.findById(guestId);
  if (!guest) throw new NotFoundError('Khách hàng');

  const numNights = calcNumNights(checkInDate, checkOutDate);
  if (numNights < 1) throw new ValidationError('Số đêm lưu trú phải ít nhất là 1');

  /**
   * Bọc toàn bộ quá trình tạo booking trong 1 transaction.
   * Thứ tự thao tác bên trong transaction:
   * 1. Kiểm tra conflict phòng (với row-level lock)
   * 2. Tính tiền
   * 3. Insert booking
   * 4. Insert booking_rooms
   * 5. Cập nhật trạng thái phòng → occupied (chỉ khi check-in tại quầy ngay hôm nay)
   * Nếu bất kỳ bước nào lỗi → toàn bộ rollback tự động.
   */
  return db.transaction(async (trx) => {
    // 1. Kiểm tra phòng conflict (double-booking check với lock)
    const conflictRoomIds = await bookingModel.findConflictingRoomIds(
      roomIds, checkInDate, checkOutDate, null, trx
    );

    if (conflictRoomIds.length > 0) {
      const rooms = await trx('rooms')
        .whereIn('id', conflictRoomIds)
        .pluck('room_number');
      throw new ConflictError(
        `Phòng ${rooms.join(', ')} đã được đặt trong khoảng thời gian này. Vui lòng chọn phòng khác hoặc thay đổi ngày.`
      );
    }

    // 2. Lấy thông tin phòng và kiểm tra trạng thái
    const rooms = await trx('rooms')
      .join('room_types', 'room_types.id', 'rooms.room_type_id')
      .select('rooms.id', 'rooms.room_number', 'rooms.status', 'room_types.base_price')
      .whereIn('rooms.id', roomIds)
      .andWhere('rooms.is_active', true);

    if (rooms.length !== roomIds.length) {
      throw new ValidationError('Một hoặc nhiều phòng không tồn tại hoặc không còn hoạt động');
    }

    const unavailableRooms = rooms.filter((r) =>
      ['maintenance', 'out_of_service'].includes(r.status)
    );
    if (unavailableRooms.length > 0) {
      throw new ConflictError(
        `Phòng ${unavailableRooms.map((r) => r.room_number).join(', ')} đang bảo trì hoặc ngừng hoạt động`
      );
    }

    // 3. Tính tiền phòng
    const bookingRoomsData = rooms.map((room) => ({
      room_id: room.id,
      price_per_night: room.base_price,
      num_nights: numNights,
      subtotal: parseFloat((room.base_price * numNights).toFixed(2)),
    }));

    const roomAmount = bookingRoomsData.reduce((sum, r) => sum + r.subtotal, 0);
    const totalAmount = calcTotalAmount(roomAmount, discountAmount || 0);

    // Sinh mã booking duy nhất (thử lại nếu trùng - xác suất rất thấp)
    let bookingCode;
    let attempts = 0;
    do {
      bookingCode = generateBookingCode();
      // eslint-disable-next-line no-await-in-loop
      const existing = await bookingModel.findByCode(bookingCode);
      if (!existing) break;
      attempts += 1;
    } while (attempts < 5);

    // 4. Insert booking
    const booking = await bookingModel.create({
      booking_code: bookingCode,
      guest_id: guestId,
      created_by: createdBy,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      num_nights: numNights,
      num_guests: numGuests || 1,
      special_requests: specialRequests || null,
      discount_amount: discountAmount || 0,
      room_amount: roomAmount,
      service_amount: 0,
      total_amount: totalAmount,
      status: 'confirmed', // Booking qua lễ tân mặc định là confirmed ngay
    }, trx);

    // 5. Insert booking_rooms (gắn booking_id vào mỗi row)
    const roomsWithBookingId = bookingRoomsData.map((r) => ({
      ...r,
      booking_id: booking.id,
    }));
    await bookingModel.createBookingRooms(roomsWithBookingId, trx);

    logger.info('Tạo booking thành công', {
      bookingId: booking.id,
      bookingCode,
      guestId,
      rooms: rooms.map((r) => r.room_number),
      totalAmount,
    });

    return bookingModel.findById(booking.id);
  });
}

// ─── Lấy danh sách / chi tiết ────────────────────────────────────────────────
async function getAllBookings(query) {
  const { page, limit, status, guestId, checkInDate, checkOutDate, search } = query;
  const { data, total } = await bookingModel.findAllPaginated({
    page, limit, status, guestId, checkInDate, checkOutDate, search,
  });
  return { bookings: data, pagination: { page, limit, total } };
}

async function getBookingById(id) {
  const booking = await bookingModel.findById(id);
  if (!booking) throw new NotFoundError('Đặt phòng');
  return booking;
}

// ─── Check-in ────────────────────────────────────────────────────────────────
/**
 * Thực hiện check-in:
 * - Chỉ áp dụng cho booking status "confirmed"
 * - Cập nhật trạng thái booking → checked_in
 * - Cập nhật trạng thái từng phòng → occupied
 */
async function checkIn(bookingId, { numGuests } = {}, operatorId) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  if (booking.status !== 'confirmed') {
    throw new ValidationError(
      `Không thể check-in: booking đang ở trạng thái "${booking.status}". Chỉ check-in được khi trạng thái là "confirmed".`
    );
  }

  return db.transaction(async (trx) => {
    const updatedBooking = await bookingModel.updateStatus(
      bookingId,
      'checked_in',
      {
        actual_check_in_at: new Date(),
        ...(numGuests ? { num_guests: numGuests } : {}),
      },
      trx
    );

    // Cập nhật trạng thái tất cả phòng trong booking → occupied
    const roomIds = booking.rooms.map((r) => r.room_id);
    await trx('rooms')
      .whereIn('id', roomIds)
      .update({ status: 'occupied', updated_at: db.fn.now() });

    logger.info('Check-in thành công', {
      bookingId,
      bookingCode: booking.booking_code,
      operatorId,
      rooms: booking.rooms.map((r) => r.room_number),
    });

    return bookingModel.findById(updatedBooking.id);
  });
}

// ─── Check-out ───────────────────────────────────────────────────────────────
/**
 * Thực hiện check-out:
 * - Chỉ áp dụng cho booking status "checked_in"
 * - Cập nhật trạng thái booking → checked_out
 * - Cập nhật trạng thái từng phòng → cleaning (cần dọn dẹp trước khi available lại)
 * - Tăng counter total_stays của guest
 */
async function checkOut(bookingId, operatorId) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  if (booking.status !== 'checked_in') {
    throw new ValidationError(
      `Không thể check-out: booking đang ở trạng thái "${booking.status}". Chỉ check-out được khi trạng thái là "checked_in".`
    );
  }

  return db.transaction(async (trx) => {
    const updatedBooking = await bookingModel.updateStatus(
      bookingId,
      'checked_out',
      { actual_check_out_at: new Date() },
      trx
    );

    // Chuyển phòng → cleaning (buồng phòng sẽ đổi sang available sau khi dọn xong)
    const roomIds = booking.rooms.map((r) => r.room_id);
    await trx('rooms')
      .whereIn('id', roomIds)
      .update({ status: 'cleaning', updated_at: db.fn.now() });

    // Cộng total_stays cho guest
    await guestModel.incrementTotalStays(booking.guest_id, trx);

    logger.info('Check-out thành công', {
      bookingId,
      bookingCode: booking.booking_code,
      operatorId,
    });

    return bookingModel.findById(updatedBooking.id);
  });
}

// ─── Huỷ booking ─────────────────────────────────────────────────────────────
/**
 * Chính sách huỷ phòng:
 * - Chỉ huỷ được khi status là pending hoặc confirmed
 * - Không cho phép tự huỷ booking của người khác (trừ Admin/Manager)
 * - Nếu booking đang checked_in thì phải check-out trước
 */
async function cancelBooking(bookingId, { reason }, cancelledBy, userPermissions = []) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    throw new ValidationError(
      `Không thể huỷ booking ở trạng thái "${booking.status}". Chỉ huỷ được khi đang ở trạng thái "pending" hoặc "confirmed".`
    );
  }

  // Kiểm tra quyền: chỉ người tạo booking hoặc người có quyền booking:cancel mới được huỷ
  const canCancelOthers = userPermissions.includes('booking:cancel');
  if (booking.created_by !== cancelledBy && !canCancelOthers) {
    throw new ForbiddenError('Bạn chỉ có thể huỷ booking do chính mình tạo');
  }

  return db.transaction(async (trx) => {
    await bookingModel.updateStatus(
      bookingId,
      'cancelled',
      {
        cancellation_reason: reason,
        cancelled_at: new Date(),
        cancelled_by: cancelledBy,
      },
      trx
    );

    logger.info('Huỷ booking', { bookingId, bookingCode: booking.booking_code, reason, cancelledBy });

    return bookingModel.findById(bookingId);
  });
}

// ─── Đánh dấu no-show ────────────────────────────────────────────────────────
async function markNoShow(bookingId, operatorId) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new ValidationError('Chỉ có thể đánh dấu no-show cho booking đang pending hoặc confirmed');
  }

  await bookingModel.updateStatus(bookingId, 'no_show');
  logger.info('Đánh dấu no-show', { bookingId, operatorId });
  return bookingModel.findById(bookingId);
}

// ─── Cập nhật thông tin booking ──────────────────────────────────────────────
async function updateBooking(bookingId, payload) {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Đặt phòng');

  if (['checked_out', 'cancelled', 'no_show'].includes(booking.status)) {
    throw new ValidationError('Không thể chỉnh sửa booking đã hoàn thành, đã huỷ hoặc no-show');
  }

  const updateData = {};
  if (payload.specialRequests !== undefined) updateData.special_requests = payload.specialRequests;
  if (payload.numGuests !== undefined) updateData.num_guests = payload.numGuests;
  if (payload.discountAmount !== undefined) {
    updateData.discount_amount = payload.discountAmount;
    updateData.total_amount = calcTotalAmount(
      booking.room_amount,
      payload.discountAmount,
      booking.service_amount
    );
  }

  await bookingModel.update(bookingId, updateData);
  return bookingModel.findById(bookingId);
}

// ─── Dashboard helpers ────────────────────────────────────────────────────────
async function getDashboardStats() {
  const [statusCounts, checkinsToday, checkoutsToday] = await Promise.all([
    bookingModel.countByStatus(),
    bookingModel.findCheckinToday(),
    bookingModel.findCheckoutToday(),
  ]);
  return { statusCounts, checkinsToday, checkoutsToday };
}

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  checkIn,
  checkOut,
  cancelBooking,
  markNoShow,
  updateBooking,
  getDashboardStats,
};
