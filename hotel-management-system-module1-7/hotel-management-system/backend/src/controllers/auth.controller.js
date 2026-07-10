/**
 * Auth Controller - tầng xử lý HTTP request/response.
 * Không chứa business logic, chỉ điều phối: nhận input đã validate -> gọi service -> format response.
 */
const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const env = require('../config/env');

/** Cấu hình cookie chứa refresh token: httpOnly để JS phía client không đọc được (chống XSS đánh cắp token) */
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: env.isProduction, // Chỉ gửi qua HTTPS khi production
  sameSite: 'strict', // Chống CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày, đồng bộ với JWT_REFRESH_EXPIRES_IN
  path: '/api/v1/auth',
};

function getRequestMeta(req) {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Tạo tài khoản thành công',
    data: user,
  });
});

const login = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(
    req.body,
    getRequestMeta(req)
  );

  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

  return sendSuccess(res, {
    message: 'Đăng nhập thành công',
    data: { user, accessToken },
  });
});

const refresh = catchAsync(async (req, res) => {
  // Refresh token có thể đến từ cookie (web) hoặc body (mobile/Postman)
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingToken) {
    return sendSuccess(res, { statusCode: 401, message: 'Thiếu refresh token' });
  }

  const { accessToken, refreshToken } = await authService.refreshAccessToken(
    incomingToken,
    getRequestMeta(req)
  );

  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

  return sendSuccess(res, {
    message: 'Làm mới token thành công',
    data: { accessToken },
  });
});

const logout = catchAsync(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout(incomingToken);

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  return sendSuccess(res, { message: 'Đăng xuất thành công' });
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  return sendSuccess(res, { message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' });
});

const getProfile = catchAsync(async (req, res) => {
  return sendSuccess(res, { message: 'Lấy thông tin thành công', data: req.user });
});

module.exports = { register, login, refresh, logout, changePassword, getProfile };
