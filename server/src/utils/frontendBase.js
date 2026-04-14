function trimTrailingSlash(value) {
  return (value || '').replace(/\/+$/, '');
}

function inferFrontendBase(req, frontendBaseUrl = '') {
  if (frontendBaseUrl) {
    return frontendBaseUrl;
  }

  const origin = trimTrailingSlash(req.get('origin') || '');
  if (origin) {
    return origin;
  }

  const referer = req.get('referer') || '';
  try {
    const parsed = new URL(referer);
    return trimTrailingSlash(parsed.origin);
  } catch (err) {
    // ignore parse error and fallback
  }

  return `${req.protocol}://${req.get('host')}`;
}

function pageUrl(req, path, query = {}, frontendBaseUrl = '') {
  const qs = new URLSearchParams(query).toString();
  const base = inferFrontendBase(req, frontendBaseUrl);
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

module.exports = {
  trimTrailingSlash,
  inferFrontendBase,
  pageUrl,
};
