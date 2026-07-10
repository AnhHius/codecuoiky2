/**
 * Utility xử lý JWT: ký (sign) và xác thực (verify) access token & refresh token.
 * Access token: thời gian sống ngắn, dùng để xác thực mỗi request.
 * Refresh token: thời gian sống dài, dùng để cấp lại access token mới mà không cần login lại.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

/**
 * Hash refresh token trước khi lưu vào DB (không bao giờ lưu plain-text token)
 * Dùng SHA-256 vì đây không phải password cần chống brute-force chậm (đã có JWT signature bảo vệ),
 * chỉ cần tránh lộ token gốc nếu DB bị rò rỉ.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Tính thời điểm hết hạn (Date object) dựa trên chuỗi thời gian kiểu "7d", "15m" */
function getExpiryDate(expiresIn) {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Định dạng thời gian không hợp lệ: ${expiresIn}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const unitToMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

  return new Date(Date.now() + value * unitToMs[unit]);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  getExpiryDate,
};
