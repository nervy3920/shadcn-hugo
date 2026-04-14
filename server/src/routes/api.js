const express = require('express');
const config = require('../config');
const {
  createShortLink,
  getByCode,
  verifyCodeFormat,
  checkPassword,
  markAccessed,
} = require('../shortLinkService');
const { inferFrontendBase } = require('../utils/frontendBase');
const { asString, normalizePanSearchPayload } = require('../utils/panSearchNormalize');

const MINDMAP_SYSTEM_PROMPT = [
  '你是思维导图生成助手。',
  '你只能输出 Markdown 无序列表格式的内容，不要输出任何解释、前后缀、代码块反引号、注释。',
  '输出必须是以下格式（使用破折号 - 作为列表标记，用两个空格进行缩进表示层级）：',
  '- 主题',
  '  - 分支A',
  '    - 子分支',
  '  - 分支B',
  '请保证结构清晰、层级合理、中文表达简洁、每一个步骤都清晰明了并且详细。',
].join('\n');

function normalizeCode(rawCode) {
  return (rawCode || '').trim();
}

function noopAuth(_req, _res, next) {
  next();
}

function normalizeBaseUrl(input) {
  const value = String(input || '').trim();
  if (value.length === 0) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace(/\/+$/, '');
  }
  return `https://${value.replace(/\/+$/, '')}`;
}

