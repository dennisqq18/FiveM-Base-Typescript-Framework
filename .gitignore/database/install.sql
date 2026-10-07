CREATE DATABASE IF NOT EXISTS rumble CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE rumble;

CREATE TABLE IF NOT EXISTS rumble_players (
  identifier VARCHAR(96) NOT NULL,
  player_name VARCHAR(64) NOT NULL,
  active_character_id INT UNSIGNED NULL,
  first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (identifier),
  KEY idx_rumble_players_active_character (active_character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rumble_characters (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_identifier VARCHAR(96) NOT NULL,
  citizen_id VARCHAR(32) NOT NULL,
  slot TINYINT UNSIGNED NOT NULL DEFAULT 1,
  first_name VARCHAR(32) NOT NULL,
  last_name VARCHAR(32) NOT NULL,
  date_of_birth DATE NULL,
  cash INT UNSIGNED NOT NULL DEFAULT 500,
  card INT UNSIGNED NOT NULL DEFAULT 5000,
  position_x DECIMAL(11,4) NOT NULL DEFAULT -1037.7200,
  position_y DECIMAL(11,4) NOT NULL DEFAULT -2737.8800,
  position_z DECIMAL(11,4) NOT NULL DEFAULT 20.1700,
  position_heading DECIMAL(7,3) NOT NULL DEFAULT 329.000,
  health SMALLINT UNSIGNED NOT NULL DEFAULT 200,
  armor SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  hunger TINYINT UNSIGNED NOT NULL DEFAULT 100,
  thirst TINYINT UNSIGNED NOT NULL DEFAULT 100,
  last_played TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rumble_citizen_id (citizen_id),
  UNIQUE KEY uq_rumble_character_slot (player_identifier, slot),
  KEY idx_rumble_characters_owner (player_identifier),
  CONSTRAINT fk_rumble_characters_player FOREIGN KEY (player_identifier) REFERENCES rumble_players(identifier) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rumble_migrations (
  version INT UNSIGNED NOT NULL,
  name VARCHAR(96) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_rumble_logs_source_character (source_character_id),
  KEY idx_rumble_logs_target_character (target_character_id),
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

INSERT IGNORE INTO rumble_migrations (version, name) VALUES (1, 'legacy_base');
INSERT IGNORE INTO rumble_migrations (version, name) VALUES (2, 'framework_foundation');
