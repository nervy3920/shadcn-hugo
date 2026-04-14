CREATE DATABASE IF NOT EXISTS shortlink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shortlink_db;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
