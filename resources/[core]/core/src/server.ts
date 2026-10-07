
type MoneyAccount = 'cash' | 'card';
type NeedType = 'hunger' | 'thirst';
type VitalType = 'health' | 'armor';
type DeathState = 'alive' | 'downed' | 'dead' | 'respawning';

interface InventorySlot {
  id: number;
  slot: number;
  name: string;
  amount: number;
  metadata: Record<string, any>;
}

interface ItemDefinition {
  name: string;
  label: string;
  weight: number;
  stackable: boolean;
  usable: boolean;
}

interface OwnedVehicle {
  id: number;
  characterId: number;
  plate: string;
  model: string;
  garage: string;
  stored: boolean;
  fuel: number;
  engineHealth: number;
  bodyHealth: number;
  properties: Record<string, any>;
}

interface Position {
  x: number;
  y: number;
  z: number;
  heading: number;
}

interface Character {
  id: number;
  citizenId: string;
  slot: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  cash: number;
  card: number;
  position: Position;
  health: number;
  armor: number;
  hunger: number;
  thirst: number;
}

interface PlayerSession {
  source: number;
  identifier: string;
  playerName: string;
  character: Character;
  metadata: Record<string, any>;
  inventory: InventorySlot[];
  spawned: boolean;
  revision: number;
  savedRevision: number;
}

const RESOURCE = GetCurrentResourceName();
const MAX_HEALTH = 200;
const MAX_ARMOR = 100;
const DEFAULT_SPAWN: Position = {
  x: -1037.72,
  y: -2737.88,
  z: 20.17,
  heading: 329.0,
};

const SPAWNS = {
  last: { id: 'last', label: 'Last Location' },
  airport: { id: 'airport', label: 'Airport', position: DEFAULT_SPAWN },
  legion: { id: 'legion', label: 'Legion Square', position: { x: 215.76, y: -810.12, z: 30.73, heading: 158.0 } },
  hospital: { id: 'hospital', label: 'Pillbox Hospital', position: { x: 298.18, y: -584.45, z: 43.26, heading: 70.0 } },
} as const;



const ITEM_DEFINITIONS: Record<string, ItemDefinition> = Object.freeze({
  water: { name: 'water', label: 'Water', weight: 500, stackable: true, usable: true },
  sandwich: { name: 'sandwich', label: 'Sandwich', weight: 350, stackable: true, usable: true },
  medkit: { name: 'medkit', label: 'Medkit', weight: 900, stackable: true, usable: true },
  armor: { name: 'armor', label: 'Body Armor', weight: 2500, stackable: true, usable: true },
});

const sessions = new PlayerCache<PlayerSession>();
const loadingPlayers = new Set<number>();
const creatingCharacters = new Set<number>();
const rpcHandlers = new Map<string, (source: number, payload: any) => any>();
let databaseReady = false;
let autosaveRunning = false;

const playerRepository = new PlayerRepository();
const characterRepository = new CharacterRepository();
const metadataRepository = new MetadataRepository();
const inventoryRepository = new InventoryRepository();
const vehicleRepository = new VehicleRepository();
const moneyRepository = new MoneyRepository();
const logRepository = new LogRepository();
const migrationRepository = new MigrationRepository();
const frozenPlayers = new Set<number>();
let lastHealthCheck: Record<string, any> = {};

function message(source: number, text: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  const prefix = kind === 'error' ? '^1Rumble' : kind === 'success' ? '^2Rumble' : '^5Rumble';
  emitNet('chat:addMessage', source, {
    color: [255, 255, 255],
    multiline: false,
    args: [prefix, text],
  });
}

function isAdmin(source: number): boolean {
  if (source === 0) return true;
  if (!Config.adminIdentifier || Config.adminIdentifier.includes('PASTE_')) return false;
  return getPlayerIdentifiers(source).includes(Config.adminIdentifier);
}

function requireAdmin(source: number): boolean {
  if (isAdmin(source)) return true;
  message(source, 'You do not have access to Rumble administrative commands.', 'error');
  return false;
}

function allowRate(source: number, key: string, limit: number, windowMs: number): boolean {
  const allowed = Security.allow(source, key, limit, windowMs);
  if (!allowed && Security.shouldReport(source, key)) {
    Logger.security('Rate limit exceeded', { source, key, limit, windowMs });
    void logAction('security', 'rate_limit', source, source, { key, limit, windowMs });
  }
  return allowed;
}

function rejectSecurity(source: number, action: string, payload: Record<string, any> = {}): void {
  Logger.security(action, { source, ...payload });
  void logAction('security', action, source, source, payload);
}

function setPlayerState(source: number, key: string, value: any): void {
  try {
    const playerFactory = (globalThis as any).Player;
    const player = typeof playerFactory === 'function' ? playerFactory(source) : null;
    if (player?.state?.set) player.state.set(key, value, true);
  } catch {}
}

function toCharacter(row: any): Character {
  return {
    id: Number(row.id),
    citizenId: String(row.citizen_id),
    slot: Number(row.slot),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    dateOfBirth: normalizeDateOfBirth(row.date_of_birth),
    cash: Number(row.cash),
    card: Number(row.card ?? row.bank ?? 0),
    position: {
      x: Number(row.position_x),
      y: Number(row.position_y),
      z: Number(row.position_z),
      heading: Number(row.position_heading),
    },
    health: Number(row.health ?? 200),
    armor: Number(row.armor ?? 0),
    hunger: Number(row.hunger ?? 100),
    thirst: Number(row.thirst ?? 100),
  };
}

function publicPlayer(session: PlayerSession): any {
  return {
    source: session.source,
    identifier: session.identifier,
    name: session.playerName,
    character: {
      ...session.character,
      position: { ...session.character.position },
    },
  };
}

function publicInventory(session: PlayerSession): InventorySlot[] {
  return session.inventory.map((item) => ({
    id: item.id,
    slot: item.slot,
    name: item.name,
    amount: item.amount,
    metadata: { ...item.metadata },
  }));
}

function publicMetadata(session: PlayerSession): Record<string, any> {
  return { ...session.metadata };
}

function syncStateBag(session: PlayerSession): void {
  setPlayerState(session.source, 'rumbleLoaded', session.spawned);
  setPlayerState(session.source, 'rumbleCharacterId', session.character.id);
  setPlayerState(session.source, 'rumbleCitizenId', session.character.citizenId);
  setPlayerState(session.source, 'rumbleCash', session.character.cash);
  setPlayerState(session.source, 'rumbleCard', session.character.card);
  setPlayerState(session.source, 'rumbleHunger', session.character.hunger);
  setPlayerState(session.source, 'rumbleThirst', session.character.thirst);
  setPlayerState(session.source, 'rumbleDeathState', String(session.metadata.deathState ?? 'alive'));
  setPlayerState(session.source, 'rumbleAdmin', isAdmin(session.source));
}

async function logAction(
  category: string,
  action: string,
  source: number | null,
  target: number | null,
  payload: Record<string, any> = {},
): Promise<void> {
  if (!databaseReady) return;
  try {
    const sourceSession = source !== null ? sessions.get(source) : null;
    const targetSession = target !== null ? sessions.get(target) : null;
    const sourceIdentifier = source === 0 ? 'console' : sourceSession?.identifier ?? (source !== null ? getPrimaryIdentifier(source) : null);
    const targetIdentifier = targetSession?.identifier ?? (target !== null ? getPrimaryIdentifier(target) : null);
    await logRepository.insert({
      category,
      action,
      sourceIdentifier,
      sourceCharacterId: sourceSession?.character.id ?? null,
      targetIdentifier,
      targetCharacterId: targetSession?.character.id ?? null,
      payload: JSON.stringify(payload),
    });
  } catch (error) {
    Logger.error('DATABASE', 'Could not persist structured log', { category, action, error: String(error) });
  }
}

async function recordMigration(version: number, name: string): Promise<void> {
  await migrationRepository.record(version, name);
}

async function migrationExists(version: number): Promise<boolean> {
  return await migrationRepository.exists(version);
}

async function runMigration(version: number, name: string, handler: () => Promise<void>): Promise<void> {
  if (await migrationExists(version)) return;
  await handler();
  await recordMigration(version, name);
}

async function loadMetadata(characterId: number): Promise<Record<string, any>> {
  const rows = await metadataRepository.list(characterId);
  const metadata: Record<string, any> = {};
  for (const row of rows) metadata[String(row.meta_key)] = safeJsonParse(row.meta_value, null);
  if (!metadata.deathState) metadata.deathState = 'alive';
  return metadata;
}

async function loadInventory(characterId: number): Promise<InventorySlot[]> {
  const rows = await inventoryRepository.list(characterId);
  return rows.map((row) => ({
    id: Number(row.id),
    slot: Number(row.slot),
    name: String(row.item_name),
    amount: Number(row.amount),
    metadata: safeJsonParse(row.metadata, {}),
  }));
}

async function seedStarterItems(characterId: number): Promise<void> {
  if (await inventoryRepository.hasAny(characterId)) return;
  const starter: Array<[number, string, number]> = [
    [1, 'water', 2],
    [2, 'sandwich', 2],
    [3, 'medkit', 1],
  ];
  for (const [slot, name, amount] of starter) await inventoryRepository.insert(characterId, slot, name, amount, '{}');
}

