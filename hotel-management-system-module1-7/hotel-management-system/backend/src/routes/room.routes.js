/**
 * Room Routes - /api/v1/rooms
 */
const express = require('express');
const roomController = require('../controllers/room.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  createRoomSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
  listQuerySchema,
  availabilityQuerySchema,
} = require('../validations/room.validation');

const router = express.Router();

/**
 * @route   GET /api/v1/rooms/available
 * @desc    Tìm phòng còn trống theo khoảng ngày - đặt TRƯỚC route /:id để tránh xung đột path
 * @access  Private
 */
router.get(
  '/available',
  authenticate,
  validate(availabilityQuerySchema, 'query'),
  roomController.getAvailable
);

/**
 * @route   GET /api/v1/rooms
 * @desc    Danh sách phòng, hỗ trợ phân trang + filter (status, roomTypeId, search)
 * @access  Private
 */
router.get('/', authenticate, validate(listQuerySchema, 'query'), roomController.getAll);

/**
 * @route   GET /api/v1/rooms/:id
 * @access  Private
 */
router.get('/:id', authenticate, roomController.getById);

/**
 * @route   POST /api/v1/rooms
 * @access  Private - yêu cầu quyền room:create
 */
router.post(
  '/',
  authenticate,
  authorize('room:create'),
  validate(createRoomSchema),
  roomController.create
);

/**
 * @route   PATCH /api/v1/rooms/:id
 * @access  Private - yêu cầu quyền room:update
 */
router.patch(
  '/:id',
  authenticate,
  authorize('room:update'),
  validate(updateRoomSchema),
  roomController.update
);

/**
 * @route   PATCH /api/v1/rooms/:id/status
 * @desc    Cập nhật nhanh trạng thái phòng (housekeeping, lễ tân dùng thường xuyên)
 * @access  Private - yêu cầu quyền room:update
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('room:update'),
  validate(updateRoomStatusSchema),
  roomController.updateStatus
);

/**
 * @route   DELETE /api/v1/rooms/:id
 * @access  Private - yêu cầu quyền room:delete
 */
router.delete('/:id', authenticate, authorize('room:delete'), roomController.remove);

module.exports = router;
