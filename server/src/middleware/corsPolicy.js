const cors = require('cors');

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function matchAllowedOrigin(origin, rule) {
  if (!rule) return false;
  if (rule === '*') return true;
  if (origin === rule) return true;

  if (rule.includes('*')) {
    const escaped = rule
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const re = new RegExp(`^${escaped}$`);
    return re.test(origin);
  }

  return false;
}

function createCorsPolicy(config) {
  function isCorsOriginAllowed(origin) {
    const rules = config.cors.allowedOrigins || [];
    if (!origin) return true;
    if (!rules.length) return true;
    return rules.some((rule) => matchAllowedOrigin(origin, normalizeOrigin(rule)));
  }

  const corsOptions = {
    origin(origin, callback) {
      const normalized = normalizeOrigin(origin);
      if (isCorsOriginAllowed(normalized)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-4A-Auth-Token'],
    maxAge: 86400,
  };

  return {
    corsMiddleware: cors(corsOptions),
    corsPreflight: cors(corsOptions),
    normalizeOrigin,
    isCorsOriginAllowed,
  };
}

module.exports = {
  createCorsPolicy,
};
