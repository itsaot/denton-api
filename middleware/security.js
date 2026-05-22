const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://dentonvisionmining.co.za',
  'https://www.dentonvisionmining.co.za',
  'https://denton-api.onrender.com',
];

const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
];

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function parseAllowedOrigins() {
  const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const origins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv]);

  if (!isProduction()) {
    for (const origin of DEV_ALLOWED_ORIGINS) {
      origins.add(origin);
    }
  }

  return [...origins];
}

const corsOptions = {
  origin(origin, callback) {
    // Payment webhooks, health checks, and server-to-server calls often omit Origin.
    if (!origin) {
      return callback(null, true);
    }

    const allowed = parseAllowedOrigins();
    if (allowed.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    console.warn(`[cors] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400,
};

function createHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction()
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  });
}

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

function assertProductionSecrets() {
  if (!isProduction()) return;

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.warn('[security] JWT_SECRET should be at least 32 characters in production.');
  }
}

module.exports = {
  corsOptions,
  createHelmetMiddleware,
  authRateLimiter,
  apiRateLimiter,
  assertProductionSecrets,
  parseAllowedOrigins,
};