async function initializeDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await dbQuery('SELECT 1 AS ok');
      break;
    } catch (error) {
      if (attempt === 30) throw error;
      Logger.info('DATABASE', 'Waiting for database', { attempt, maximum: 30 });
      await delay(1000);
    }
  }

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS rumble_players (
      identifier VARCHAR(96) NOT NULL,
      player_name VARCHAR(64) NOT NULL,
      active_character_id INT UNSIGNED NULL,
      first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (identifier),
      KEY idx_rumble_players_active_character (active_character_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbQuery(`
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
      CONSTRAINT fk_rumble_characters_player
        FOREIGN KEY (player_identifier) REFERENCES rumble_players(identifier)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const activeCharacterColumn = await dbQuery<any[]>("SHOW COLUMNS FROM rumble_players LIKE 'active_character_id'");
  if (activeCharacterColumn.length === 0) {
    await dbQuery('ALTER TABLE rumble_players ADD COLUMN active_character_id INT UNSIGNED NULL AFTER player_name');
    await dbQuery('ALTER TABLE rumble_players ADD KEY idx_rumble_players_active_character (active_character_id)');
  }

  const updatedAtColumn = await dbQuery<any[]>("SHOW COLUMNS FROM rumble_characters LIKE 'updated_at'");
  if (updatedAtColumn.length === 0) {
    await dbQuery('ALTER TABLE rumble_characters ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  }

  const dateOfBirthColumn = await dbQuery<any[]>("SHOW COLUMNS FROM rumble_characters LIKE 'date_of_birth'");
  if (dateOfBirthColumn.length === 0) {
    await dbQuery('ALTER TABLE rumble_characters ADD COLUMN date_of_birth DATE NULL AFTER last_name');
  }

  const hungerColumn = await dbQuery<any[]>("SHOW COLUMNS FROM rumble_characters LIKE 'hunger'");
  if (hungerColumn.length === 0) {
    await dbQuery('ALTER TABLE rumble_characters ADD COLUMN hunger TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER armor');
  }

  const thirstColumn = await dbQuery<any[]>("SHOW COLUMNS FROM rumble_characters LIKE 'thirst'");
  if (thirstColumn.length === 0) {
    await dbQuery('ALTER TABLE rumble_characters ADD COLUMN thirst TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER hunger');
  }

  const cardColumn = await dbQuery<any[]>("SHOW COLUMNS FROM rumble_characters LIKE 'card'");
  if (cardColumn.length === 0) {
    await dbQuery('ALTER TABLE rumble_characters ADD COLUMN card INT UNSIGNED NOT NULL DEFAULT 5000 AFTER cash');
    const bankColumn = await dbQuery<any[]>("SHOW COLUMNS FROM rumble_characters LIKE 'bank'");
    if (bankColumn.length > 0) {
      await dbQuery('UPDATE rumble_characters SET card = bank');
    }
  }

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS rumble_migrations (
      version INT UNSIGNED NOT NULL,
      name VARCHAR(96) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await recordMigration(1, 'legacy_base');

  await runMigration(2, 'framework_foundation', async () => {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS rumble_character_metadata (
        character_id INT UNSIGNED NOT NULL,
        meta_key VARCHAR(64) NOT NULL,
        meta_value LONGTEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (character_id, meta_key),
        CONSTRAINT fk_rumble_metadata_character FOREIGN KEY (character_id) REFERENCES rumble_characters(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await dbQuery(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await dbQuery(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await dbQuery(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await dbQuery(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  });

  databaseReady = true;
  Logger.info('DATABASE', 'Database ready');
}

async function performHealthCheck(): Promise<Record<string, any>> {
  const resourceState = (globalThis as any).GetResourceState;
  const oxState = typeof resourceState === 'function' ? String(resourceState('oxmysql')) : 'unknown';
  const mysqlConnection = GetConvar('mysql_connection_string', '').trim();
  const onesync = GetConvar('onesync', '').trim();
  let database = false;
  let migration = 0;
  let databaseError = '';

  try {
    await dbQuery('SELECT 1 AS ok');
    database = true;
    migration = await migrationRepository.latest();
  } catch (error) {
    databaseError = String(error);
  }

  const adminConfigured = Boolean(Config.adminIdentifier && !Config.adminIdentifier.includes('PASTE_'));
  const result = {
    ok: oxState === 'started' && database && migration >= Config.expectedMigration && Boolean(mysqlConnection),
    resource: RESOURCE,
    expectedResource: 'core',
    oxmysql: oxState,
    mysqlConfigured: Boolean(mysqlConnection),
    database,
    databaseError,
    migration,
    expectedMigration: Config.expectedMigration,
    adminConfigured,
    onesync,
    cachePlayers: sessions.size,
    timestamp: new Date().toISOString(),
  };

  lastHealthCheck = result;

  Logger.info('HEALTH', 'Startup health check', result);
  if (RESOURCE !== 'core') Logger.warn('HEALTH', 'Resource should be named core for the default configuration', { resource: RESOURCE });
  if (!adminConfigured) Logger.warn('HEALTH', 'Admin identifier is not configured');
  if (!result.ok) Logger.error('HEALTH', 'One or more critical startup checks failed', result);

  return result;
}

async function upsertPlayer(source: number, identifier: string): Promise<void> {
  await playerRepository.upsert(identifier, GetPlayerName(source) ?? `Player ${source}`);
}

function makeCitizenId(): string {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RMB-${time}-${random}`.slice(0, 32);
}

async function listCharacters(identifier: string): Promise<Character[]> {
  return (await characterRepository.list(identifier)).map(toCharacter);
}

function characterSummary(character: Character, activeCharacterId = 0): any {
  return {
    id: character.id,
    citizenId: character.citizenId,
    slot: character.slot,
    firstName: character.firstName,
    lastName: character.lastName,
    dateOfBirth: character.dateOfBirth,
    cash: character.cash,
    card: character.card,
    active: character.id === activeCharacterId,
  };
}

async function showCharacterSelector(source: number, identifier: string): Promise<void> {
  const characters = await listCharacters(identifier);
  const playerRow = await playerRepository.get(identifier);
  const activeCharacterId = Number(playerRow?.active_character_id ?? 0);
  emitNet('rumble:character:selectorRequired', source, {
    characters: characters.map((character) => characterSummary(character, activeCharacterId)),
    maxCharacters: Config.maxCharacters,
  });
}

async function createCharacter(
  identifier: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
): Promise<Character> {
  const maxCharacters = Config.maxCharacters;
  const existing = await listCharacters(identifier);
  if (existing.length >= maxCharacters) {
    throw new Error(`You have reached the limit of ${maxCharacters} characters.`);
  }

  const usedSlots = new Set(existing.map((character) => character.slot));
  let slot = 1;
  while (usedSlots.has(slot)) slot++;

  const defaultCash = Config.defaultCash;
  const defaultCard = Config.defaultCard;

  let insertedId = 0;
  for (let attempt = 0; attempt < 5 && !insertedId; attempt++) {
    const citizenId = makeCitizenId();
    try {
      insertedId = await characterRepository.insert({
        identifier,
        citizenId,
        slot,
        firstName,
        lastName,
        dateOfBirth,
        cash: defaultCash,
        card: defaultCard,
        position: DEFAULT_SPAWN,
      });
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }

  await seedStarterItems(insertedId);
  if (defaultCash > 0) {
    await moneyRepository.record(insertedId, 'cash', defaultCash, defaultCash, 'character:create', 'system');
  }
  if (defaultCard > 0) {
    await moneyRepository.record(insertedId, 'card', defaultCard, defaultCard, 'character:create', 'system');
  }
  const row = await characterRepository.getByIdOnly(insertedId);
  if (!row) throw new Error('The character was created but could not be loaded.');
  return toCharacter(row);
}

function markDirty(session: PlayerSession): void {
  session.revision++;
}

async function saveSession(session: PlayerSession, force = false): Promise<void> {
  if (!force && session.revision <= session.savedRevision) return;
  const revision = session.revision;
  const c = session.character;
  await characterRepository.saveState(c.id, session.identifier, {
    position: { ...c.position },
    health: clampNumber(Math.floor(c.health), 0, MAX_HEALTH),
    armor: clampNumber(Math.floor(c.armor), 0, MAX_ARMOR),
    hunger: clampNumber(Math.floor(c.hunger), 0, 100),
    thirst: clampNumber(Math.floor(c.thirst), 0, 100),
  });
  session.savedRevision = Math.max(session.savedRevision, revision);
}

async function flushDirtySessions(): Promise<void> {
  if (autosaveRunning || !databaseReady || sessions.size === 0) return;

  const pending = Array.from(sessions.values()).filter((session) => session.revision > session.savedRevision);
  if (pending.length === 0) return;

  autosaveRunning = true;
  try {
    const results = await Promise.allSettled(pending.map((session) => saveSession(session)));
    for (const result of results) {
      if (result.status === 'rejected') Logger.error('DATABASE', 'Autosave failed', { error: String(result.reason) });
    }
  } finally {
    autosaveRunning = false;
  }
}

async function selectCharacter(source: number, identifier: string, character: Character): Promise<void> {
  const existing = sessions.get(source);
  if (existing) await saveSession(existing, true);

  const [metadata, inventory] = await Promise.all([
    loadMetadata(character.id),
    loadInventory(character.id),
  ]);

  const session: PlayerSession = {
    source,
    identifier,
    playerName: GetPlayerName(source) ?? `Player ${source}`,
    character,
    metadata,
    inventory,
    spawned: false,
    revision: 0,
    savedRevision: 0,
  };

  sessions.set(source, session);
  await Promise.all([
    characterRepository.touch(character.id, identifier),
    playerRepository.setActiveCharacter(identifier, character.id),
  ]);

  syncStateBag(session);
  emitNet('rumble:character:selected', source, {
    player: publicPlayer(session),
    metadata: publicMetadata(session),
    inventory: publicInventory(session),
    spawns: Object.values(SPAWNS),
  });
  emit('rumble:server:characterLoaded', source, publicPlayer(session));
  void logAction('character', 'selected', source, source, { characterId: character.id, citizenId: character.citizenId });
}

async function loadPlayer(source: number): Promise<void> {
  if (sessions.has(source) || loadingPlayers.has(source)) return;

  loadingPlayers.add(source);
  try {
    for (let attempt = 0; attempt < 30 && !databaseReady; attempt++) {
      if (!GetPlayerName(source)) return;
      await delay(1000);
    }

    if (!databaseReady) {
      message(source, 'The database is unavailable.', 'error');
      return;
    }

    const identifier = getPrimaryIdentifier(source);
    if (!identifier) {
      message(source, 'No valid FiveM/license identifier was found.', 'error');
      return;
    }

    await upsertPlayer(source, identifier);

    const characters = await listCharacters(identifier);
    if (characters.length === 0) {
      emitNet('rumble:character:registrationRequired', source, { mode: 'create', firstName: '', lastName: '' });
      return;
    }

    const incomplete = characters.find((character) => !character.dateOfBirth);
    if (incomplete) {
      emitNet('rumble:character:registrationRequired', source, {
        mode: 'complete',
        characterId: incomplete.id,
        firstName: incomplete.firstName,
        lastName: incomplete.lastName,
      });
      return;
    }

    if (!GetPlayerName(source)) return;
    await showCharacterSelector(source, identifier);
  } finally {
    loadingPlayers.delete(source);
  }
}

async function persistMetadata(session: PlayerSession, key: string, value: any): Promise<boolean> {
  if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(key)) return false;
  const serialized = JSON.stringify(value);
  if (serialized.length > Config.maxMetadataBytes) return false;
  session.metadata[key] = value;
  await metadataRepository.set(session.character.id, key, serialized);
  if (key === 'deathState') setPlayerState(session.source, 'rumbleDeathState', String(value));
  emit('rumble:server:metadataChanged', session.source, key, value);
  return true;
}

async function setMetadata(source: number, key: string, value: any): Promise<boolean> {
  const session = sessions.get(source);
  if (!session) return false;
  return await persistMetadata(session, key, value);
}

async function removeMetadata(source: number, key: string): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Object.prototype.hasOwnProperty.call(session.metadata, key)) return false;
  delete session.metadata[key];
  await metadataRepository.remove(session.character.id, key);
  emit('rumble:server:metadataChanged', source, key, null);
  return true;
}

