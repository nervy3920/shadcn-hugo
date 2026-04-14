const bcrypt = require('bcryptjs');
const { query } = require('./db');

const SHORT_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHORT_CODE_LEN = 5;
const MAX_CREATE_RETRY = 12;

function generateCode() {
  let code = '';
  for (let i = 0; i < SHORT_CODE_LEN; i += 1) {
    const idx = Math.floor(Math.random() * SHORT_CODE_CHARS.length);
    code += SHORT_CODE_CHARS[idx];
  }
  return code;
}

function isValidHttpUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

async function createShortLink({ targetUrl, password, burnAfterRead }) {
  if (!isValidHttpUrl(targetUrl)) {
    const err = new Error('URL must be a valid http/https address.');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const burnFlag = burnAfterRead ? 1 : 0;

  for (let retry = 0; retry < MAX_CREATE_RETRY; retry += 1) {
    const code = generateCode();
    try {
      await query(
        `INSERT INTO short_links (code, target_url, password_hash, burn_after_read)
         VALUES (?, ?, ?, ?)`,
        [code, targetUrl, passwordHash, burnFlag]
      );
      return code;
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        continue;
      }
      throw err;
    }
  }

  const err = new Error('Unable to allocate short code, please retry.');
  err.statusCode = 503;
  throw err;
}

async function getByCode(code) {
  const rows = await query('SELECT * FROM short_links WHERE code = ? LIMIT 1', [code]);
  return rows[0] || null;
}

function verifyCodeFormat(code) {
  return /^[a-zA-Z0-9]{5}$/.test(code);
}

async function checkPassword(inputPassword, passwordHash) {
  if (!passwordHash) {
    return true;
  }
  if (!inputPassword) {
    return false;
  }
  return bcrypt.compare(inputPassword, passwordHash);
}

async function markAccessed(id, burnAfterRead) {
  if (burnAfterRead) {
    await query(
      `UPDATE short_links
       SET access_count = access_count + 1,
           last_accessed_at = NOW(),
           burned_at = IFNULL(burned_at, NOW())
       WHERE id = ?`,
      [id]
    );
    return;
  }

  await query(
    `UPDATE short_links
     SET access_count = access_count + 1,
         last_accessed_at = NOW()
     WHERE id = ?`,
    [id]
  );
}

module.exports = {
  createShortLink,
  getByCode,
  verifyCodeFormat,
  checkPassword,
  markAccessed,
};
