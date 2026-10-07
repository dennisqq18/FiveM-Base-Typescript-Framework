CREATE TABLE IF NOT EXISTS rumble_migrations (
  version INT UNSIGNED NOT NULL,
  name VARCHAR(96) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO rumble_migrations (version, name) VALUES (1, 'legacy_base');