function inventoryWeight(session: PlayerSession): number {
  return session.inventory.reduce((total, item) => {
    const definition = ITEM_DEFINITIONS[item.name];
    return total + (definition?.weight ?? 0) * item.amount;
  }, 0);
}

function canCarryItem(source: number, itemName: string, amount: number): boolean {
  const session = sessions.get(source);
  const definition = ITEM_DEFINITIONS[itemName];
  if (!session || !definition || !Number.isInteger(amount) || amount <= 0) return false;
  return inventoryWeight(session) + definition.weight * amount <= Config.inventoryMaxWeight;
}

function nextInventorySlot(session: PlayerSession): number | null {
  const used = new Set(session.inventory.map((item) => item.slot));
  for (let slot = 1; slot <= Config.inventoryMaxSlots; slot++) if (!used.has(slot)) return slot;
  return null;
}

async function addItem(
  source: number,
  itemName: string,
  amount: number,
  metadata: Record<string, any> = {},
  reason = 'unknown',
): Promise<boolean> {
  const session = sessions.get(source);
  const definition = ITEM_DEFINITIONS[itemName];
  const quantity = Math.floor(Number(amount));
  if (!session || !definition || !Security.validateItemAmount(quantity)) return false;
  if (!canCarryItem(source, itemName, quantity)) return false;

  const serialized = JSON.stringify(metadata ?? {});
  if (serialized.length > 8000) return false;

  let slotItem = definition.stackable
    ? session.inventory.find((item) => item.name === itemName && JSON.stringify(item.metadata) === serialized)
    : undefined;

  if (slotItem) {
    slotItem.amount += quantity;
    await inventoryRepository.updateAmount(session.character.id, slotItem.id, slotItem.amount);
  } else {
    const slot = nextInventorySlot(session);
    if (slot === null) return false;
    const id = await inventoryRepository.insert(session.character.id, slot, itemName, quantity, serialized);
    slotItem = { id, slot, name: itemName, amount: quantity, metadata: { ...metadata } };
    session.inventory.push(slotItem);
    session.inventory.sort((a, b) => a.slot - b.slot);
  }

  emitNet('rumble:inventory:update', source, publicInventory(session), inventoryWeight(session), Config.inventoryMaxWeight);
  emit('rumble:server:inventoryChanged', source, 'add', itemName, quantity, reason);
  void logAction('inventory', 'add', source, source, { itemName, amount: quantity, reason });
  return true;
}

async function removeItem(source: number, itemName: string, amount: number, reason = 'unknown'): Promise<boolean> {
  const session = sessions.get(source);
  const quantity = Math.floor(Number(amount));
  if (!session || !ITEM_DEFINITIONS[itemName] || !Security.validateItemAmount(quantity)) return false;
  const available = session.inventory.filter((item) => item.name === itemName).reduce((total, item) => total + item.amount, 0);
  if (available < quantity) return false;

  let remaining = quantity;
  for (const item of [...session.inventory].filter((entry) => entry.name === itemName).sort((a, b) => a.slot - b.slot)) {
    if (remaining <= 0) break;
    const take = Math.min(item.amount, remaining);
    item.amount -= take;
    remaining -= take;
    if (item.amount <= 0) {
      await inventoryRepository.remove(session.character.id, item.id);
      session.inventory = session.inventory.filter((entry) => entry.id !== item.id);
    } else {
      await inventoryRepository.updateAmount(session.character.id, item.id, item.amount);
    }
  }

  emitNet('rumble:inventory:update', source, publicInventory(session), inventoryWeight(session), Config.inventoryMaxWeight);
  emit('rumble:server:inventoryChanged', source, 'remove', itemName, quantity, reason);
  void logAction('inventory', 'remove', source, source, { itemName, amount: quantity, reason });
  return true;
}

function hasItem(source: number, itemName: string, amount = 1): boolean {
  const session = sessions.get(source);
  if (!session || !ITEM_DEFINITIONS[itemName]) return false;
  const quantity = Math.max(1, Math.floor(Number(amount)));
  return session.inventory.filter((item) => item.name === itemName).reduce((total, item) => total + item.amount, 0) >= quantity;
}

async function useItem(source: number, itemName: string): Promise<boolean> {
  const session = sessions.get(source);
  const definition = ITEM_DEFINITIONS[itemName];
  if (!session || !definition?.usable || !hasItem(source, itemName, 1)) return false;
  if (String(session.metadata.deathState ?? 'alive') !== 'alive') return false;
  if (!allowRate(source, 'inventory:use', 8, 10000)) return false;

  let applied = false;
  if (itemName === 'water') applied = await addNeed(source, 'thirst', 35, 'item:water');
  if (itemName === 'sandwich') applied = await addNeed(source, 'hunger', 35, 'item:sandwich');
  if (itemName === 'medkit') applied = await setVital(source, 'health', Math.min(MAX_HEALTH, session.character.health + 60), 'item:medkit');
  if (itemName === 'armor') applied = await setVital(source, 'armor', MAX_ARMOR, 'item:armor');
  if (!applied) return false;

  const removed = await removeItem(source, itemName, 1, `use:${itemName}`);
  if (!removed) return false;
  await saveSession(session, true);
  message(source, `You used ${definition.label}.`, 'success');
  return true;
}

function generatePlate(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  let plate = '';
  for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 3; i++) plate += digits[Math.floor(Math.random() * digits.length)];
  return plate;
}

function toOwnedVehicle(row: any): OwnedVehicle {
  return {
    id: Number(row.id),
    characterId: Number(row.character_id),
    plate: String(row.plate),
    model: String(row.model),
    garage: String(row.garage),
    stored: Number(row.stored) === 1,
    fuel: Number(row.fuel),
    engineHealth: Number(row.engine_health),
    bodyHealth: Number(row.body_health),
    properties: safeJsonParse(row.properties, {}),
  };
}

async function getOwnedVehicles(source: number): Promise<OwnedVehicle[]> {
  const session = sessions.get(source);
  if (!session) return [];
  const rows = await vehicleRepository.list(session.character.id);
  return rows.map(toOwnedVehicle);
}

