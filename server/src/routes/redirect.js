const express = require('express');
const config = require('../config');
const { getByCode, verifyCodeFormat, markAccessed } = require('../shortLinkService');
const { pageUrl } = require('../utils/frontendBase');

function normalizeCode(rawCode) {
  return (rawCode || '').trim();
}

function createRedirectRouter() {
  const router = express.Router();

  // Support direct access: domain/Ab12X
  router.get('/:code', async (req, res, next) => {
    try {
      const code = normalizeCode(req.params.code);

      if (!verifyCodeFormat(code)) {
        return next();
      }

      const item = await getByCode(code);
      if (!item) {
        return res.redirect(pageUrl(req, '/tools/short-link/not-found/', { code }, config.frontendBaseUrl));
      }

      if (item.burned_at) {
        return res.redirect(pageUrl(req, '/tools/short-link/burned/', { code }, config.frontendBaseUrl));
      }

      if (item.password_hash) {
        return res.redirect(pageUrl(req, '/tools/short-link/unlock/', { code }, config.frontendBaseUrl));
      }

      await markAccessed(item.id, Boolean(item.burn_after_read));
      return res.redirect(item.target_url);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = {
  createRedirectRouter,
};
