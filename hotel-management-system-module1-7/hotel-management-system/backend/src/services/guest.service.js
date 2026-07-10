/**
 * Guest Service - business logic cho quản lý hồ sơ khách hàng.
 *
 * Các ràng buộc nghiệp vụ chính:
 * - Không trùng email (nếu có cung cấp)
 * - Không trùng cặp (idType, idNumber) - tránh tạo hồ sơ trùng cho cùng 1 người
 * - Lịch sử lưu trú (stay history) được trả về phân trang
 */
const guestModel = require('../models/guest.model');
const { ConflictError, NotFoundError } = require('../errors/AppError');
const logger = require('../utils/logger');

/**
 * Chuyển đổi camelCase từ request body sang snake_case để insert vào DB
 */
function toDbFields(payload) {
  const map = {
    fullName: 'full_name',
    dateOfBirth: 'date_of_birth',
    idType: 'id_type',
    idNumber: 'id_number',
  };

  return Object.entries(payload).reduce((acc, [key, val]) => {
    const dbKey = map[key] || key;
    acc[dbKey] = val === '' ? null : val; // Chuẩn hóa chuỗi rỗng thành null cho DB
    return acc;
  }, {});
}

async function getAllGuests(query) {
  const { page, limit, search, nationality } = query;
  const { data, total } = await guestModel.findAllPaginated({ page, limit, search, nationality });
  return { guests: data, pagination: { page, limit, total } };
}

async function getGuestById(id) {
  const guest = await guestModel.findById(id);
  if (!guest) throw new NotFoundError('Khách hàng');
  return guest;
}

async function createGuest(payload) {
  // Kiểm tra trùng email
  if (payload.email) {
    const emailExists = await guestModel.findByEmail(payload.email);
    if (emailExists) throw new ConflictError('Email này đã được đăng ký cho khách hàng khác');
  }

  // Kiểm tra trùng giấy tờ tùy thân
  if (payload.idType && payload.idNumber) {
    const idExists = await guestModel.findDuplicateIdentity(payload.idType, payload.idNumber);
    if (idExists) {
      throw new ConflictError(
        `Số giấy tờ ${payload.idNumber} đã được đăng ký trong hệ thống. Vui lòng kiểm tra lại hoặc tìm kiếm hồ sơ cũ.`
      );
    }
  }

  const guest = await guestModel.create(toDbFields(payload));
  logger.info('Tạo hồ sơ khách hàng mới', { guestId: guest.id, phone: guest.phone });
  return guest;
}

async function updateGuest(id, payload) {
  const existing = await guestModel.findById(id);
  if (!existing) throw new NotFoundError('Khách hàng');

  // Kiểm tra email không trùng với guest khác
  if (payload.email && payload.email !== existing.email) {
    const emailExists = await guestModel.findByEmail(payload.email);
    if (emailExists) throw new ConflictError('Email này đã được đăng ký cho khách hàng khác');
  }

  // Kiểm tra giấy tờ không trùng với guest khác (loại trừ chính guest này)
  if (payload.idType && payload.idNumber) {
    const idExists = await guestModel.findDuplicateIdentity(payload.idType, payload.idNumber, id);
    if (idExists) {
      throw new ConflictError(`Số giấy tờ ${payload.idNumber} đã được đăng ký trong hệ thống`);
    }
  }

  const updated = await guestModel.update(id, toDbFields(payload));
  logger.info('Cập nhật hồ sơ khách hàng', { guestId: id });
  return updated;
}

/**
 * Lấy lịch sử lưu trú của khách.
 * Dữ liệu từ bảng bookings sẽ có đầy đủ sau khi Module 5 (Booking) hoàn thành.
 */
async function getGuestStayHistory(id, query) {
  const existing = await guestModel.findById(id);
  if (!existing) throw new NotFoundError('Khách hàng');

  const { page = 1, limit = 10 } = query;
  const { data, total } = await guestModel.findStayHistory(id, { page, limit });

  return {
    guest: existing,
    history: data,
    pagination: { page, limit, total },
  };
}

module.exports = {
  getAllGuests,
  getGuestById,
  createGuest,
  updateGuest,
  getGuestStayHistory,
};
