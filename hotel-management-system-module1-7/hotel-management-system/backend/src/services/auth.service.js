/**
 * Auth Service - chứa toàn bộ business logic liên quan đến xác thực:
 * đăng ký, đăng nhập, cấp/thu hồi refresh token, đổi mật khẩu.
 * Controller chỉ gọi service, không tự viết logic nghiệp vụ ở đây.
 */
const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const refreshTokenModel = require('../models/refreshToken.model');
const jwtUtil = require('../utils/jwt');
const env = require('../config/env');
const logger = require('../utils/logger');
const {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} = require('../errors/AppError');

/**
 * Đăng ký tài khoản nhân viên mới (thường chỉ Admin được phép gọi - kiểm soát ở route)
 */
async function register({ fullName, email, password, phone, roleId }) {
  const exists = await userModel.emailExists(email);
  if (exists) {
    throw new ConflictError('Email này đã được sử dụng');
  }

  const passwordHash = await bcrypt.hash(password, env.bcrypt.saltRounds);

  const user = await userModel.create({
    full_name: fullName,
    email,
    password_hash: passwordHash,
    phone: phone || null,
    role_id: roleId,
  });

  logger.info('Tạo tài khoản nhân viên mới thành công', { userId: user.id, email });
  return user;
}

/**
 * Sinh cặp access token + refresh token cho user, đồng thời lưu refresh token (đã hash) vào DB
 */
async function issueTokens(user, { userAgent, ipAddress } = {}) {
  const payload = { sub: user.id, role: user.role_name, permissions: user.permissions };

  const accessToken = jwtUtil.signAccessToken(payload);
  const refreshToken = jwtUtil.signRefreshToken({ sub: user.id });

  await refreshTokenModel.create({
    userId: user.id,
    tokenHash: jwtUtil.hashToken(refreshToken),
    userAgent,
    ipAddress,
    expiresAt: jwtUtil.getExpiryDate(env.jwt.refreshExpiresIn),
  });

  return { accessToken, refreshToken };
}

/**
 * Đăng nhập: xác thực email/password, trả về user + cặp token
 */
async function login({ email, password }, meta) {
  const user = await userModel.findByEmail(email);

  // Trả về thông báo chung chung (không nói rõ "email không tồn tại" hay "sai mật khẩu")
  // để tránh lộ thông tin cho kẻ tấn công dò email hợp lệ (user enumeration)
  const genericError = 'Email hoặc mật khẩu không chính xác';

  if (!user || !user.is_active) {
    throw new UnauthorizedError(genericError);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError(genericError);
  }

  const userWithPermissions = await userModel.findByIdWithRoleAndPermissions(user.id);
  const tokens = await issueTokens(userWithPermissions, meta);

  await userModel.updateLastLogin(user.id);
  logger.info('Đăng nhập thành công', { userId: user.id });

  // Loại bỏ password_hash trước khi trả về client
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safeUser } = userWithPermissions;
  return { user: safeUser, ...tokens };
}

/**
 * Làm mới access token bằng refresh token hợp lệ.
 * Áp dụng cơ chế "rotation": mỗi lần refresh sẽ thu hồi token cũ và cấp token mới,
 * giúp phát hiện trường hợp refresh token bị đánh cắp và tái sử dụng.
 */
async function refreshAccessToken(refreshToken, meta) {
  let decoded;
  try {
    decoded = jwtUtil.verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn');
  }

  const tokenHash = jwtUtil.hashToken(refreshToken);
  const storedToken = await refreshTokenModel.findByTokenHash(tokenHash);

  if (!storedToken) {
    throw new UnauthorizedError('Refresh token không tồn tại hoặc đã bị thu hồi');
  }

  // Thu hồi token cũ ngay lập tức (rotation)
  await refreshTokenModel.revokeByTokenHash(tokenHash);

  const user = await userModel.findByIdWithRoleAndPermissions(decoded.sub);
  if (!user || !user.is_active) {
    throw new UnauthorizedError('Tài khoản không tồn tại hoặc đã bị khóa');
  }

  return issueTokens(user, meta);
}

/** Đăng xuất: thu hồi refresh token hiện tại */
async function logout(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = jwtUtil.hashToken(refreshToken);
  await refreshTokenModel.revokeByTokenHash(tokenHash);
}

/** Đổi mật khẩu: xác thực mật khẩu hiện tại, sau đó thu hồi toàn bộ refresh token (đăng xuất mọi thiết bị) */
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new UnauthorizedError('Phiên đăng nhập không hợp lệ');
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentValid) {
    throw new ValidationError('Mật khẩu hiện tại không chính xác');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await userModel.updatePassword(userId, newPasswordHash);
  await refreshTokenModel.revokeAllByUserId(userId);

  logger.info('Đổi mật khẩu thành công, đã thu hồi toàn bộ phiên đăng nhập cũ', { userId });
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  changePassword,
};
