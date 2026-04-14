const mysql = require('mysql2/promise');
const config = require('./config');

let pool;

function buildPool(databaseName) {
  const options = {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci',
  };

  if (databaseName) {
    options.database = databaseName;
  }

  return mysql.createPool(options);
}

function safeDbName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe database name: ${name}`);
  }
  return name;
}

async function ensureDatabaseExists() {
  const dbName = safeDbName(config.db.database);
  const adminPool = buildPool();
  try {
    await adminPool.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await adminPool.end();
  }
}

async function ensurePool() {
  if (pool) {
    return pool;
  }

  pool = buildPool(config.db.database);
  try {
    await pool.query('SELECT 1');
    return pool;
  } catch (err) {
    if (err && err.code === 'ER_BAD_DB_ERROR') {
      await pool.end();
      pool = undefined;
      await ensureDatabaseExists();
      pool = buildPool(config.db.database);
      await pool.query('SELECT 1');
      return pool;
    }
    throw err;
  }
}

async function ensureSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS short_links (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      code CHAR(5) NOT NULL,
      target_url TEXT NOT NULL,
      password_hash VARCHAR(255) DEFAULT NULL,
      burn_after_read TINYINT(1) NOT NULL DEFAULT 0,
      access_count INT UNSIGNED NOT NULL DEFAULT 0,
      burned_at DATETIME DEFAULT NULL,
      last_accessed_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_code (code),
      KEY idx_created_at (created_at),
      KEY idx_burned_at (burned_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await query(sql);
}

async function query(sql, params = []) {
  await ensurePool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function testConnection() {
  await query('SELECT 1');
}

module.exports = {
  query,
  testConnection,
  ensureSchema,
  ensurePool,
};