function buildAiChatCompletionsUrl(baseUrlInput) {
  const normalized = normalizeBaseUrl(baseUrlInput);
  if (normalized.length === 0) {
    throw new Error('AI_API_BASE_URL is not configured');
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch (_err) {
    throw new Error('AI_API_BASE_URL is invalid');
  }

  const pathname = parsed.pathname.replace(/\/+$/, '');

  if (pathname.length === 0 || pathname === '/') {
    parsed.pathname = '/v1/chat/completions';
    return parsed.toString();
  }

  if (pathname.endsWith('/v1/chat/completions')) {
    parsed.pathname = pathname;
    return parsed.toString();
  }

  if (pathname.endsWith('/chat/completions')) {
    parsed.pathname = pathname;
    return parsed.toString();
  }

  if (pathname.endsWith('/v1')) {
    parsed.pathname = `${pathname}/chat/completions`;
    return parsed.toString();
  }

  parsed.pathname = `${pathname}/v1/chat/completions`;
  return parsed.toString();
}

function createApiRouter(options = {}) {
  const router = express.Router();
  const requireApiAuth = typeof options.requireApiAuth === 'function' ? options.requireApiAuth : noopAuth;

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'shortlink-server', ts: new Date().toISOString() });
  });

  router.get('/pan-search', requireApiAuth, async (req, res, next) => {
    try {
      const kw = asString(req.query.kw).trim();
      if (kw.length === 0) {
        return res.status(400).json({ message: 'kw is required' });
      }
      if (config.panSearch.apiUrl.length === 0) {
        return res.status(503).json({ message: 'PAN_SEARCH_API_URL is not configured' });
      }

      const url = new URL(config.panSearch.apiUrl);
      url.searchParams.set('kw', kw);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.panSearch.timeoutMs);

      let response;
      try {
        const headers = {};
        if (config.panSearch.apiToken.length > 0) {
          headers.Authorization = `Bearer ${config.panSearch.apiToken}`;
        }
        response = await fetch(url.toString(), {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const text = await response.text();
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch (_err) {
        payload = {};
      }

      if (response.ok === false) {
        return res.status(response.status).json({
          message: asString(payload?.message) || 'upstream search api error',
        });
      }

      if (typeof payload?.code === 'number' && payload.code !== 0) {
        return res.status(502).json({
          message: asString(payload?.message) || 'upstream search api returned non-zero code',
        });
      }

      return res.json(normalizePanSearchPayload(payload));
    } catch (err) {
      if (err?.name === 'AbortError') {
        return res.status(504).json({ message: 'pan search timeout' });
      }
      return next(err);
    }
  });

  router.post('/ai/mindmap/stream', requireApiAuth, async (req, res, next) => {
    try {
      const topic = asString(req.body.topic).trim();
      if (topic.length === 0) {
        return res.status(400).json({ message: 'topic is required' });
      }

      if (config.ai.apiBaseUrl.length === 0) {
        return res.status(503).json({ message: 'AI_API_BASE_URL is not configured' });
      }
      if (config.ai.apiKey.length === 0) {
        return res.status(503).json({ message: 'AI_API_KEY is not configured' });
      }

      const url = buildAiChatCompletionsUrl(config.ai.apiBaseUrl);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);

      let upstream;
      try {
        upstream = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.ai.apiKey}`,
          },
          body: JSON.stringify({
            model: config.ai.model,
            stream: true,
            temperature: 0.3,
            messages: [
              { role: 'system', content: MINDMAP_SYSTEM_PROMPT },
              { role: 'user', content: `请根据以下主题生成思维导图：${topic}` },
            ],
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (upstream.ok === false) {
        const errText = await upstream.text();
        let message = 'ai upstream error';
        try {
          const parsed = errText ? JSON.parse(errText) : {};
          message = asString(parsed?.error?.message || parsed?.message || message);
        } catch (_err) {
          message = asString(errText) || message;
        }
        return res.status(upstream.status).json({ message });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');

      const reader = upstream.body?.getReader();
      if (reader == null) {
        return res.status(502).json({ message: 'ai stream body missing' });
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;

        buffer += decoder.decode(chunk.value, { stream: true });

        let boundaryIndex = buffer.indexOf('\n\n');
        while (boundaryIndex >= 0) {
          const rawEvent = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);

          const lines = rawEvent.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:') === false) continue;
            const payload = line.slice(5).trim();
            if (payload.length === 0) continue;
            if (payload === '[DONE]') continue;

            let parsed;
            try {
              parsed = JSON.parse(payload);
            } catch (_err) {
              continue;
            }

            const piece = asString(parsed?.choices?.[0]?.delta?.content);
            if (piece.length > 0) {
              res.write(piece);
            }
          }

          boundaryIndex = buffer.indexOf('\n\n');
        }
      }

      const remain = decoder.decode();
      if (remain.length > 0) {
        res.write(remain);
      }

      return res.end();
    } catch (err) {
      if (err?.name === 'AbortError') {
        if (res.headersSent) {
          res.write('\n\n[error] ai request timeout');
          return res.end();
        }
        return res.status(504).json({ message: 'ai request timeout' });
      }
      return next(err);
    }
  });

  router.post('/short-links', requireApiAuth, async (req, res, next) => {
    try {
      const targetUrl = (req.body.url || '').trim();
      const password = (req.body.password || '').trim();
      const burnAfterRead = Boolean(req.body.burnAfterRead);

      if (targetUrl.length === 0) {
        return res.status(400).json({ message: 'url is required' });
      }

      const code = await createShortLink({
        targetUrl,
        password: password || null,
        burnAfterRead,
      });

      return res.status(201).json({
        code,
        shortUrl: `${inferFrontendBase(req, config.frontendBaseUrl)}/#${encodeURIComponent(code)}`,
        meta: {
          burnAfterRead,
          hasPassword: Boolean(password),
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/short-links/:code', async (req, res, next) => {
    try {
      const code = normalizeCode(req.params.code);
      if (verifyCodeFormat(code) === false) {
        return res.status(400).json({ message: 'invalid code format' });
      }

      const item = await getByCode(code);
      if (item == null) {
        return res.status(404).json({ message: 'not found' });
      }

      if (item.burned_at) {
        return res.status(410).json({ message: 'link already burned' });
      }

      return res.json({
        code: item.code,
        requiresPassword: Boolean(item.password_hash),
        burnAfterRead: Boolean(item.burn_after_read),
        createdAt: item.created_at,
        accessCount: item.access_count,
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/resolve/:code', async (req, res, next) => {
    try {
      const code = normalizeCode(req.params.code);
      if (verifyCodeFormat(code) === false) {
        return res.status(400).json({ message: 'invalid code format' });
      }

      const item = await getByCode(code);
      if (item == null) {
        return res.status(404).json({ message: 'not found' });
      }

      if (item.burned_at) {
        return res.status(410).json({ message: 'link already burned' });
      }

      if (Boolean(item.password_hash)) {
        return res.status(401).json({
          message: 'password required',
          requiresPassword: true,
        });
      }

      await markAccessed(item.id, Boolean(item.burn_after_read));
      return res.json({
        code: item.code,
        targetUrl: item.target_url,
        burnedAfterRead: Boolean(item.burn_after_read),
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/short-links/:code/open', async (req, res, next) => {
    try {
      const code = normalizeCode(req.params.code);
      if (verifyCodeFormat(code) === false) {
        return res.status(400).json({ message: 'invalid code format' });
      }

      const item = await getByCode(code);
      if (item == null) {
        return res.status(404).json({ message: 'not found' });
      }

      if (item.burned_at) {
        return res.status(410).json({ message: 'link already burned' });
      }

      const inputPassword = (req.body.password || '').trim();
      const passwordOk = await checkPassword(inputPassword, item.password_hash);
      if (passwordOk === false) {
        return res.status(401).json({ message: 'password invalid', requiresPassword: true });
      }

      await markAccessed(item.id, Boolean(item.burn_after_read));

      return res.json({
        code: item.code,
        targetUrl: item.target_url,
        burnedAfterRead: Boolean(item.burn_after_read),
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = {
  createApiRouter,
};
