const express = require('express');
const helmet = require('helmet');
const config = require('./config');
const { createCorsPolicy } = require('./middleware/corsPolicy');
const { createApiAuth } = require('./middleware/apiAuth');
const { createApiRouter } = require('./routes/api');
const { createRedirectRouter } = require('./routes/redirect');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));

const corsPolicy = createCorsPolicy(config);
app.use(corsPolicy.corsMiddleware);
app.options('*', corsPolicy.corsPreflight);

const apiAuth = createApiAuth(config, {
  normalizeOrigin: corsPolicy.normalizeOrigin,
  isCorsOriginAllowed: corsPolicy.isCorsOriginAllowed,
});

// Public auth challenge endpoint (outside /api).
app.get('/auth/challenge', apiAuth.challengeHandler);

// API routes with selective protection in router (e.g. create short link).
app.use('/api', createApiRouter({ requireApiAuth: apiAuth.requireApiAuth }));

// 404 fallback for /api.
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'api endpoint not found' });
});

// Support direct access: /Ab12X
app.use(createRedirectRouter());

app.use((err, _req, res, _next) => {
  const statusCode = Number(err.statusCode) || 500;
  if (statusCode >= 500) {
    console.error('[server-error]', err);
  }
  res.status(statusCode).json({ message: err.message || 'internal server error' });
});

module.exports = app;
