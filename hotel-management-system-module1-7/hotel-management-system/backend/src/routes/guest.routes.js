/**
 * Guest Routes - /api/v1/guests
 */
const express = require('express');
const guestController = require('../controllers/guest.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  createGuestSchema,
  updateGuestSchema,
  listGuestQuerySchema,
} = require('../validations/guest.validation');

const router = express.Router();

// Tất cả route guests đều yêu cầu đăng nhập
router.use(authenticate);

/**
 * @route   GET /api/v1/guests
 * @desc    Danh sách khách hàng - hỗ trợ tìm kiếm mờ (tên/phone/email/số giấy tờ) và phân trang
 * @access  Private - guest:read
 */
router.get('/', authorize('guest:read'), validate(listGuestQuerySchema, 'query'), guestController.getAll);

/**
 * @route   GET /api/v1/guests/:id
 * @desc    Chi tiết hồ sơ 1 khách hàng
 * @access  Private - guest:read
 */
router.get('/:id', authorize('guest:read'), guestController.getById);

/**
 * @route   GET /api/v1/guests/:id/stay-history
 * @desc    Lịch sử lưu trú của khách hàng (phân trang)
 * @access  Private - guest:read
 */
router.get('/:id/stay-history', authorize('guest:read'), guestController.getStayHistory);

/**
 * @route   POST /api/v1/guests
 * @desc    Tạo hồ sơ khách hàng mới - kiểm tra trùng email và giấy tờ
 * @access  Private - guest:create
 */
router.post('/', authorize('guest:create'), validate(createGuestSchema), guestController.create);

/**
 * @route   PATCH /api/v1/guests/:id
 * @desc    Cập nhật thông tin khách hàng
 * @access  Private - guest:update
 */
router.patch('/:id', authorize('guest:update'), validate(updateGuestSchema), guestController.update);

module.exports = router;
