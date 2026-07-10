/**
 * Cấu hình Winston logger - structured JSON logs.
 * - Console: log dạng dễ đọc khi dev
 * - File: log dạng JSON, xoay vòng theo ngày, tách riêng file error và combined
 */
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const env = require('../config/env');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Format hiển thị trên console khi development
const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${ts} [${level}]: ${message} ${metaStr}`;
});

const fileRotateTransportError = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  maxSize: '20m',
});

const fileRotateTransportCombined = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
});

const logger = winston.createLogger({
  level: env.log.level,
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: 'hotel-management-api' },
  transports: [fileRotateTransportError, fileRotateTransportCombined],
  exitOnError: false,
});

// Trong môi trường không phải production, in thêm ra console cho dễ debug
if (!env.isProduction) {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), consoleFormat),
    })
  );
}

module.exports = logger;
