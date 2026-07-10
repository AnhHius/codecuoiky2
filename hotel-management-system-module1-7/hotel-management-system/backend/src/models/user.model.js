/**
 * User Model - tầng truy vấn dữ liệu (Data Access Layer) cho bảng "users".
 * Theo kiến trúc MVC: Model chỉ chứa logic truy vấn DB thuần túy,
 * KHÔNG chứa business logic (business logic nằm ở Service).
 */
const db = require('../config/database');

const TABLE = 'users';

/**
 * Các cột public, an toàn để trả về client (không bao gồm password_hash)
 */
const PUBLIC_COLUMNS = [
  'users.id',
  'users.full_name',
  'users.email',
  'users.phone',
  'users.role_id',
  'users.is_active',
  'users.last_login_at',
  'users.created_at',
];

async function findByEmail(email) {
  return db(TABLE).where({ email }).first();
}

async function findById(id) {
  return db(TABLE).where({ id }).first();
}

/**
 * Lấy thông tin user kèm tên role và danh sách permissions (dùng cho JWT payload / authorize)
 */
async function findByIdWithRoleAndPermissions(id) {
  const user = await db(TABLE)
    .select([...PUBLIC_COLUMNS, 'roles.name as role_name'])
    .join('roles', 'roles.id', 'users.role_id')
    .where('users.id', id)
    .first();

  if (!user) return null;

  const permissions = await db('role_permissions')
    .join('permissions', 'permissions.id', 'role_permissions.permission_id')
    .where('role_permissions.role_id', user.role_id)
    .pluck('permissions.name');

  return { ...user, permissions };
}

async function create(userData) {
  const [user] = await db(TABLE).insert(userData).returning(PUBLIC_COLUMNS);
  return user;
}

async function updateLastLogin(id) {
  return db(TABLE).where({ id }).update({ last_login_at: db.fn.now() });
}

async function updatePassword(id, passwordHash) {
  return db(TABLE).where({ id }).update({ password_hash: passwordHash, updated_at: db.fn.now() });
}

async function emailExists(email) {
  const result = await db(TABLE).where({ email }).first('id');
  return !!result;
}

module.exports = {
  findByEmail,
  findById,
  findByIdWithRoleAndPermissions,
  create,
  updateLastLogin,
  updatePassword,
  emailExists,
  PUBLIC_COLUMNS,
};