async function addOwnedVehicle(
  source: number,
  model: string,
  plateInput = '',
  properties: Record<string, any> = {},
): Promise<OwnedVehicle | null> {
  const session = sessions.get(source);
  const normalizedModel = String(model ?? '').trim().toLowerCase();
  if (!session || !/^[a-zA-Z0-9_-]{1,64}$/.test(normalizedModel)) return null;
  let plate = String(plateInput ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!plate) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = generatePlate();
      const exists = await vehicleRepository.findByPlate(candidate);
      if (!exists) {
        plate = candidate;
        break;
      }
    }
  }
  if (!plate) return null;
  const duplicate = await vehicleRepository.findByPlate(plate);
  if (duplicate) return null;
  const serialized = JSON.stringify(properties ?? {});
  if (serialized.length > 16000) return null;
  const id = await vehicleRepository.insert(session.character.id, plate, normalizedModel, serialized);
  const row = await vehicleRepository.getById(id);
  if (!row) return null;
  void logAction('vehicle', 'owned_added', source, source, { model: normalizedModel, plate });
  return toOwnedVehicle(row);
}

async function updateOwnedVehicle(source: number, plateInput: string, changes: any): Promise<boolean> {
  const session = sessions.get(source);
  if (!session) return false;
  const plate = String(plateInput ?? '').trim().toUpperCase();
  const row = await vehicleRepository.findByPlate(plate, session.character.id);
  if (!row) return false;
  const garage = typeof changes?.garage === 'string' ? changes.garage.slice(0, 64) : String(row.garage);
  const stored = typeof changes?.stored === 'boolean' ? changes.stored : Number(row.stored) === 1;
  const fuel = Number.isFinite(Number(changes?.fuel)) ? Math.max(0, Math.min(100, Number(changes.fuel))) : Number(row.fuel);
  const engineHealth = Number.isFinite(Number(changes?.engineHealth)) ? Math.max(-4000, Math.min(1000, Number(changes.engineHealth))) : Number(row.engine_health);
  const bodyHealth = Number.isFinite(Number(changes?.bodyHealth)) ? Math.max(0, Math.min(1000, Number(changes.bodyHealth))) : Number(row.body_health);
  const properties = changes?.properties && typeof changes.properties === 'object' ? changes.properties : safeJsonParse(row.properties, {});
  const serialized = JSON.stringify(properties);
  if (serialized.length > 16000) return false;
  await vehicleRepository.update(session.character.id, Number(row.id), {
    garage,
    stored,
    fuel,
    engineHealth,
    bodyHealth,
    properties: serialized,
  });
  return true;
}

async function removeOwnedVehicle(source: number, plateInput: string): Promise<boolean> {
  const session = sessions.get(source);
  if (!session) return false;
  const plate = String(plateInput ?? '').trim().toUpperCase();
  const changed = await vehicleRepository.remove(session.character.id, plate);
  if (changed > 0) void logAction('vehicle', 'owned_removed', source, source, { plate });
  return changed > 0;
}

function registerRpc(name: string, handler: (source: number, payload: any) => any): void {
  if (!/^[a-zA-Z0-9_.:-]{1,96}$/.test(name)) throw new CoreError('RPC_NAME_INVALID', 'Invalid RPC name.', { name });
  if (rpcHandlers.has(name)) throw new CoreError('RPC_DUPLICATE', 'RPC is already registered.', { name });
  rpcHandlers.set(name, handler);
}

function registerTypedRpc<K extends RumbleCallbackName>(
  name: K,
  handler: (source: number, payload: RumbleCallbackRequest<K>) => RumbleCallbackResponse<K> | Promise<RumbleCallbackResponse<K>>,
): void {
  registerRpc(name, handler as (source: number, payload: any) => any);
}

function registerRumbleCommand(
  name: string,
  adminOnly: boolean,
  handler: (source: number, args: string[], rawCommand: string) => void | Promise<void>,
): void {
  RegisterCommand(name, (source, args, rawCommand) => {
    if (adminOnly && !requireAdmin(source)) return;
    if (!allowRate(source, `command:${name}`, adminOnly ? 20 : 12, 10000)) {
      if (source !== 0) message(source, 'Too many commands in a short period of time.', 'error');
      return;
    }
    void Promise.resolve(handler(source, args, rawCommand)).catch((error) => {
      Logger.error('ADMIN', `Command /${name} failed`, { source, error: String(error) });
      if (source !== 0) message(source, 'The command encountered an error.', 'error');
    });
    if (adminOnly) void logAction('admin', `command:${name}`, source, null, { args });
  }, false);
}

async function setMoney(source: number, account: MoneyAccount, amount: number, reason = 'unknown', actorIdentifier?: string): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Security.validateMoney(amount)) return false;

  const previous = session.character[account];
  const finalAmount = clampNumber(Math.floor(amount), 0, Config.maxMoney);
  if (previous === finalAmount) return true;
  session.character[account] = finalAmount;
  await characterRepository.updateMoney(session.character.id, session.identifier, account, finalAmount);
  await moneyRepository.record(
    session.character.id,
    account,
    finalAmount - previous,
    finalAmount,
    sanitizeReason(reason),
    actorIdentifier ?? session.identifier,
  );

  setPlayerState(source, account === 'cash' ? 'rumbleCash' : 'rumbleCard', finalAmount);
  emitNet('rumble:money:update', source, account, finalAmount, reason);
  emit('rumble:server:moneyChanged', source, account, finalAmount, reason);
  void logAction('money', 'changed', source, source, { account, previous, current: finalAmount, reason });
  return true;
}

async function addMoney(source: number, account: MoneyAccount, amount: number, reason = 'unknown'): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Number.isFinite(amount) || amount <= 0) return false;
  return await setMoney(source, account, session.character[account] + Math.floor(amount), reason);
}

async function removeMoney(source: number, account: MoneyAccount, amount: number, reason = 'unknown'): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Number.isFinite(amount) || amount <= 0) return false;

  const wanted = Math.floor(amount);
  if (session.character[account] < wanted) return false;
  return await setMoney(source, account, session.character[account] - wanted, reason);
}

function clampNeed(value: number): number {
  return Math.max(0, Math.min(100, Math.floor(value)));
}

async function setNeeds(source: number, hunger: number, thirst: number, reason = 'unknown'): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Number.isFinite(hunger) || !Number.isFinite(thirst)) return false;

  const nextHunger = clampNeed(hunger);
  const nextThirst = clampNeed(thirst);
  if (nextHunger === session.character.hunger && nextThirst === session.character.thirst) return true;

  session.character.hunger = nextHunger;
  session.character.thirst = nextThirst;
  markDirty(session);

  setPlayerState(source, 'rumbleHunger', nextHunger);
  setPlayerState(source, 'rumbleThirst', nextThirst);
  emitNet('rumble:needs:update', source, nextHunger, nextThirst, reason);
  emit('rumble:server:needsChanged', source, nextHunger, nextThirst, reason);
  return true;
}

async function setNeed(source: number, need: NeedType, amount: number, reason = 'unknown'): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Number.isFinite(amount)) return false;

  const hunger = need === 'hunger' ? amount : session.character.hunger;
  const thirst = need === 'thirst' ? amount : session.character.thirst;
  return await setNeeds(source, hunger, thirst, reason);
}

async function addNeed(source: number, need: NeedType, amount: number, reason = 'unknown'): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Number.isFinite(amount) || amount <= 0) return false;
  return await setNeed(source, need, session.character[need] + amount, reason);
}

async function removeNeed(source: number, need: NeedType, amount: number, reason = 'unknown'): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Number.isFinite(amount) || amount <= 0) return false;
  return await setNeed(source, need, session.character[need] - amount, reason);
}

function clampVital(vital: VitalType, value: number): number {
  const maximum = vital === 'health' ? MAX_HEALTH : MAX_ARMOR;
  return Math.max(0, Math.min(maximum, Math.floor(value)));
}

async function setVital(source: number, vital: VitalType, amount: number, reason = 'unknown'): Promise<boolean> {
  const session = sessions.get(source);
  if (!session || !Number.isFinite(amount)) return false;

  const nextValue = clampVital(vital, amount);
  session.character[vital] = nextValue;
  markDirty(session);

  emitNet('rumble:vitals:set', source, vital, nextValue, reason);
  emit('rumble:server:vitalChanged', source, vital, nextValue, reason);
  if (vital === 'health' && nextValue > 0 && String(session.metadata.deathState ?? 'alive') !== 'alive') {
    session.metadata.deathState = 'alive';
    void persistMetadata(session, 'deathState', 'alive');
    emitNet('rumble:death:state', source, 'alive');
  }
  return true;
}

function tickNeeds(): void {
  if (!databaseReady || sessions.size === 0) return;

  const hungerDecay = Config.hungerDecay;
  const thirstDecay = Config.thirstDecay;
  const hungerDamage = Config.starvationDamage;
  const thirstDamage = Config.dehydrationDamage;

  for (const [source, session] of sessions) {
    if (!GetPlayerName(source) || !session.spawned) continue;

    const nextHunger = clampNeed(session.character.hunger - hungerDecay);
    const nextThirst = clampNeed(session.character.thirst - thirstDecay);

    if (nextHunger !== session.character.hunger || nextThirst !== session.character.thirst) {
      session.character.hunger = nextHunger;
      session.character.thirst = nextThirst;
      markDirty(session);
      setPlayerState(source, 'rumbleHunger', nextHunger);
      setPlayerState(source, 'rumbleThirst', nextThirst);
      emitNet('rumble:needs:update', source, nextHunger, nextThirst, 'decay');
      emit('rumble:server:needsChanged', source, nextHunger, nextThirst, 'decay');
    }

    let damage = 0;
    if (nextHunger <= 0) damage += hungerDamage;
    if (nextThirst <= 0) damage += thirstDamage;
    if (damage > 0) emitNet('rumble:needs:damage', source, damage);
  }
}

