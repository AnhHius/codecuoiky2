/**
 * Cấu hình Knex.js cho từng môi trường (development/test/production)
 * Dùng chung 1 file config, knex CLI sẽ tự chọn theo NODE_ENV
 */
const env = require('./env');
const path = require('path');

const baseConfig = {
  client: 'pg',
  connection: {
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
  },
  pool: {
    min: env.db.poolMin,
    max: env.db.poolMax,
  },
  migrations: {
    directory: path.join(__dirname, '../../migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.join(__dirname, '../../seeds'),
  },
};

module.exports = {
  development: baseConfig,
  test: {
    ...baseConfig,
    connection: {
      ...baseConfig.connection,
      database: `${env.db.name}_test`,
    },
  },
  production: {
    ...baseConfig,
    pool: {
      min: env.db.poolMin,
      max: env.db.poolMax,
    },
    ssl: { rejectUnauthorized: false },
  },
};
