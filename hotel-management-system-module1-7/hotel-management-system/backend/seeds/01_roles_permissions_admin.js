/**
 * Seed: Khởi tạo roles, permissions cơ bản và tài khoản Admin mặc định
 * cho hệ thống quản lý khách sạn.
 */
const bcrypt = require('bcrypt');
const env = require('../src/config/env');

exports.seed = async function (knex) {
  // Xóa dữ liệu cũ theo đúng thứ tự (tránh lỗi FK constraint)
  await knex('role_permissions').del();
  await knex('users').del();
  await knex('permissions').del();
  await knex('roles').del();

  // 1. Tạo roles
  const roles = await knex('roles')
    .insert([
      { name: 'admin', description: 'Quản trị viên hệ thống - toàn quyền' },
      { name: 'manager', description: 'Quản lý khách sạn' },
      { name: 'receptionist', description: 'Lễ tân - xử lý đặt phòng, check-in/out' },
      { name: 'housekeeping', description: 'Nhân viên buồng phòng' },
      { name: 'accountant', description: 'Kế toán - quản lý thanh toán, hóa đơn' },
    ])
    .returning(['id', 'name']);

  const roleMap = roles.reduce((acc, r) => ({ ...acc, [r.name]: r.id }), {});

  // 2. Tạo permissions theo định dạng <resource>:<action>
  const permissionNames = [
    'room:create', 'room:read', 'room:update', 'room:delete',
    'booking:create', 'booking:read', 'booking:update', 'booking:cancel', 'booking:checkin', 'booking:checkout',
    'guest:create', 'guest:read', 'guest:update',
    'invoice:create', 'invoice:read', 'payment:create',
    'report:view',
    'user:manage',
  ];
  const permissions = await knex('permissions')
    .insert(permissionNames.map((name) => ({ name, description: name })))
    .returning(['id', 'name']);

  const permMap = permissions.reduce((acc, p) => ({ ...acc, [p.name]: p.id }), {});

  // 3. Gán permissions cho từng role
  const rolePermissionMap = {
    admin: permissionNames, // Admin có tất cả quyền
    manager: permissionNames.filter((p) => !p.startsWith('user:')),
    receptionist: [
      'room:read', 'booking:create', 'booking:read', 'booking:update',
      'booking:cancel', 'booking:checkin', 'booking:checkout',
      'guest:create', 'guest:read', 'guest:update', 'invoice:create', 'invoice:read',
    ],
    housekeeping: ['room:read', 'room:update'],
    accountant: ['invoice:read', 'invoice:create', 'payment:create', 'report:view'],
  };

  const rolePermissionRows = [];
  Object.entries(rolePermissionMap).forEach(([roleName, perms]) => {
    perms.forEach((permName) => {
      rolePermissionRows.push({ role_id: roleMap[roleName], permission_id: permMap[permName] });
    });
  });
  await knex('role_permissions').insert(rolePermissionRows);

  // 4. Tạo tài khoản Admin mặc định
  const passwordHash = await bcrypt.hash('Admin@123456', env.bcrypt.saltRounds);
  await knex('users').insert({
    full_name: 'System Administrator',
    email: 'admin@hotel.com',
    password_hash: passwordHash,
    role_id: roleMap.admin,
    is_active: true,
  });
};
