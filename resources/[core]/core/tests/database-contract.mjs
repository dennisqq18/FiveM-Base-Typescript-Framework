import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(import.meta.dirname, '../../../../database/install.sql'), 'utf8');
for (const token of ['player_id BIGINT UNSIGNED', 'revision INT UNSIGNED', 'checksum VARCHAR(64)', 'request_id VARCHAR(96)', "backend_runtime_foundation", 'CREATE TABLE IF NOT EXISTS rumble_factions', 'CREATE TABLE IF NOT EXISTS rumble_character_factions', "factions_foundation"]) {
  if (!sql.includes(token)) throw new Error(`Database contract missing ${token}`);
}
console.log('database contract test passed');
