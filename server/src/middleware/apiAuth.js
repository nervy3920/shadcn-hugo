const crypto = require('crypto');

function createApiAuth(config, helpers) {
  const { normalizeOrigin, isCorsOriginAllowed } = helpers;
  const usedAuthNonce = new Map();

  function cleanupUsedNonce(nowSec) {
    for (const [nonce, exp] of usedAuthNonce.entries()) {
      if (exp <= nowSec) {
        usedAuthNonce.delete(nonce);
      }
    }
  }

  function signChallengePayload(payloadSegment) {
    const secret = config.frontendAuth.secret || '';
    return crypto.createHmac('sha256', secret).update(payloadSegment).digest('base64url');
  }

  function createChallengeToken(origin) {
    const now = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = {
      nonce,
      iat: now,
      exp: now + config.frontendAuth.challengeTtlSec,
    };

    if (config.frontendAuth.bindOrigin && origin) {
      payload.origin = origin;
    }

    const payloadSegment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = signChallengePayload(payloadSegment);
    return `${payloadSegment}.${signature}`;
  }

  function safeTimingEqual(a, b) {
    const left = Buffer.from(String(a || ''), 'utf8');
    const right = Buffer.from(String(b || ''), 'utf8');
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  }

  function verifyChallengeToken(token, origin) {
    const now = Math.floor(Date.now() / 1000);
    const skew = Math.max(0, Number(config.frontendAuth.clockSkewSec || 0));

    cleanupUsedNonce(now);

    const parts = String(token || '').split('.');
    if (parts.length !== 2) {
      return { ok: false, status: 401, message: 'missing or invalid auth token' };
    }

    const [payloadSegment, signature] = parts;
    const expectedSignature = signChallengePayload(payloadSegment);
    if (!safeTimingEqual(signature, expectedSignature)) {
      return { ok: false, status: 401, message: 'auth token signature invalid' };
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'));
    } catch (err) {
      return { ok: false, status: 401, message: 'auth token payload invalid' };
    }

    const exp = Number(payload.exp || 0);
    const iat = Number(payload.iat || 0);
    const nonce = String(payload.nonce || '');

    if (!nonce || !iat || !exp) {
      return { ok: false, status: 401, message: 'auth token fields missing' };
    }

    if (iat - skew > now) {
      return { ok: false, status: 401, message: 'auth token iat invalid' };
    }

    if (exp + skew < now) {
      return { ok: false, status: 401, message: 'auth token expired' };
    }

    if (config.frontendAuth.bindOrigin) {
      const tokenOrigin = normalizeOrigin(payload.origin || '');
      if (!tokenOrigin || tokenOrigin !== origin) {
        return { ok: false, status: 401, message: 'auth token origin mismatch' };
      }
    }

    if (usedAuthNonce.has(nonce)) {
      return { ok: false, status: 401, message: 'auth token already used' };
    }

    usedAuthNonce.set(nonce, exp + skew);
    return { ok: true };
  }

  function challengeHandler(req, res) {
    if (!config.frontendAuth.enabled) {
      return res.json({ enabled: false });
    }

    if (!config.frontendAuth.secret) {
      return res.status(503).json({ message: 'FRONTEND_AUTH_SECRET is not configured' });
    }

    const origin = normalizeOrigin(req.get('origin') || '');

    if (config.frontendAuth.bindOrigin && !origin) {
      return res.status(400).json({ message: 'origin header is required' });
    }

    if (!isCorsOriginAllowed(origin)) {
      return res.status(403).json({ message: 'origin is not allowed' });
    }

    const token = createChallengeToken(origin);
    res.set('Cache-Control', 'no-store');
    return res.json({
      enabled: true,
      token,
      expiresIn: config.frontendAuth.challengeTtlSec,
      issuedAt: new Date().toISOString(),
    });
  }

  function requireApiAuth(req, res, next) {
    if (!config.frontendAuth.enabled) {
      return next();
    }

    if (!config.frontendAuth.secret) {
      return res.status(503).json({ message: 'frontend auth is enabled but FRONTEND_AUTH_SECRET is not configured' });
    }

    const origin = normalizeOrigin(req.get('origin') || '');

    if (config.frontendAuth.bindOrigin && !origin) {
      return res.status(401).json({ message: 'origin header is required' });
    }

    if (!isCorsOriginAllowed(origin)) {
      return res.status(403).json({ message: 'origin is not allowed' });
    }

    const token = req.get('X-4A-Auth-Token') || '';
    const result = verifyChallengeToken(token, origin);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    return next();
  }

  return {
    challengeHandler,
    requireApiAuth,
  };
}

module.exports = {
  createApiAuth,
};
