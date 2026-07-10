/**
 * Khởi tạo Express application: cấu hình các middleware toàn cục
 * (bảo mật, parsing, logging, rate limit) và gắn router gốc.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const xssClean = require('xss-clean');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// ===== Security middleware =====
app.use(helmet()); // Set các HTTP header bảo mật (CSP, HSTS, X-Frame-Options...)
app.use(
  cors({
    origin: env.app.clientUrl,
    credentials: true, // Cho phép gửi cookie (refresh token) kèm request
  })
);
app.use(hpp()); // Chống HTTP Parameter Pollution
app.use(xssClean()); // Sanitize input chống XSS injection

// ===== Body & cookie parsing =====
app.use(express.json({ limit: '10kb' })); // Giới hạn payload tránh DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression()); // Nén response giúp tăng performance

// ===== Rate limiting (chống brute-force, DoS) =====
const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau', errorCode: 'TOO_MANY_REQUESTS' },
});
app.use(`/api/${env.app.apiVersion}`, globalLimiter);

// ===== Request logging =====
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

// ===== Health check =====
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ===== API routes =====
app.use(`/api/${env.app.apiVersion}`, routes);

// ===== 404 & Error handling (luôn đặt cuối cùng) =====
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
