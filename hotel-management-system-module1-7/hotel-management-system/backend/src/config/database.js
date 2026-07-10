/**
 * Khởi tạo 1 instance Knex duy nhất (singleton) dùng chung cho toàn bộ app.
 * Tránh việc mỗi file tự require('knex')(config) tạo nhiều connection pool khác nhau.
 */
const knex = require('knex');
const env = require('./env');
const knexConfig = require('./knexfile');

const config = knexConfig[env.env] || knexConfig.development;

const db = knex(config);

module.exports = db;
