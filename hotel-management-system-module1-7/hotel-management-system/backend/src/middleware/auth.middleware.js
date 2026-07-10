/**
 * Middleware xác thực (authenticate) và phân quyền (authorize) theo mô hình RBAC.
 *
 * authenticate: kiểm tra JWT access token hợp lệ, gắn thông tin user vào req.user
 * authorize(...permissions): kiểm tra user có ĐỦ các permission yêu cầu hay không
 *   (dùng sau authenticate, vì cần req.user đã có sẵn permissions từ token payload)
 */
const jwtUtil = require('../utils/jwt');
const userModel = require('../models/user.model');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Trích xuất access token từ header "Authorization: Bearer <token>"
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

const authenticate = catchAsync(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError('Vui lòng đăng nhập để tiếp tục');
  }

  let decoded;
  try {
    decoded = jwtUtil.verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Token không hợp lệ hoặc đã hết hạn');
  }

  // Lấy lại thông tin user mới nhất từ DB (không tin tưởng tuyệt đối payload cũ trong token,
  // phòng trường hợp user bị khóa hoặc đổi quyền sau khi token đã được cấp)
  const user = await userModel.findByIdWithRoleAndPermissions(decoded.sub);
  if (!user || !user.is_active) {
    throw new UnauthorizedError('Tài khoản không tồn tại hoặc đã bị khóa');
  }

  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safeUser } = user;
  req.user = safeUser;
  next();
});

/**
 * Middleware factory kiểm tra quyền hạn (permission-based authorization).
 * Cách dùng: router.post('/rooms', authenticate, authorize('room:create'), controller)
 *
 * Mặc định yêu cầu user phải có TẤT CẢ permissions truyền vào (logic AND).
 */
function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Vui lòng đăng nhập để tiếp tục'));
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      return next(new ForbiddenError('Bạn không có quyền thực hiện hành động này'));
    }

    return next();
  };
}

/**
 * Biến thể authorize: chỉ cần có ÍT NHẤT MỘT trong các permission (logic OR).
 * Hữu ích khi nhiều role khác nhau có thể cùng truy cập 1 endpoint qua các quyền khác nhau.
 */
function authorizeAny(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Vui lòng đăng nhập để tiếp tục'));
    }

    const userPermissions = req.user.permissions || [];
    const hasAnyPermission = permissions.some((perm) => userPermissions.includes(perm));

    if (!hasAnyPermission) {
      return next(new ForbiddenError('Bạn không có quyền thực hiện hành động này'));
    }

    return next();
  };
}

module.exports = { authenticate, authorize, authorizeAny };
