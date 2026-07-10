/**
 * Service Routes - /api/v1/services
 * Dịch vụ gắn vào booking được đặt ở booking.routes để RESTful hơn:
 *   /api/v1/bookings/:bookingId/services
 */
const express = require('express');
const serviceController = require('../controllers/service.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  createServiceSchema,
  updateServiceSchema,
  listServiceQuerySchema,
} = require('../validations/service.validation');

const router = express.Router();
router.use(authenticate);

/**
 * @route   GET /api/v1/services
 * @desc    Danh sách dịch vụ, filter theo category, tìm kiếm theo tên
 * @access  Private - booking:read (nhân viên cần xem khi thêm dịch vụ cho khách)
 */
router.get('/', authorize('booking:read'), validate(listServiceQuerySchema, 'query'), serviceController.getAll);

/**
 * @route   GET /api/v1/services/:id
 * @access  Private - booking:read
 */
router.get('/:id', authorize('booking:read'), serviceController.getById);

/**
 * @route   POST /api/v1/services
 * @access  Private - room:create (quyền quản lý danh mục, cùng nhóm admin/manager)
 */
router.post('/', authorize('room:create'), validate(createServiceSchema), serviceController.create);

/**
 * @route   PATCH /api/v1/services/:id
 * @access  Private - room:update
 */
router.patch('/:id', authorize('room:update'), validate(updateServiceSchema), serviceController.update);

/**
 * @route   DELETE /api/v1/services/:id
 * @access  Private - room:delete
 */
router.delete('/:id', authorize('room:delete'), serviceController.remove);

module.exports = router;