const needsInterval = Config.needsIntervalMs;
const autosaveInterval = Config.autosaveIntervalMs;
setInterval(tickNeeds, needsInterval);
setInterval(() => {
  void flushDirtySessions();
}, autosaveInterval);

on('onResourceStart', (resourceName: string) => {
  if (resourceName !== RESOURCE) return;

  Logger.info('CORE', `Starting ${Config.frameworkName} ${Config.version}`, { resource: RESOURCE });
  void initializeDatabase()
    .then(async () => {
      await performHealthCheck();
    })
    .catch((error) => {
      databaseReady = false;
      Logger.error('DATABASE', 'Database initialization failed', { error: String(error) });
    });
});

on('onResourceStop', (resourceName: string) => {
  if (resourceName !== RESOURCE || !databaseReady) return;
  for (const session of sessions.values()) {
    void saveSession(session, true).catch((error) => Logger.error('DATABASE', 'Final save failed', { source: session.source, error: String(error) }));
  }
});

onNet('rumble:player:requestLoad', () => {
  const source = Number((globalThis as any).source);
  if (!allowRate(source, 'player:requestLoad', 4, 10000)) return;
  void loadPlayer(source).catch((error) => {
    Logger.error('PLAYER', 'Failed loading player', { source, error: String(error) });
    emitNet('rumble:player:loadError', source, 'Character loading failed. Check the server console.');
    message(source, 'Character loading failed. Check the server console.', 'error');
  });
});

onNet('rumble:character:createInitial', (payload: any) => {
  const source = Number((globalThis as any).source);
  if (source <= 0 || creatingCharacters.has(source)) return;
  if (!Security.validatePayload(payload, 4096)) {
    rejectSecurity(source, 'character_payload_too_large', { bytes: serializedSize(payload) });
    emitNet('rumble:character:registrationError', source, 'The submitted data is invalid.');
    return;
  }
  if (!allowRate(source, 'character:create', 3, 10000)) {
    emitNet('rumble:character:registrationError', source, 'Too many attempts. Wait a few seconds.');
    return;
  }

  void (async () => {
    creatingCharacters.add(source);

    if (!databaseReady) {
      emitNet('rumble:character:registrationError', source, 'The database is unavailable.');
      return;
    }

    const identifier = getPrimaryIdentifier(source);
    if (!identifier) {
      emitNet('rumble:character:registrationError', source, 'No valid FiveM identifier was found.');
      return;
    }

    const firstName = String(payload?.firstName ?? '').trim();
    const lastName = String(payload?.lastName ?? '').trim();
    const dateOfBirth = String(payload?.dateOfBirth ?? '').trim();
    const mode = String(payload?.mode ?? 'create');

    if (!validateCharacterName(firstName)) {
      emitNet('rumble:character:registrationError', source, 'The first name must contain between 2 and 24 letters.');
      return;
    }

    if (!validateCharacterName(lastName)) {
      emitNet('rumble:character:registrationError', source, 'The last name must contain between 2 and 24 letters.');
      return;
    }

    if (!validateDateOfBirth(dateOfBirth)) {
      emitNet('rumble:character:registrationError', source, 'The date of birth is invalid.');
      return;
    }

    await upsertPlayer(source, identifier);

    if (mode === 'complete') {
      const characterId = Number(payload?.characterId ?? 0);
      const row = await characterRepository.getById(identifier, characterId);
      if (!row) {
        emitNet('rumble:character:registrationError', source, 'The character no longer exists.');
        return;
      }
      await characterRepository.updateIdentity(identifier, characterId, firstName, lastName, dateOfBirth);
      await showCharacterSelector(source, identifier);
      await logAction('character', 'identity_completed', source, source, { characterId });
      return;
    }

    const character = await createCharacter(identifier, firstName, lastName, dateOfBirth);
    await logAction('character', 'created', source, source, { characterId: character.id, citizenId: character.citizenId });
    if (!GetPlayerName(source)) return;
    await selectCharacter(source, identifier, character);
  })().catch((error) => {
    Logger.error('CHARACTER', 'Character creation failed', { source, error: String(error) });
    emitNet('rumble:character:registrationError', source, error instanceof Error ? error.message : 'The character could not be created.');
  }).finally(() => {
    creatingCharacters.delete(source);
  });
});

onNet('rumble:character:select', (characterId: number) => {
  const source = Number((globalThis as any).source);
  if (source <= 0 || !allowRate(source, 'character:select', 5, 5000)) return;
  void (async () => {
    const identifier = getPrimaryIdentifier(source);
    if (!identifier) return;
    const id = Number(characterId);
    if (!Number.isInteger(id) || id <= 0) return;
    const row = await characterRepository.getById(identifier, id);
    if (!row) {
      emitNet('rumble:character:selectorError', source, 'The character does not belong to you or does not exist.');
      return;
    }
    const character = toCharacter(row);
    if (!character.dateOfBirth) {
      emitNet('rumble:character:registrationRequired', source, {
        mode: 'complete',
        characterId: character.id,
        firstName: character.firstName,
        lastName: character.lastName,
      });
      return;
    }
    await selectCharacter(source, identifier, character);
  })().catch((error) => {
    Logger.error('CHARACTER', 'Character selection failed', { source, error: String(error) });
    emitNet('rumble:character:selectorError', source, 'The character could not be selected.');
  });
});

onNet('rumble:player:spawned', (spawnId: string) => {
  const source = Number((globalThis as any).source);
  const session = sessions.get(source);
  if (!session || !allowRate(source, 'player:spawned', 3, 5000)) return;
  const safeSpawnId = String(spawnId ?? '');
  if (!Object.prototype.hasOwnProperty.call(SPAWNS, safeSpawnId)) {
    rejectSecurity(source, 'invalid_spawn_id', { spawnId: safeSpawnId });
    return;
  }
  session.spawned = true;
  const ped = GetPlayerPed(source);
  if (ped) {
    const [x, y, z] = GetEntityCoords(ped);
    const heading = Number((globalThis as any).GetEntityHeading?.(ped) ?? session.character.position.heading);
    session.character.position = { x, y, z, heading };
  }
  if (String(session.metadata.deathState ?? 'alive') !== 'alive' && safeSpawnId === 'hospital') {
    session.character.health = MAX_HEALTH;
    session.character.armor = 0;
    markDirty(session);
    session.metadata.deathState = 'alive';
    void persistMetadata(session, 'deathState', 'alive');
    emitNet('rumble:death:state', source, 'alive');
  }
  syncStateBag(session);
  void saveSession(session, true);
  emitNet('rumble:player:loaded', source, publicPlayer(session));
  emit('rumble:server:playerLoaded', source, publicPlayer(session));
  void logAction('player', 'spawned', source, source, { spawnId: safeSpawnId, characterId: session.character.id });
});

onNet('rumble:player:updateState', () => {
  const source = Number((globalThis as any).source);
  const session = sessions.get(source);
  if (!session || !session.spawned || !allowRate(source, 'player:state', 4, 5000)) return;

  const ped = GetPlayerPed(source);
  if (!ped) return;
  const coords = GetEntityCoords(ped);
  const heading = Number((globalThis as any).GetEntityHeading?.(ped) ?? session.character.position.heading);
  const health = Number((globalThis as any).GetEntityHealth?.(ped) ?? session.character.health);
  const armor = Number((globalThis as any).GetPedArmour?.(ped) ?? session.character.armor);
  const values = [coords[0], coords[1], coords[2], heading, health, armor];
  if (values.some((value) => !Number.isFinite(value))) return;

  session.character.position = {
    x: values[0],
    y: values[1],
    z: values[2],
    heading: values[3],
  };
  session.character.health = Math.max(0, Math.min(MAX_HEALTH, Math.floor(values[4])));
  session.character.armor = Math.max(0, Math.min(MAX_ARMOR, Math.floor(values[5])));
  markDirty(session);
});

onNet('rumble:death:update', (stateInput: string) => {
  const source = Number((globalThis as any).source);
  const session = sessions.get(source);
  if (!session || !allowRate(source, 'death:update', 4, 10000)) return;
  const state = String(stateInput) as DeathState;
  if (!['alive', 'downed'].includes(state)) {
    rejectSecurity(source, 'invalid_death_state', { state });
    return;
  }

  const ped = GetPlayerPed(source);
  const health = ped ? Number((globalThis as any).GetEntityHealth?.(ped) ?? 0) : 0;

  if (state === 'alive') {
    if (health <= 0) {
      rejectSecurity(source, 'invalid_alive_state', { health });
      return;
    }
    void persistMetadata(session, 'deathState', 'alive');
    emitNet('rumble:death:state', source, 'alive');
    return;
  }

  if (health > 0) {
    rejectSecurity(source, 'invalid_downed_state', { health });
    return;
  }

  if (String(session.metadata.deathState ?? 'alive') !== 'alive') return;
  void persistMetadata(session, 'deathState', 'downed');
  emitNet('rumble:death:state', source, 'downed');
  void logAction('player', 'downed', source, source, {});

  setTimeout(() => {
    const current = sessions.get(source);
    if (!current || String(current.metadata.deathState ?? 'alive') !== 'downed') return;
    void persistMetadata(current, 'deathState', 'dead');
    emitNet('rumble:death:state', source, 'dead');
    void logAction('player', 'dead', source, source, {});
  }, Config.deathDeadAfterMs);
});

