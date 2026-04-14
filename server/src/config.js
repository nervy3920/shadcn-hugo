const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function trimTrailingSlash(value) {
  return (value || '').replace(/\/+$/, '');
}

function splitCsv(value) {
  if (String(value || '').length === 0) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shortlink_db',
  },
  frontendBaseUrl: trimTrailingSlash(process.env.FRONTEND_BASE_URL || ''),
  shortlinkBaseUrl: trimTrailingSlash(process.env.SHORTLINK_BASE_URL || ''),
  cors: {
    allowedOrigins: splitCsv(process.env.CORS_ALLOWED_ORIGINS || ''),
  },
  frontendAuth: {
    enabled: String(process.env.FRONTEND_AUTH_ENABLED || 'true') === 'true',
    secret: process.env.FRONTEND_AUTH_SECRET || '',
    challengeTtlSec: Number(process.env.FRONTEND_AUTH_CHALLENGE_TTL_SEC || 90),
    clockSkewSec: Number(process.env.FRONTEND_AUTH_CLOCK_SKEW_SEC || 15),
    bindOrigin: String(process.env.FRONTEND_AUTH_BIND_ORIGIN || 'true') === 'true',
  },
  panSearch: {
    apiUrl: trimTrailingSlash(process.env.PAN_SEARCH_API_URL || ''),
    apiToken: process.env.PAN_SEARCH_API_TOKEN || '',
    timeoutMs: Number(process.env.PAN_SEARCH_TIMEOUT_MS || 12000),
  },
  ai: {
    apiBaseUrl: process.env.AI_API_BASE_URL || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 60000),
  },
};

module.exports = config;
