/**
 * RefreshToken Model - quản lý vòng đời refresh token trong DB
 * (lưu hash, thu hồi khi logout, dọn dẹp token hết hạn)
 */
const db = require('../config/database');

const TABLE = 'refresh_tokens';

async function create({ userId, tokenHash, userAgent, ipAddress, expiresAt }) {
  const [token] = await db(TABLE)
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      user_agent: userAgent,
      ip_address: ipAddress,
      expires_at: expiresAt,
    })
    .returning('id');
  return token;
}

async function findByTokenHash(tokenHash) {
  return db(TABLE).where({ token_hash: tokenHash, is_revoked: false }).first();
}

async function revokeByTokenHash(tokenHash) {
  return db(TABLE).where({ token_hash: tokenHash }).update({ is_revoked: true });
}

/** Thu hồi toàn bộ refresh token của 1 user (vd: khi đổi mật khẩu, logout-all-devices) */
async function revokeAllByUserId(userId) {
  return db(TABLE).where({ user_id: userId }).update({ is_revoked: true });
}

/** Xóa các token đã hết hạn - dùng cho cron job dọn dẹp định kỳ */
async function deleteExpired() {
  return db(TABLE).where('expires_at', '<', db.fn.now()).del();
}

module.exports = {
  create,
  findByTokenHash,
  revokeByTokenHash,
  revokeAllByUserId,
  deleteExpired,
};