onNet('rumble:rpc:request', (requestId: string, name: string, payload: any) => {
  const source = Number((globalThis as any).source);
  const id = String(requestId ?? '').slice(0, 96);
  const rpcName = String(name ?? '').slice(0, 96);
  if (!id || !rpcName || !allowRate(source, 'rpc', 30, 10000)) return;
  if (!/^[a-zA-Z0-9_.:-]{1,96}$/.test(rpcName) || !Security.validatePayload(payload)) {
    rejectSecurity(source, 'invalid_rpc_request', { rpcName, bytes: serializedSize(payload) });
    emitNet('rumble:rpc:response', source, id, false, null, 'Invalid request.');
    return;
  }
  const handler = rpcHandlers.get(rpcName);
  if (!handler) {
    rejectSecurity(source, 'unknown_rpc', { rpcName });
    emitNet('rumble:rpc:response', source, id, false, null, 'RPC necunoscut.');
    return;
  }
  void Promise.resolve(handler(source, payload)).then((result) => {
    emitNet('rumble:rpc:response', source, id, true, result ?? null, null);
  }).catch((error) => {
    Logger.error('RPC', 'Callback failed', { source, rpcName, error: String(error) });
    emitNet('rumble:rpc:response', source, id, false, null, 'RPC failed.');
  });
});

on('playerDropped', () => {
  const source = Number((globalThis as any).source);
  const session = sessions.get(source);
  if (session) {
    void saveSession(session, true).catch((error) => Logger.error('DATABASE', 'Could not save dropped player', { source, error: String(error) }));
    void logAction('player', 'disconnected', source, source, { characterId: session.character.id });
    emit('rumble:server:playerUnloaded', source, publicPlayer(session));
  }
  sessions.delete(source);
  loadingPlayers.delete(source);
  creatingCharacters.delete(source);
  Security.clearSource(source);
  frozenPlayers.delete(source);
});

registerTypedRpc('rumble:getPlayer', (source) => {
  const session = sessions.get(source);
  return session ? publicPlayer(session) : null;
});

registerTypedRpc('rumble:getInventory', (source) => {
  const session = sessions.get(source);
  if (!session) return null;
  return { items: publicInventory(session), weight: inventoryWeight(session), maxWeight: Config.inventoryMaxWeight, maxSlots: Config.inventoryMaxSlots };
});

registerTypedRpc('rumble:getMetadata', (source) => {
  const session = sessions.get(source);
  return session ? publicMetadata(session) : null;
});

registerTypedRpc('rumble:getVehicles', async (source) => await getOwnedVehicles(source));

registerTypedRpc('rumble:getConfig', () => ({
  maxCharacters: Config.maxCharacters,
  inventoryMaxWeight: Config.inventoryMaxWeight,
  inventoryMaxSlots: Config.inventoryMaxSlots,
  itemDefinitions: ITEM_DEFINITIONS,
}));

registerRumbleCommand('inv', false, async (source) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');
  if (session.inventory.length === 0) return message(source, 'Your inventory is empty.', 'info');
  message(source, `Inventory ${inventoryWeight(session)}/${Config.inventoryMaxWeight}g:`, 'info');
  for (const item of session.inventory) {
    const definition = ITEM_DEFINITIONS[item.name];
    message(source, `slot ${item.slot} | ${definition?.label ?? item.name} x${item.amount}`, 'info');
  }
});

registerRumbleCommand('use', false, async (source, args) => {
  if (source === 0) return;
  const itemName = String(args[0] ?? '').trim().toLowerCase();
  if (!itemName) return message(source, 'Usage: /use [item].', 'error');
  const ok = await useItem(source, itemName);
  if (!ok) message(source, 'The item does not exist, you do not have it, or it cannot be used.', 'error');
});

registerRumbleCommand('giveitem', true, async (source, args) => {
  const target = Number(args[0]);
  const itemName = String(args[1] ?? '').trim().toLowerCase();
  const amount = Math.floor(Number(args[2] ?? 1));
  if (!validPlayerSource(target) || !ITEM_DEFINITIONS[itemName] || !Security.validateItemAmount(amount)) {
    if (source !== 0) message(source, 'Usage: /giveitem [id] [water|sandwich|medkit|armor] [amount].', 'error');
    return;
  }
  const ok = await addItem(target, itemName, amount, {}, `admin:${source}`);
  if (source !== 0) message(source, ok ? 'The item was added.' : 'The item could not be added.', ok ? 'success' : 'error');
});

registerRumbleCommand('vehicles', false, async (source) => {
  if (source === 0) return;
  const vehicles = await getOwnedVehicles(source);
  if (vehicles.length === 0) return message(source, 'You do not have any owned vehicles.', 'info');
  for (const vehicle of vehicles) message(source, `${vehicle.plate} | ${vehicle.model} | ${vehicle.garage} | ${vehicle.stored ? 'stored' : 'out'}`, 'info');
});

registerRumbleCommand('addvehicle', true, async (source, args) => {
  const target = Number(args[0]);
  const model = String(args[1] ?? '').trim();
  const plate = String(args[2] ?? '').trim();
  if (!Number.isInteger(target) || !model) {
    if (source !== 0) message(source, 'Usage: /addvehicle [id] [model] [optional-plate].', 'error');
    return;
  }
  const vehicle = await addOwnedVehicle(target, model, plate);
  if (source !== 0) message(source, vehicle ? `Vehicle added: ${vehicle.model} ${vehicle.plate}.` : 'The vehicle could not be added.', vehicle ? 'success' : 'error');
});

registerRumbleCommand('respawn', false, async (source) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');
  const deathState = String(session.metadata.deathState ?? 'alive');
  if (deathState !== 'dead') return message(source, 'You can use /respawn only after your state becomes dead.', 'error');
  await persistMetadata(session, 'deathState', 'respawning');
  emitNet('rumble:death:respawn', source, SPAWNS.hospital.position);
});

registerRumbleCommand('characters', false, async (source) => {
  if (source === 0) return;
  const session = sessions.get(source);
  const identifier = session?.identifier ?? getPrimaryIdentifier(source);
  if (!identifier) return;
  if (session) await saveSession(session, true);
  await showCharacterSelector(source, identifier);
});

RegisterCommand('money', (source) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  message(
    source,
    `Cash: $${session.character.cash.toLocaleString()} | Card: $${session.character.card.toLocaleString()}`,
    'info',
  );
}, false);

RegisterCommand('cash', (source) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');
  message(source, `Cash: $${session.character.cash.toLocaleString()}`, 'info');
}, false);

RegisterCommand('card', (source) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');
  message(source, `Card: $${session.character.card.toLocaleString()}`, 'info');
}, false);

RegisterCommand('stats', (source) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  message(
    source,
    `Hunger: ${session.character.hunger}% | Thirst: ${session.character.thirst}% | Health: ${session.character.health} | Armor: ${session.character.armor}%`,
    'info',
  );
}, false);

RegisterCommand('fullstats', (source) => {
  if (source === 0 || !requireAdmin(source)) return;
  void logAction('admin', 'command:fullstats', source, source, {});
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  void (async () => {
    session.character.health = MAX_HEALTH;
    session.character.armor = MAX_ARMOR;
    markDirty(session);
    await setNeeds(source, 100, 100, `fullstats:${source}`);
    await persistMetadata(session, 'deathState', 'alive');
    await saveSession(session, true);
    emitNet('rumble:admin:fullStats', source);
    message(source, 'Hunger, thirst, health, and armor have been fully restored.', 'success');
  })().catch((error) => {
    console.error(error);
    message(source, 'The stats could not be restored.', 'error');
  });
}, false);

RegisterCommand('hunger', (source) => {
  if (source === 0 || !requireAdmin(source)) return;
  void logAction('admin', 'command:hunger', source, source, {});
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  void (async () => {
    await setNeed(source, 'hunger', 100, `hunger:${source}`);
    await saveSession(session, true);
    message(source, 'Hunger was set to 100%.', 'success');
  })().catch((error) => {
    console.error(error);
    message(source, 'Hunger could not be restored.', 'error');
  });
}, false);

RegisterCommand('water', (source) => {
  if (source === 0 || !requireAdmin(source)) return;
  void logAction('admin', 'command:water', source, source, {});
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  void (async () => {
    await setNeed(source, 'thirst', 100, `water:${source}`);
    await saveSession(session, true);
    message(source, 'Thirst was set to 100%.', 'success');
  })().catch((error) => {
    console.error(error);
    message(source, 'Thirst could not be restored.', 'error');
  });
}, false);

RegisterCommand('health', (source) => {
  if (source === 0 || !requireAdmin(source)) return;
  void logAction('admin', 'command:health', source, source, {});
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  void (async () => {
    await setVital(source, 'health', MAX_HEALTH, `health:${source}`);
    await saveSession(session, true);
    message(source, 'Health was fully restored.', 'success');
  })().catch((error) => {
    console.error(error);
    message(source, 'Health could not be restored.', 'error');
  });
}, false);

