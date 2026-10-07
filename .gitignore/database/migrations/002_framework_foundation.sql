CREATE TABLE IF NOT EXISTS rumble_character_metadata (
  character_id INT UNSIGNED NOT NULL,
  meta_key VARCHAR(64) NOT NULL,
  meta_value LONGTEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, meta_key),
  CONSTRAINT fk_rumble_metadata_character FOREIGN KEY (character_id) REFERENCES rumble_characters(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rumble_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category VARCHAR(48) NOT NULL,
  action VARCHAR(64) NOT NULL,
  source_identifier VARCHAR(96) NULL,
  source_character_id INT UNSIGNED NULL,
  target_identifier VARCHAR(96) NULL,
  target_character_id INT UNSIGNED NULL,
  payload LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rumble_logs_category (category, action),
  KEY idx_rumble_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rumble_money_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  character_id INT UNSIGNED NOT NULL,
  account ENUM('cash','card') NOT NULL,
  amount INT NOT NULL,
  balance_after INT UNSIGNED NOT NULL,
  reason VARCHAR(128) NOT NULL,
  actor_identifier VARCHAR(96) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rumble_money_character (character_id, created_at),
  CONSTRAINT fk_rumble_money_character FOREIGN KEY (character_id) REFERENCES rumble_characters(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rumble_inventory (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  character_id INT UNSIGNED NOT NULL,
  slot SMALLINT UNSIGNED NOT NULL,
  item_name VARCHAR(64) NOT NULL,
  amount INT UNSIGNED NOT NULL DEFAULT 1,
  metadata LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rumble_inventory_slot (character_id, slot),
  KEY idx_rumble_inventory_item (character_id, item_name),
  CONSTRAINT fk_rumble_inventory_character FOREIGN KEY (character_id) REFERENCES rumble_characters(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rumble_owned_vehicles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  character_id INT UNSIGNED NOT NULL,
  plate VARCHAR(12) NOT NULL,
  model VARCHAR(64) NOT NULL,
  garage VARCHAR(64) NOT NULL DEFAULT 'legion',
  stored TINYINT(1) NOT NULL DEFAULT 1,
  fuel DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  engine_health DECIMAL(8,2) NOT NULL DEFAULT 1000.00,
  body_health DECIMAL(8,2) NOT NULL DEFAULT 1000.00,
  properties LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rumble_vehicle_plate (plate),
  KEY idx_rumble_vehicle_owner (character_id),
  CONSTRAINT fk_rumble_vehicle_character FOREIGN KEY (character_id) REFERENCES rumble_characters(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO rumble_migrations (version, name) VALUES (2, 'framework_foundation');
