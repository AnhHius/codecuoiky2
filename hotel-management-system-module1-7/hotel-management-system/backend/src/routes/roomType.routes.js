/**
 * RoomType Routes - /api/v1/room-types
 */
const express = require('express');
const roomTypeController = require('../controllers/roomType.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  createRoomTypeSchema,
  updateRoomTypeSchema,
} = require('../validations/room.validation');

const router = express.Router();

/**
 * @route   GET /api/v1/room-types
 * @desc    Lấy danh sách loại phòng (mặc định chỉ trả về loại đang active)
 * @access  Private
 */
router.get('/', authenticate, roomTypeController.getAll);

/**
 * @route   GET /api/v1/room-types/:id
 * @access  Private
 */
router.get('/:id', authenticate, roomTypeController.getById);

/**
 * @route   POST /api/v1/room-types
 * @access  Private - yêu cầu quyền room:create
 */
router.post(
  '/',
  authenticate,
  authorize('room:create'),
  validate(createRoomTypeSchema),
  roomTypeController.create
);

/**
 * @route   PATCH /api/v1/room-types/:id
 * @access  Private - yêu cầu quyền room:update
 */
router.patch(
  '/:id',
  authenticate,
  authorize('room:update'),
  validate(updateRoomTypeSchema),
  roomTypeController.update
);

/**
 * @route   DELETE /api/v1/room-types/:id
 * @desc    Soft-delete loại phòng (chỉ thực hiện được nếu không còn phòng nào thuộc loại này)
 * @access  Private - yêu cầu quyền room:delete
 */
router.delete('/:id', authenticate, authorize('room:delete'), roomTypeController.remove);

module.exports = router;