RegisterCommand('armor', (source) => {
  if (source === 0 || !requireAdmin(source)) return;
  void logAction('admin', 'command:armor', source, source, {});
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  void (async () => {
    await setVital(source, 'armor', MAX_ARMOR, `armor:${source}`);
    await saveSession(session, true);
    message(source, 'Armor was set to 100%.', 'success');
  })().catch((error) => {
    console.error(error);
    message(source, 'Armor could not be restored.', 'error');
  });
}, false);

RegisterCommand('chars', (source) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  void listCharacters(session.identifier).then((characters) => {
    message(source, `Characters (${characters.length}):`, 'info');
    for (const character of characters) {
      const active = character.id === session.character.id ? ' ^2[ACTIV]^7' : '';
      message(
        source,
        `#${character.id} | slot ${character.slot} | ${character.firstName} ${character.lastName}${active}`,
        'info',
      );
    }
  }).catch((error) => console.error(error));
}, false);

RegisterCommand('newchar', (source, args) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  const firstName = String(args[0] ?? '').trim();
  const lastName = String(args[1] ?? '').trim();
  const dateOfBirth = String(args[2] ?? '').trim();
  if (!validateCharacterName(firstName) || !validateCharacterName(lastName) || !validateDateOfBirth(dateOfBirth)) {
    return message(source, 'Usage: /newchar FirstName LastName YYYY-MM-DD.', 'error');
  }

  void (async () => {
    await saveSession(session, true);
    const character = await createCharacter(session.identifier, firstName, lastName, dateOfBirth);
    await selectCharacter(source, session.identifier, character);
    message(source, `Character created: ${firstName} ${lastName}.`, 'success');
  })().catch((error) => message(source, error instanceof Error ? error.message : 'The character could not be created.', 'error'));
}, false);

RegisterCommand('switchchar', (source, args) => {
  if (source === 0) return;
  const session = sessions.get(source);
  if (!session) return message(source, 'Your player data has not loaded yet.', 'error');

  const id = Number(args[0]);
  if (!Number.isInteger(id) || id <= 0) {
    return message(source, 'Usage: /switchchar ID. See /chars.', 'error');
  }

  void (async () => {
    const row = await characterRepository.getById(session.identifier, id);

    if (!row) return message(source, 'The character does not belong to you or does not exist.', 'error');

    await saveSession(session, true);
    await selectCharacter(source, session.identifier, toCharacter(row));
    message(source, `Switched to character #${id}.`, 'success');
  })().catch((error) => {
    console.error(error);
    message(source, 'The character could not be switched.', 'error');
  });
}, false);

RegisterCommand('setmoney', (source, args) => {
  if (!requireAdmin(source)) return;
  void logAction('admin', 'command:setmoney', source, null, { args });

  const target = Number(args[0]);
  const account = args[1] as MoneyAccount;
  const amount = Number(args[2]);

  if (!validPlayerSource(target) || (account !== 'cash' && account !== 'card') || !Security.validateMoney(amount)) {
    if (source !== 0) message(source, 'Usage: /setmoney [id] [cash|card] [amount]', 'error');
    return;
  }

  void setMoney(target, account, amount, `admin:${source}`, source === 0 ? 'console' : getPrimaryIdentifier(source) ?? `source:${source}`).then((ok) => {
    if (source !== 0) message(source, ok ? 'The balance was updated.' : 'The player is not loaded.', ok ? 'success' : 'error');
  });
}, false);

RegisterCommand('ara', (source) => {
  if (source === 0 || !requireAdmin(source)) return;
  void logAction('admin', 'command:ara', source, null, {});

  const callerPed = GetPlayerPed(source);
  if (!callerPed) return message(source, 'Your ped is unavailable.', 'error');

  const [cx, cy, cz] = GetEntityCoords(callerPed);
  let revived = 0;

  for (const targetString of getPlayers()) {
    const target = Number(targetString);
    const targetPed = GetPlayerPed(target);
    if (!targetPed) continue;

    const [tx, ty, tz] = GetEntityCoords(targetPed);
    const distance = Math.hypot(cx - tx, cy - ty, cz - tz);
    if (distance <= 10.0) {
      const targetSession = sessions.get(target);
      if (targetSession) {
        targetSession.character.health = MAX_HEALTH;
        targetSession.character.armor = 0;
        markDirty(targetSession);
        void persistMetadata(targetSession, 'deathState', 'alive');
        void saveSession(targetSession, true);
      }
      emitNet('rumble:admin:revive', target);
      revived++;
    }
  }

  message(source, `Revive sent to ${revived} player(s) within 10m, including you.`, 'success');
}, false);

RegisterCommand('fly', (source) => {
  if (source === 0 || !requireAdmin(source)) return;
  void logAction('admin', 'command:fly', source, source, {});
  emitNet('rumble:admin:toggleFly', source);
}, false);

RegisterCommand('gotow', (source) => {
  if (source === 0 || !requireAdmin(source)) return;
  void logAction('admin', 'command:gotow', source, source, {});
  emitNet('rumble:admin:gotoWaypoint', source);
}, false);


function getServerPosition(source: number): Position | null {
  if (!validPlayerSource(source)) return null;
  const ped = GetPlayerPed(source);
  if (!ped) return null;
  const [x, y, z] = GetEntityCoords(ped);
  const heading = Number(GetEntityHeading(ped));
  if (![x, y, z, heading].every(Number.isFinite)) return null;
  return { x, y, z, heading };
}

function validTeleportPosition(position: Position): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z) && Number.isFinite(position.heading)
    && Math.abs(position.x) <= 10000 && Math.abs(position.y) <= 10000 && position.z >= -1000 && position.z <= 10000;
}

registerRumbleCommand('tp', true, async (source, args) => {
  if (source === 0) return;
  const position: Position = {
    x: Number(args[0]),
    y: Number(args[1]),
    z: Number(args[2]),
    heading: args[3] === undefined ? Number(GetEntityHeading(GetPlayerPed(source))) : Number(args[3]),
  };
  if (!validTeleportPosition(position)) return message(source, 'Usage: /tp [x] [y] [z] [optional-heading].', 'error');
  emitNet('rumble:admin:teleport', source, position);
  message(source, `Teleport: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}.`, 'success');
});

registerRumbleCommand('bring', true, async (source, args) => {
  if (source === 0) return;
  const target = Number(args[0]);
  if (!validPlayerSource(target)) return message(source, 'Usage: /bring [id].', 'error');
  const position = getServerPosition(source);
  if (!position) return message(source, 'Your position is unavailable.', 'error');
  emitNet('rumble:admin:teleport', target, position);
  message(source, `Player ${target} was brought to you.`, 'success');
});

registerRumbleCommand('goto', true, async (source, args) => {
  if (source === 0) return;
  const target = Number(args[0]);
  if (!validPlayerSource(target)) return message(source, 'Usage: /goto [id].', 'error');
  const position = getServerPosition(target);
  if (!position) return message(source, 'The player position is unavailable.', 'error');
  emitNet('rumble:admin:teleport', source, position);
  message(source, `Teleported to player ${target}.`, 'success');
});

registerRumbleCommand('coords', true, async (source) => {
  if (source === 0) return;
  const position = getServerPosition(source);
  if (!position) return message(source, 'The position is unavailable.', 'error');
  message(source, `x=${position.x.toFixed(4)} y=${position.y.toFixed(4)} z=${position.z.toFixed(4)}`, 'info');
});

registerRumbleCommand('heading', true, async (source) => {
  if (source === 0) return;
  const position = getServerPosition(source);
  if (!position) return message(source, 'The heading is unavailable.', 'error');
  message(source, `heading=${position.heading.toFixed(3)}`, 'info');
});

registerRumbleCommand('pos', true, async (source) => {
  if (source === 0) return;
  const position = getServerPosition(source);
  if (!position) return message(source, 'The position is unavailable.', 'error');
  message(source, `vector4(${position.x.toFixed(4)}, ${position.y.toFixed(4)}, ${position.z.toFixed(4)}, ${position.heading.toFixed(3)})`, 'info');
});

registerRumbleCommand('vehicle', true, async (source, args) => {
  if (source === 0) return;
  const model = String(args[0] ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,64}$/.test(model)) return message(source, 'Usage: /vehicle [model].', 'error');
  emitNet('rumble:admin:spawnVehicle', source, model);
});

registerRumbleCommand('dv', true, async (source, args) => {
  if (source === 0) return;
  const radius = args[0] === undefined ? 5 : Number(args[0]);
  if (!Number.isFinite(radius) || radius < 1 || radius > 100) return message(source, 'Usage: /dv [radius 1-100].', 'error');
  emitNet('rumble:admin:deleteVehicle', source, radius);
});

registerRumbleCommand('freeze', true, async (source, args) => {
  const target = Number(args[0]);
  if (!validPlayerSource(target)) {
    if (source !== 0) message(source, 'Usage: /freeze [id].', 'error');
    return;
  }
  const enabled = !frozenPlayers.has(target);
  if (enabled) frozenPlayers.add(target);
  else frozenPlayers.delete(target);
  emitNet('rumble:admin:freeze', target, enabled);
  if (source !== 0) message(source, `Freeze ${enabled ? 'ON' : 'OFF'} for ID ${target}.`, 'success');
});

