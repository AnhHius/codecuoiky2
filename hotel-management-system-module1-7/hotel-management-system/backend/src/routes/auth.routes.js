/**
 * Auth Routes - /api/v1/auth
 */
const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} = require('../validations/auth.validation');

const router = express.Router();

// Giới hạn riêng cho endpoint login để chống brute-force dò mật khẩu
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút',
    errorCode: 'TOO_MANY_LOGIN_ATTEMPTS',
  },
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Tạo tài khoản nhân viên mới
 * @access  Private - chỉ Admin (yêu cầu permission "user:manage")
 */
router.post(
  '/register',
  authenticate,
  authorize('user:manage'),
  validate(registerSchema),
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Đăng nhập, trả về accessToken + set refreshToken vào httpOnly cookie
 * @access  Public
 */
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Cấp lại accessToken mới từ refreshToken hợp lệ
 * @access  Public (yêu cầu refreshToken hợp lệ qua cookie hoặc body)
 */
router.post('/refresh', validate(refreshTokenSchema, 'body'), authController.refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Đăng xuất, thu hồi refreshToken hiện tại
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Đổi mật khẩu, tự động đăng xuất khỏi mọi thiết bị
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Lấy thông tin tài khoản đang đăng nhập
 * @access  Private
 */
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