registerRumbleCommand('heal', true, async (source, args) => {
  const target = args[0] === undefined ? source : Number(args[0]);
  if (!validPlayerSource(target)) {
    if (source !== 0) message(source, 'Usage: /heal [optional-id].', 'error');
    return;
  }
  const session = sessions.get(target);
  if (!session) return source !== 0 ? message(source, 'The player is not loaded.', 'error') : undefined;
  if (String(session.metadata.deathState ?? 'alive') !== 'alive') return source !== 0 ? message(source, 'The player is dead. Use /revive.', 'error') : undefined;
  await setVital(target, 'health', MAX_HEALTH, `admin:heal:${source}`);
  await saveSession(session, true);
  if (source !== 0) message(source, `Heal applied to ID ${target}.`, 'success');
});

registerRumbleCommand('revive', true, async (source, args) => {
  const target = args[0] === undefined ? source : Number(args[0]);
  if (!validPlayerSource(target)) {
    if (source !== 0) message(source, 'Usage: /revive [optional-id].', 'error');
    return;
  }
  const session = sessions.get(target);
  if (!session) return source !== 0 ? message(source, 'The player is not loaded.', 'error') : undefined;
  session.character.health = MAX_HEALTH;
  session.character.armor = 0;
  markDirty(session);
  await persistMetadata(session, 'deathState', 'alive');
  await saveSession(session, true);
  emitNet('rumble:admin:revive', target);
  if (source !== 0) message(source, `Revive applied to ID ${target}.`, 'success');
});

registerRumbleCommand('spectate', true, async (source, args) => {
  if (source === 0) return;
  const value = String(args[0] ?? '').trim().toLowerCase();
  if (!value || value === 'off' || value === '0') {
    emitNet('rumble:admin:spectate', source, 0);
    return;
  }
  const target = Number(value);
  if (!validPlayerSource(target) || target === source) return message(source, 'Usage: /spectate [id] or /spectate off.', 'error');
  emitNet('rumble:admin:spectate', source, target);
});

registerRumbleCommand('entity', true, async (source) => {
  if (source === 0) return;
  emitNet('rumble:admin:inspectEntity', source);
});

registerRumbleCommand('vehinfo', true, async (source) => {
  if (source === 0) return;
  emitNet('rumble:admin:vehicleInfo', source);
});

registerRumbleCommand('healthcheck', true, async (source) => {
  const result = await performHealthCheck();
  if (source === 0) return;
  message(source, `Health: ${result.ok ? 'OK' : 'FAIL'} | DB ${result.database ? 'OK' : 'FAIL'} | oxmysql ${result.oxmysql} | migration ${result.migration}/${result.expectedMigration} | admin ${result.adminConfigured ? 'OK' : 'MISSING'}`, result.ok ? 'success' : 'error');
});

exports('GetPlayer', (source: number) => {
  const session = sessions.get(Number(source));
  return session ? publicPlayer(session) : null;
});

exports('GetCharacter', (source: number) => {
  const session = sessions.get(Number(source));
  return session ? { ...session.character, position: { ...session.character.position } } : null;
});

exports('GetMoney', (source: number, account: MoneyAccount) => {
  const session = sessions.get(Number(source));
  if (!session || (account !== 'cash' && account !== 'card')) return null;
  return session.character[account];
});

exports('SetMoney', async (source: number, account: MoneyAccount, amount: number, reason?: string) => {
  if (account !== 'cash' && account !== 'card') return false;
  return await setMoney(Number(source), account, Number(amount), reason ?? 'export');
});

exports('AddMoney', async (source: number, account: MoneyAccount, amount: number, reason?: string) => {
  if (account !== 'cash' && account !== 'card') return false;
  return await addMoney(Number(source), account, Number(amount), reason ?? 'export');
});

exports('RemoveMoney', async (source: number, account: MoneyAccount, amount: number, reason?: string) => {
  if (account !== 'cash' && account !== 'card') return false;
  return await removeMoney(Number(source), account, Number(amount), reason ?? 'export');
});

exports('GetNeeds', (source: number) => {
  const session = sessions.get(Number(source));
  if (!session) return null;
  return { hunger: session.character.hunger, thirst: session.character.thirst };
});

exports('GetVitals', (source: number) => {
  const session = sessions.get(Number(source));
  if (!session) return null;
  return { health: session.character.health, armor: session.character.armor };
});

exports('SetHealth', async (source: number, amount: number, reason?: string) => {
  return await setVital(Number(source), 'health', Number(amount), reason ?? 'export');
});

exports('SetArmor', async (source: number, amount: number, reason?: string) => {
  return await setVital(Number(source), 'armor', Number(amount), reason ?? 'export');
});

exports('SetNeed', async (source: number, need: NeedType, amount: number, reason?: string) => {
  if (need !== 'hunger' && need !== 'thirst') return false;
  return await setNeed(Number(source), need, Number(amount), reason ?? 'export');
});

exports('AddNeed', async (source: number, need: NeedType, amount: number, reason?: string) => {
  if (need !== 'hunger' && need !== 'thirst') return false;
  return await addNeed(Number(source), need, Number(amount), reason ?? 'export');
});

exports('RemoveNeed', async (source: number, need: NeedType, amount: number, reason?: string) => {
  if (need !== 'hunger' && need !== 'thirst') return false;
  return await removeNeed(Number(source), need, Number(amount), reason ?? 'export');
});

exports('GetPlayerByCitizenId', (citizenId: string) => {
  const wanted = String(citizenId ?? '').trim();
  for (const session of sessions.values()) if (session.character.citizenId === wanted) return publicPlayer(session);
  return null;
});

exports('SavePlayer', async (source: number) => {
  const session = sessions.get(Number(source));
  if (!session) return false;
  await saveSession(session, true);
  return true;
});

exports('KickPlayer', (source: number, reason?: string) => {
  const target = Number(source);
  if (!GetPlayerName(target)) return false;
  const drop = (globalThis as any).DropPlayer;
  if (typeof drop !== 'function') return false;
  drop(target, String(reason ?? 'You were disconnected by Rumble.'));
  return true;
});

exports('IsAdmin', (source: number) => isAdmin(Number(source)));

exports('GetMetadata', (source: number, key?: string) => {
  const session = sessions.get(Number(source));
  if (!session) return null;
  if (key === undefined) return publicMetadata(session);
  return session.metadata[String(key)] ?? null;
});

exports('SetMetadata', async (source: number, key: string, value: any) => {
  return await setMetadata(Number(source), String(key), value);
});

exports('RemoveMetadata', async (source: number, key: string) => {
  return await removeMetadata(Number(source), String(key));
});

exports('GetInventory', (source: number) => {
  const session = sessions.get(Number(source));
  return session ? publicInventory(session) : null;
});

exports('GetItemDefinition', (itemName: string) => {
  const item = ITEM_DEFINITIONS[String(itemName ?? '').toLowerCase()];
  return item ? { ...item } : null;
});

exports('CanCarry', (source: number, itemName: string, amount: number) => {
  return canCarryItem(Number(source), String(itemName ?? '').toLowerCase(), Number(amount));
});

exports('HasItem', (source: number, itemName: string, amount?: number) => {
  return hasItem(Number(source), String(itemName ?? '').toLowerCase(), Number(amount ?? 1));
});

exports('AddItem', async (source: number, itemName: string, amount: number, metadata?: Record<string, any>, reason?: string) => {
  return await addItem(Number(source), String(itemName ?? '').toLowerCase(), Number(amount), metadata ?? {}, reason ?? 'export');
});

exports('RemoveItem', async (source: number, itemName: string, amount: number, reason?: string) => {
  return await removeItem(Number(source), String(itemName ?? '').toLowerCase(), Number(amount), reason ?? 'export');
});

exports('UseItem', async (source: number, itemName: string) => {
  return await useItem(Number(source), String(itemName ?? '').toLowerCase());
});

exports('GetOwnedVehicles', async (source: number) => await getOwnedVehicles(Number(source)));

exports('AddOwnedVehicle', async (source: number, model: string, plate?: string, properties?: Record<string, any>) => {
  return await addOwnedVehicle(Number(source), model, plate ?? '', properties ?? {});
});

exports('UpdateOwnedVehicle', async (source: number, plate: string, changes: any) => {
  return await updateOwnedVehicle(Number(source), String(plate), changes);
});

exports('RemoveOwnedVehicle', async (source: number, plate: string) => {
  return await removeOwnedVehicle(Number(source), String(plate));
});

exports('RegisterCallback', (name: string, handler: (source: number, payload: any) => any) => {
  registerRpc(String(name), handler);
  return true;
});

exports('RegisterCommand', (name: string, adminOnly: boolean, handler: (source: number, args: string[], rawCommand: string) => void | Promise<void>) => {
  registerRumbleCommand(String(name), Boolean(adminOnly), handler);
  return true;
});

exports('GetHealthStatus', () => ({ ...lastHealthCheck }));

exports('GetConfig', () => ({
  ...Config,
  adminIdentifier: Config.adminIdentifier ? 'configured' : '',
  items: ITEM_DEFINITIONS,
  spawns: SPAWNS,
}));

Logger.info('CORE', 'Server script loaded', { resource: RESOURCE, version: Config.version });
