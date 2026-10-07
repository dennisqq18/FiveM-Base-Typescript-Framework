"use strict";
var RumbleShared;
(function (RumbleShared) {
    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
    RumbleShared.clamp = clamp;
    function distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    RumbleShared.distance = distance;
    function formatNumber(value) {
        return Math.floor(value).toLocaleString('en-US');
    }
    RumbleShared.formatNumber = formatNumber;
    function isIsoDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
            return false;
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }
    RumbleShared.isIsoDate = isIsoDate;
    function vector3(x, y, z) {
        return { x: Number(x), y: Number(y), z: Number(z) };
    }
    RumbleShared.vector3 = vector3;
    function vector4(x, y, z, heading) {
        return { x: Number(x), y: Number(y), z: Number(z), heading: Number(heading) };
    }
    RumbleShared.vector4 = vector4;
})(RumbleShared || (RumbleShared = {}));
const Config = Object.freeze({
    frameworkName: 'Rumble',
    version: '0.12.0',
    defaultCash: 500,
    defaultCard: 5000,
    maxCharacters: 5,
    minimumCharacterAge: 18,
    maintenanceIntervalMs: 60000,
    autosaveConcurrency: 4,
    stateSyncMinimumDistance: 0.35,
    stateSyncMinimumHeading: 2.0,
    hungerDecay: 1,
    thirstDecay: 1,
    starvationDamage: 5,
    dehydrationDamage: 5,
    inventoryMaxWeight: 30000,
    inventoryMaxSlots: 40,
    maxItemOperation: 1000,
    deathDeadAfterMs: 60000,
    maxRpcPayloadBytes: 16384,
    maxMetadataBytes: 16000,
    securityLogWindowMs: 10000,
    expectedMigration: 5,
    apiVersion: '1.0',
    environment: 'development',
    slowQueryThresholdMs: 100,
    databaseCircuitFailureThreshold: 5,
    databaseCircuitOpenMs: 3000,
    rpcIdempotencyTtlMs: 30000,
    shutdownTimeoutMs: 5000,
    features: Object.freeze({
        needs: true,
        inventory: true,
        vehicles: true,
        metadata: true,
        money: true,
        characterLock: true,
        idempotentRpc: true,
        queryProfiler: true,
    }),
    adminIdentifier: GetConvar('rumble_admin_identifier', '').trim(),
});
const DEFAULT_SPAWN = {
    x: -1037.72,
    y: -2737.88,
    z: 20.17,
    heading: 329.0,
};
const SPAWNS = Object.freeze({
    last: { id: 'last', label: 'Last location' },
    airport: { id: 'airport', label: 'Airport', position: DEFAULT_SPAWN },
    legion: { id: 'legion', label: 'Legion Square', position: { x: 215.76, y: -810.12, z: 30.73, heading: 158.0 } },
    hospital: { id: 'hospital', label: 'Pillbox Hospital', position: { x: 298.18, y: -584.45, z: 43.26, heading: 70.0 } },
});
const ITEM_DEFINITIONS = Object.freeze({
    water: { name: 'water', label: 'Water', weight: 500, stackable: true, usable: true },
    sandwich: { name: 'sandwich', label: 'Sandwich', weight: 350, stackable: true, usable: true },
    medkit: { name: 'medkit', label: 'Medkit', weight: 900, stackable: true, usable: true },
    armor: { name: 'armor', label: 'Body armor', weight: 2500, stackable: true, usable: true },
});
class CoreError extends Error {
    constructor(code, message, data = {}) {
        super(message);
        this.name = 'CoreError';
        this.code = code;
        this.data = data;
    }
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function clampNumber(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}
function distance3D(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
function formatMoney(value) {
    return Math.floor(value).toLocaleString('en-US');
}
function safeJsonParse(value, fallback = {}) {
    if (value === null || value === undefined || value === '')
        return fallback;
    if (typeof value === 'object')
        return value;
    try {
        return JSON.parse(String(value));
    }
    catch {
        return fallback;
    }
}
function serializedSize(value) {
    try {
        return JSON.stringify(value ?? null).length;
    }
    catch {
        return Number.MAX_SAFE_INTEGER;
    }
}
function getPlayerIdentifiers(source) {
    const identifiers = [];
    const count = GetNumPlayerIdentifiers(source);
    for (let index = 0; index < count; index++) {
        const identifier = GetPlayerIdentifier(source, index);
        if (identifier)
            identifiers.push(identifier);
    }
    return identifiers;
}
function getPrimaryIdentifier(source) {
    const identifiers = getPlayerIdentifiers(source);
    return identifiers.find((id) => id.startsWith('license:')) ?? identifiers.find((id) => id.startsWith('fivem:')) ?? identifiers[0] ?? null;
}
function normalizeDateOfBirth(value) {
    if (!value)
        return null;
    if (value instanceof Date && Number.isFinite(value.getTime()))
        return value.toISOString().slice(0, 10);
    const text = String(value).trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!match)
        return null;
    return validateDateOfBirth(match[1]) ? match[1] : null;
}
function validateCharacterName(value) {
    return /^[\p{L}'-]{2,24}$/u.test(value);
}
function validateDateOfBirth(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
        return false;
    const year = parsed.getUTCFullYear();
    if (year < 1900)
        return false;
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return parsed.getTime() <= today;
}
function isAtLeastAge(value, minimumAge) {
    if (!validateDateOfBirth(value))
        return false;
    const [year, month, day] = value.split('-').map(Number);
    const now = new Date();
    let age = now.getUTCFullYear() - year;
    const currentMonth = now.getUTCMonth() + 1;
    const currentDay = now.getUTCDate();
    if (currentMonth < month || (currentMonth === month && currentDay < day))
        age--;
    return age >= minimumAge;
}
function validPlayerSource(value) {
    const source = Number(value);
    return Number.isInteger(source) && source > 0 && Boolean(GetPlayerName(source));
}
function sanitizeReason(value, fallback = 'unknown') {
    const text = String(value ?? fallback).trim();
    return (text || fallback).slice(0, 128);
}
const databaseMetrics = {
    queries: 0,
    failed: 0,
    slow: 0,
    totalMs: 0,
    maxMs: 0,
    consecutiveFailures: 0,
    circuitOpenUntil: 0,
};
function oxmysql() {
    const ox = globalThis.exports?.oxmysql;
    if (!ox)
        throw new CoreError('OXMYSQL_UNAVAILABLE', 'oxmysql export is not available.');
    return ox;
}
function databaseLabel(query) {
    return query.replace(/\s+/g, ' ').trim().slice(0, 120);
}
async function runDatabaseCall(query, operation) {
    const current = Date.now();
    if (databaseMetrics.circuitOpenUntil > current)
        throw new CoreError('DATABASE_CIRCUIT_OPEN', 'Database circuit breaker is open.', { retryAfterMs: databaseMetrics.circuitOpenUntil - current });
    const started = performance.now();
    databaseMetrics.queries++;
    let failed = false;
    try {
        const result = await operation();
        databaseMetrics.consecutiveFailures = 0;
        return result;
    }
    catch (error) {
        failed = true;
        databaseMetrics.failed++;
        databaseMetrics.consecutiveFailures++;
        if (databaseMetrics.consecutiveFailures >= Config.databaseCircuitFailureThreshold)
            databaseMetrics.circuitOpenUntil = Date.now() + Config.databaseCircuitOpenMs;
        throw error;
    }
    finally {
        const durationMs = Number((performance.now() - started).toFixed(2));
        databaseMetrics.totalMs += durationMs;
        databaseMetrics.maxMs = Math.max(databaseMetrics.maxMs, durationMs);
        const slow = durationMs >= Config.slowQueryThresholdMs;
        if (slow)
            databaseMetrics.slow++;
        if (Config.features.queryProfiler)
            emit('rumble:telemetry:query', { label: databaseLabel(query), durationMs, slow, failed });
    }
}
async function dbQuery(query, params = []) {
    return await runDatabaseCall(query, async () => await oxmysql().query_async(query, params));
}
async function dbSingle(query, params = []) {
    return await runDatabaseCall(query, async () => await oxmysql().single_async(query, params));
}
async function dbInsert(query, params = []) {
    return await runDatabaseCall(query, async () => Number(await oxmysql().insert_async(query, params)));
}
async function dbUpdate(query, params = []) {
    return await runDatabaseCall(query, async () => Number(await oxmysql().update_async(query, params)));
}
async function dbTransaction(queries) {
    if (!Array.isArray(queries) || queries.length === 0)
        return true;
    const label = `transaction:${queries.length}`;
    return await runDatabaseCall(label, async () => Boolean(await oxmysql().transaction_async(queries.map((entry) => ({ query: entry.query, values: entry.values ?? [] })))));
}
function getDatabaseMetrics() {
    return {
        ...databaseMetrics,
        averageMs: databaseMetrics.queries > 0 ? Number((databaseMetrics.totalMs / databaseMetrics.queries).toFixed(2)) : 0,
    };
}
class InternalEventBus {
    constructor() {
        this.handlers = new Map();
    }
    on(name, handler) {
        const set = this.handlers.get(name) ?? new Set();
        set.add(handler);
        this.handlers.set(name, set);
        return () => {
            const current = this.handlers.get(name);
            if (!current)
                return;
            current.delete(handler);
            if (current.size === 0)
                this.handlers.delete(name);
        };
    }
    async emit(name, ...args) {
        const handlers = Array.from(this.handlers.get(name) ?? []);
        if (handlers.length === 0)
            return;
        await Promise.allSettled(handlers.map((handler) => Promise.resolve(handler(...args))));
    }
    clear() {
        this.handlers.clear();
    }
}
const CoreEvents = new InternalEventBus();
class IdempotencyService {
    constructor() {
        this.records = new Map();
    }
    get(key) {
        const record = this.records.get(key);
        if (!record)
            return null;
        if (record.expiresAt <= Date.now()) {
            this.records.delete(key);
            return null;
        }
        return record;
    }
    set(key, success, result, error) {
        this.records.set(key, { expiresAt: Date.now() + Config.rpcIdempotencyTtlMs, success, result, error });
        if (this.records.size > 2048)
            this.cleanup();
    }
    clearSource(source) {
        const prefix = `${source}:`;
        for (const key of this.records.keys())
            if (key.startsWith(prefix))
                this.records.delete(key);
    }
    cleanup() {
        const current = Date.now();
        for (const [key, record] of this.records)
            if (record.expiresAt <= current)
                this.records.delete(key);
    }
}
const RpcIdempotency = new IdempotencyService();
const coreModules = new Map();
function registerCoreModule(nameInput, versionInput) {
    const name = String(nameInput ?? '').trim();
    if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(name))
        return false;
    coreModules.set(name, { name, version: String(versionInput ?? 'unknown').slice(0, 32), status: 'healthy', updatedAt: Date.now() });
    return true;
}
function getCoreModules() {
    return Array.from(coreModules.values()).map((entry) => ({ ...entry }));
}
class PlayerCache {
    constructor() {
        this.entries = new Map();
    }
    get size() {
        return this.entries.size;
    }
    has(source) {
        return this.entries.has(source);
    }
    get(source) {
        return this.entries.get(source);
    }
    set(source, value) {
        this.entries.set(source, value);
        return this;
    }
    delete(source) {
        return this.entries.delete(source);
    }
    values() {
        return this.entries.values();
    }
    [Symbol.iterator]() {
        return this.entries[Symbol.iterator]();
    }
    find(predicate) {
        for (const value of this.entries.values())
            if (predicate(value))
                return value;
        return undefined;
    }
    snapshot() {
        return Array.from(this.entries.values());
    }
}
class SecurityLayer {
    constructor() {
        this.limits = new Map();
        this.reports = new Map();
    }
    allow(source, key, limit, windowMs) {
        const now = Date.now();
        const id = `${source}:${key}`;
        const current = this.limits.get(id);
        if (!current || now - current.startedAt >= windowMs) {
            this.limits.set(id, { startedAt: now, count: 1 });
            return true;
        }
        if (current.count >= limit)
            return false;
        current.count++;
        return true;
    }
    shouldReport(source, key) {
        const now = Date.now();
        const id = `${source}:${key}`;
        const previous = this.reports.get(id) ?? 0;
        if (now - previous < Config.securityLogWindowMs)
            return false;
        this.reports.set(id, now);
        return true;
    }
    validatePayload(payload, maximumBytes = Config.maxRpcPayloadBytes) {
        return serializedSize(payload) <= maximumBytes;
    }
    validateMoney(amount) {
        const value = Number(amount);
        return Number.isSafeInteger(value) && value >= 0;
    }
    validateItemAmount(amount) {
        const value = Number(amount);
        return Number.isSafeInteger(value) && value > 0 && value <= Config.maxItemOperation;
    }
    clearSource(source) {
        for (const key of Array.from(this.limits.keys()))
            if (key.startsWith(`${source}:`))
                this.limits.delete(key);
        for (const key of Array.from(this.reports.keys()))
            if (key.startsWith(`${source}:`))
                this.reports.delete(key);
    }
}
const Security = new SecurityLayer();
class StructuredLogger {
    write(level, category, message, data) {
        const suffix = data === undefined ? '' : ` ${this.serialize(data)}`;
        const line = `[RUMBLE][${level}][${category}] ${message}${suffix}`;
        if (level === 'ERROR')
            console.error(line);
        else if (level === 'WARN' || level === 'SECURITY')
            console.warn(line);
        else
            console.log(line);
    }
    serialize(data) {
        try {
            const text = JSON.stringify(data);
            return text.length > 2000 ? `${text.slice(0, 2000)}...` : text;
        }
        catch {
            return String(data);
        }
    }
    info(category, message, data) {
        this.write('INFO', category, message, data);
    }
    warn(category, message, data) {
        this.write('WARN', category, message, data);
    }
    error(category, message, data) {
        this.write('ERROR', category, message, data);
    }
    security(message, data) {
        this.write('SECURITY', 'SECURITY', message, data);
    }
}
const Logger = new StructuredLogger();
class PlayerRepository {
    async upsert(identifier, playerName) {
        return await dbInsert(`INSERT INTO rumble_players (identifier, player_name)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         player_name = VALUES(player_name),
         last_seen = CURRENT_TIMESTAMP,
         player_id = LAST_INSERT_ID(player_id)`, [identifier, playerName]);
    }
    async getActiveCharacterId(identifier) {
        const row = await dbSingle('SELECT active_character_id FROM rumble_players WHERE identifier = ? LIMIT 1', [identifier]);
        return Number(row?.active_character_id ?? 0);
    }
    async setActiveCharacter(identifier, characterId) {
        await dbUpdate('UPDATE rumble_players SET active_character_id = ?, last_seen = CURRENT_TIMESTAMP WHERE identifier = ?', [characterId, identifier]);
    }
}
const CHARACTER_COLUMNS = `
  id,
  player_identifier,
  citizen_id,
  slot,
  first_name,
  last_name,
  DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS date_of_birth,
  cash,
  card,
  position_x,
  position_y,
  position_z,
  position_heading,
  health,
  armor,
  hunger,
  thirst,
  revision,
  last_played,
  created_at,
  updated_at,
  deleted_at
`;
class CharacterRepository {
    async list(identifier) {
        return await dbQuery(`SELECT ${CHARACTER_COLUMNS}
       FROM rumble_characters
       WHERE player_identifier = ? AND deleted_at IS NULL
       ORDER BY last_played DESC, slot ASC`, [identifier]);
    }
    async listSlots(identifier) {
        const rows = await dbQuery(`SELECT slot
       FROM rumble_characters
       WHERE player_identifier = ? AND deleted_at IS NULL
       ORDER BY slot ASC`, [identifier]);
        return rows.map((row) => Number(row.slot)).filter((slot) => Number.isInteger(slot) && slot > 0);
    }
    async getById(identifier, characterId) {
        return await dbSingle(`SELECT ${CHARACTER_COLUMNS}
       FROM rumble_characters
       WHERE id = ? AND player_identifier = ? AND deleted_at IS NULL
       LIMIT 1`, [characterId, identifier]);
    }
    async getByIdOnly(characterId) {
        return await dbSingle(`SELECT ${CHARACTER_COLUMNS}
       FROM rumble_characters
       WHERE id = ?
       LIMIT 1`, [characterId]);
    }
    async insert(data) {
        return await dbInsert(`INSERT INTO rumble_characters
        (player_identifier, citizen_id, slot, first_name, last_name, date_of_birth, cash, card,
         position_x, position_y, position_z, position_heading)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            data.identifier,
            data.citizenId,
            data.slot,
            data.firstName,
            data.lastName,
            data.dateOfBirth,
            data.cash,
            data.card,
            data.position.x,
            data.position.y,
            data.position.z,
            data.position.heading,
        ]);
    }
    async saveState(characterId, identifier, version, data) {
        const changed = await dbUpdate(`UPDATE rumble_characters
       SET position_x = ?, position_y = ?, position_z = ?, position_heading = ?,
           health = ?, armor = ?, hunger = ?, thirst = ?, revision = revision + 1, last_played = CURRENT_TIMESTAMP
       WHERE id = ? AND player_identifier = ? AND revision = ?`, [
            data.position.x,
            data.position.y,
            data.position.z,
            data.position.heading,
            data.health,
            data.armor,
            data.hunger,
            data.thirst,
            characterId,
            identifier,
            version,
        ]);
        return changed > 0;
    }
    async updateIdentity(identifier, characterId, firstName, lastName, dateOfBirth) {
        await dbUpdate(`UPDATE rumble_characters
       SET first_name = ?, last_name = ?, date_of_birth = ?
       WHERE id = ? AND player_identifier = ? AND deleted_at IS NULL`, [firstName, lastName, dateOfBirth, characterId, identifier]);
    }
    async touch(characterId, identifier) {
        await dbUpdate('UPDATE rumble_characters SET last_played = CURRENT_TIMESTAMP WHERE id = ? AND player_identifier = ?', [characterId, identifier]);
    }
    async updateMoney(characterId, identifier, account, amount) {
        const column = account === 'cash' ? 'cash' : 'card';
        await dbUpdate(`UPDATE rumble_characters SET ${column} = ? WHERE id = ? AND player_identifier = ?`, [amount, characterId, identifier]);
    }
}
class MetadataRepository {
    async list(characterId) {
        return await dbQuery('SELECT meta_key, meta_value FROM rumble_character_metadata WHERE character_id = ?', [characterId]);
    }
    async set(characterId, key, serializedValue) {
        await dbQuery(`INSERT INTO rumble_character_metadata (character_id, meta_key, meta_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value), updated_at = CURRENT_TIMESTAMP`, [characterId, key, serializedValue]);
    }
    async remove(characterId, key) {
        await dbUpdate('DELETE FROM rumble_character_metadata WHERE character_id = ? AND meta_key = ?', [characterId, key]);
    }
}
class InventoryRepository {
    async list(characterId) {
        return await dbQuery('SELECT id, slot, item_name, amount, metadata FROM rumble_inventory WHERE character_id = ? ORDER BY slot ASC', [characterId]);
    }
    async hasAny(characterId) {
        return Boolean(await dbSingle('SELECT id FROM rumble_inventory WHERE character_id = ? LIMIT 1', [characterId]));
    }
    async insert(characterId, slot, itemName, amount, metadata) {
        return await dbInsert('INSERT INTO rumble_inventory (character_id, slot, item_name, amount, metadata) VALUES (?, ?, ?, ?, ?)', [characterId, slot, itemName, amount, metadata]);
    }
    async insertMany(characterId, items) {
        if (items.length === 0)
            return;
        const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const params = items.flatMap((item) => [characterId, item.slot, item.itemName, item.amount, item.metadata]);
        await dbQuery(`INSERT INTO rumble_inventory (character_id, slot, item_name, amount, metadata) VALUES ${placeholders}`, params);
    }
    async updateAmount(characterId, id, amount) {
        await dbUpdate('UPDATE rumble_inventory SET amount = ? WHERE id = ? AND character_id = ?', [amount, id, characterId]);
    }
    async remove(characterId, id) {
        await dbUpdate('DELETE FROM rumble_inventory WHERE id = ? AND character_id = ?', [id, characterId]);
    }
}
class VehicleRepository {
    async list(characterId) {
        return await dbQuery('SELECT * FROM rumble_owned_vehicles WHERE character_id = ? ORDER BY id ASC', [characterId]);
    }
    async getById(id) {
        return await dbSingle('SELECT * FROM rumble_owned_vehicles WHERE id = ? LIMIT 1', [id]);
    }
    async findByPlate(plate, characterId) {
        if (characterId === undefined)
            return await dbSingle('SELECT * FROM rumble_owned_vehicles WHERE plate = ? LIMIT 1', [plate]);
        return await dbSingle('SELECT * FROM rumble_owned_vehicles WHERE plate = ? AND character_id = ? LIMIT 1', [plate, characterId]);
    }
    async insert(characterId, plate, model, properties) {
        return await dbInsert(`INSERT INTO rumble_owned_vehicles
        (character_id, plate, model, garage, stored, fuel, engine_health, body_health, properties)
       VALUES (?, ?, ?, 'legion', 1, 100, 1000, 1000, ?)`, [characterId, plate, model, properties]);
    }
    async update(characterId, id, data) {
        await dbUpdate(`UPDATE rumble_owned_vehicles
       SET garage = ?, stored = ?, fuel = ?, engine_health = ?, body_health = ?, properties = ?
       WHERE id = ? AND character_id = ?`, [data.garage, data.stored ? 1 : 0, data.fuel, data.engineHealth, data.bodyHealth, data.properties, id, characterId]);
    }
    async remove(characterId, plate) {
        return await dbUpdate('DELETE FROM rumble_owned_vehicles WHERE plate = ? AND character_id = ?', [plate, characterId]);
    }
}
class FactionRepository {
    async getMembership(characterId) {
        return await dbSingle(`SELECT cf.faction_name,
              f.label AS faction_label,
              cf.grade,
              fg.name AS grade_name,
              fg.label AS grade_label
       FROM rumble_character_factions cf
       JOIN rumble_factions f ON f.name = cf.faction_name
       JOIN rumble_faction_grades fg ON fg.faction_name = cf.faction_name AND fg.grade = cf.grade
       WHERE cf.character_id = ?
       LIMIT 1`, [characterId]);
    }
    async factionExists(factionName) {
        return Boolean(await dbSingle('SELECT name FROM rumble_factions WHERE name = ? LIMIT 1', [factionName]));
    }
    async gradeExists(factionName, grade) {
        return Boolean(await dbSingle('SELECT grade FROM rumble_faction_grades WHERE faction_name = ? AND grade = ? LIMIT 1', [factionName, grade]));
    }
    async setMembership(characterId, factionName, grade) {
        await dbQuery(`INSERT INTO rumble_character_factions (character_id, faction_name, grade)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE faction_name = VALUES(faction_name), grade = VALUES(grade), updated_at = CURRENT_TIMESTAMP`, [characterId, factionName, grade]);
    }
    async removeMembership(characterId) {
        await dbUpdate('DELETE FROM rumble_character_factions WHERE character_id = ?', [characterId]);
    }
}
class MoneyRepository {
    async record(characterId, account, amount, balanceAfter, reason, actorIdentifier) {
        await dbInsert(`INSERT INTO rumble_money_transactions
        (character_id, account, amount, balance_after, reason, actor_identifier)
       VALUES (?, ?, ?, ?, ?, ?)`, [characterId, account, amount, balanceAfter, reason, actorIdentifier]);
    }
}
class LogRepository {
    async insert(data) {
        await dbInsert(`INSERT INTO rumble_logs
        (category, action, source_identifier, source_character_id, target_identifier, target_character_id, payload, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            data.category.slice(0, 48),
            data.action.slice(0, 64),
            data.sourceIdentifier,
            data.sourceCharacterId,
            data.targetIdentifier,
            data.targetCharacterId,
            data.payload.slice(0, 16000),
            data.requestId ? data.requestId.slice(0, 96) : null,
        ]);
    }
}
class MigrationRepository {
    async exists(version) {
        return Boolean(await dbSingle('SELECT version FROM rumble_migrations WHERE version = ? LIMIT 1', [version]));
    }
    async record(version, name, checksum = null) {
        await dbQuery('INSERT IGNORE INTO rumble_migrations (version, name, checksum) VALUES (?, ?, ?)', [version, name, checksum]);
    }
    async latest() {
        const row = await dbSingle('SELECT MAX(version) AS version FROM rumble_migrations');
        return Number(row?.version ?? 0);
    }
}
async function waitForDatabase() {
    for (let attempt = 1; attempt <= 30; attempt++) {
        try {
            await dbQuery('SELECT 1 AS ok');
            return;
        }
        catch (error) {
            if (attempt === 30)
                throw error;
            Logger.info('DATABASE', 'Waiting for database', { attempt, maximum: 30 });
            await delay(1000);
        }
    }
}
async function createFinalSchema() {
    await dbQuery(`
    CREATE TABLE IF NOT EXISTS rumble_players (
      player_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      identifier VARCHAR(96) NOT NULL,
      player_name VARCHAR(64) NOT NULL,
      active_character_id INT UNSIGNED NULL,
      first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (identifier),
      UNIQUE KEY uq_rumble_players_player_id (player_id),
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
      cash BIGINT UNSIGNED NOT NULL DEFAULT 500,
      card BIGINT UNSIGNED NOT NULL DEFAULT 5000,
      position_x DECIMAL(11,4) NOT NULL DEFAULT -1037.7200,
      position_y DECIMAL(11,4) NOT NULL DEFAULT -2737.8800,
      position_z DECIMAL(11,4) NOT NULL DEFAULT 20.1700,
      position_heading DECIMAL(7,3) NOT NULL DEFAULT 329.000,
      health SMALLINT UNSIGNED NOT NULL DEFAULT 200,
      armor SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      hunger TINYINT UNSIGNED NOT NULL DEFAULT 100,
      thirst TINYINT UNSIGNED NOT NULL DEFAULT 100,
      revision INT UNSIGNED NOT NULL DEFAULT 0,
      last_played TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_rumble_citizen_id (citizen_id),
      UNIQUE KEY uq_rumble_character_slot (player_identifier, slot),
      KEY idx_rumble_characters_owner (player_identifier),
      CONSTRAINT fk_rumble_characters_player FOREIGN KEY (player_identifier) REFERENCES rumble_players(identifier) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
    await createFoundationTables();
}
async function createFoundationTables() {
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
      request_id VARCHAR(96) NULL,
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
      amount BIGINT NOT NULL,
      balance_after BIGINT UNSIGNED NOT NULL,
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
}
async function applyFoundationMigration() {
    const activeCharacterColumn = await dbQuery("SHOW COLUMNS FROM rumble_players LIKE 'active_character_id'");
    if (activeCharacterColumn.length === 0) {
        await dbQuery('ALTER TABLE rumble_players ADD COLUMN active_character_id INT UNSIGNED NULL AFTER player_name');
        await dbQuery('ALTER TABLE rumble_players ADD KEY idx_rumble_players_active_character (active_character_id)');
    }
    const updatedAtColumn = await dbQuery("SHOW COLUMNS FROM rumble_characters LIKE 'updated_at'");
    if (updatedAtColumn.length === 0)
        await dbQuery('ALTER TABLE rumble_characters ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
    const dateOfBirthColumn = await dbQuery("SHOW COLUMNS FROM rumble_characters LIKE 'date_of_birth'");
    if (dateOfBirthColumn.length === 0)
        await dbQuery('ALTER TABLE rumble_characters ADD COLUMN date_of_birth DATE NULL AFTER last_name');
    const hungerColumn = await dbQuery("SHOW COLUMNS FROM rumble_characters LIKE 'hunger'");
    if (hungerColumn.length === 0)
        await dbQuery('ALTER TABLE rumble_characters ADD COLUMN hunger TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER armor');
    const thirstColumn = await dbQuery("SHOW COLUMNS FROM rumble_characters LIKE 'thirst'");
    if (thirstColumn.length === 0)
        await dbQuery('ALTER TABLE rumble_characters ADD COLUMN thirst TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER hunger');
    const cardColumn = await dbQuery("SHOW COLUMNS FROM rumble_characters LIKE 'card'");
    if (cardColumn.length === 0) {
        await dbQuery('ALTER TABLE rumble_characters ADD COLUMN card BIGINT UNSIGNED NOT NULL DEFAULT 5000 AFTER cash');
        const bankColumn = await dbQuery("SHOW COLUMNS FROM rumble_characters LIKE 'bank'");
        if (bankColumn.length > 0)
            await dbQuery('UPDATE rumble_characters SET card = bank');
    }
    await createFoundationTables();
    await migrationRepository.record(2, 'framework_foundation');
}
async function applyStaticIdMigration() {
    const playerIdColumns = await dbQuery("SHOW COLUMNS FROM rumble_players LIKE 'player_id'");
    if (playerIdColumns.length === 0)
        await dbQuery('ALTER TABLE rumble_players ADD COLUMN player_id BIGINT UNSIGNED NULL AFTER identifier');
    const currentPlayerIdColumns = playerIdColumns.length > 0 ? playerIdColumns : await dbQuery("SHOW COLUMNS FROM rumble_players LIKE 'player_id'");
    const isAutoIncrement = String(currentPlayerIdColumns[0]?.Extra ?? '').toLowerCase().includes('auto_increment');
    if (!isAutoIncrement) {
        await dbQuery(`
      UPDATE rumble_players AS player
      JOIN (
        SELECT identifier, ROW_NUMBER() OVER (ORDER BY first_seen ASC, identifier ASC) AS permanent_id
        FROM rumble_players
      ) AS ranked ON ranked.identifier = player.identifier
      SET player.player_id = ranked.permanent_id
    `);
        const playerIdIndex = await dbQuery("SHOW INDEX FROM rumble_players WHERE Key_name = 'uq_rumble_players_player_id'");
        if (playerIdIndex.length === 0) {
            await dbQuery('ALTER TABLE rumble_players MODIFY player_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, ADD UNIQUE KEY uq_rumble_players_player_id (player_id)');
        }
        else {
            await dbQuery('ALTER TABLE rumble_players MODIFY player_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
        }
    }
    await dbQuery('ALTER TABLE rumble_characters MODIFY cash BIGINT UNSIGNED NOT NULL DEFAULT 500, MODIFY card BIGINT UNSIGNED NOT NULL DEFAULT 5000');
    await dbQuery('ALTER TABLE rumble_money_transactions MODIFY amount BIGINT NOT NULL, MODIFY balance_after BIGINT UNSIGNED NOT NULL');
    await migrationRepository.record(3, 'static_player_ids_and_bigint_money');
}
async function applyBackendRuntimeMigration() {
    const checksumColumn = await dbQuery("SHOW COLUMNS FROM rumble_migrations LIKE 'checksum'");
    if (checksumColumn.length === 0)
        await dbQuery('ALTER TABLE rumble_migrations ADD COLUMN checksum VARCHAR(64) NULL AFTER name');
    const revisionColumn = await dbQuery("SHOW COLUMNS FROM rumble_characters LIKE 'revision'");
    if (revisionColumn.length === 0)
        await dbQuery('ALTER TABLE rumble_characters ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 0 AFTER thirst');
    const requestIdColumn = await dbQuery("SHOW COLUMNS FROM rumble_logs LIKE 'request_id'");
    if (requestIdColumn.length === 0) {
        await dbQuery('ALTER TABLE rumble_logs ADD COLUMN request_id VARCHAR(96) NULL AFTER payload');
        await dbQuery('ALTER TABLE rumble_logs ADD KEY idx_rumble_logs_request_id (request_id)');
    }
    await migrationRepository.record(4, 'backend_runtime_foundation', 'rumble-004-v1');
}
async function applyFactionMigration() {
    await dbQuery(`
    CREATE TABLE IF NOT EXISTS rumble_factions (
      name VARCHAR(32) NOT NULL,
      label VARCHAR(64) NOT NULL,
      category ENUM('government','civilian') NOT NULL DEFAULT 'government',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
    await dbQuery(`
    CREATE TABLE IF NOT EXISTS rumble_faction_grades (
      faction_name VARCHAR(32) NOT NULL,
      grade TINYINT UNSIGNED NOT NULL,
      name VARCHAR(32) NOT NULL,
      label VARCHAR(64) NOT NULL,
      salary INT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (faction_name, grade),
      CONSTRAINT fk_rumble_faction_grades_faction FOREIGN KEY (faction_name) REFERENCES rumble_factions(name) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
    await dbQuery(`
    CREATE TABLE IF NOT EXISTS rumble_character_factions (
      character_id INT UNSIGNED NOT NULL,
      faction_name VARCHAR(32) NOT NULL,
      grade TINYINT UNSIGNED NOT NULL DEFAULT 0,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (character_id),
      KEY idx_rumble_character_factions_faction (faction_name, grade),
      CONSTRAINT fk_rumble_character_factions_character FOREIGN KEY (character_id) REFERENCES rumble_characters(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_rumble_character_factions_grade FOREIGN KEY (faction_name, grade) REFERENCES rumble_faction_grades(faction_name, grade) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
    await dbQuery(`INSERT INTO rumble_factions (name, label, category) VALUES
       ('police', 'Los Santos Police Department', 'government'),
       ('medics', 'Los Santos Doctoral Service', 'government')
     ON DUPLICATE KEY UPDATE label = VALUES(label), category = VALUES(category)`);
    await dbQuery(`INSERT INTO rumble_faction_grades (faction_name, grade, name, label, salary) VALUES
       ('police', 0, 'cadet', 'Cadet', 450),
       ('police', 1, 'officer', 'Officer', 600),
       ('police', 2, 'senior_officer', 'Senior Officer', 750),
       ('police', 3, 'sergeant', 'Sergeant', 900),
       ('police', 4, 'lieutenant', 'Lieutenant', 1100),
       ('police', 5, 'chief', 'Chief of Police', 1400),
       ('medics', 0, 'intern', 'Intern', 450),
       ('medics', 1, 'paramedic', 'Paramedic', 600),
       ('medics', 2, 'doctor', 'Doctor', 800),
       ('medics', 3, 'senior_doctor', 'Senior Doctor', 950),
       ('medics', 4, 'supervisor', 'Supervisor', 1150),
       ('medics', 5, 'director', 'Director Doctoral', 1400)
     ON DUPLICATE KEY UPDATE name = VALUES(name), label = VALUES(label), salary = VALUES(salary)`);
    await migrationRepository.record(5, 'factions_foundation', 'rumble-005-v1');
}
async function initializeDatabase() {
    await waitForDatabase();
    await dbQuery(`
    CREATE TABLE IF NOT EXISTS rumble_migrations (
      version INT UNSIGNED NOT NULL,
      name VARCHAR(96) NOT NULL,
      checksum VARCHAR(64) NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
    const checksumColumn = await dbQuery("SHOW COLUMNS FROM rumble_migrations LIKE 'checksum'");
    if (checksumColumn.length === 0)
        await dbQuery('ALTER TABLE rumble_migrations ADD COLUMN checksum VARCHAR(64) NULL AFTER name');
    let migration = await migrationRepository.latest();
    if (migration === 0) {
        await createFinalSchema();
        await migrationRepository.record(1, 'legacy_base');
        await applyFoundationMigration();
        await applyStaticIdMigration();
        migration = 3;
        await applyBackendRuntimeMigration();
        migration = 4;
        await applyFactionMigration();
        migration = 5;
    }
    else {
        if (migration < 2) {
            await applyFoundationMigration();
            migration = 2;
        }
        if (migration < 3) {
            await applyStaticIdMigration();
            migration = 3;
        }
        if (migration < 4) {
            await applyBackendRuntimeMigration();
            migration = 4;
        }
        if (migration < 5) {
            await applyFactionMigration();
            migration = 5;
        }
    }
    databaseReady = true;
    Logger.info('DATABASE', 'Database ready', { migration });
}
const RESOURCE = GetCurrentResourceName();
const MAX_HEALTH = 200;
const MAX_ARMOR = 100;
const sessions = new PlayerCache();
const playerIdBySource = new Map();
const sourceByPlayerId = new Map();
const identifierBySource = new Map();
const adminBySource = new Map();
const loadingPlayers = new Set();
const creatingCharacters = new Set();
const rpcHandlers = new Map();
const rpcValidators = new Map();
const commandRegistry = new Map();
const activeCharacterOwners = new Map();
let databaseReady = false;
let autosaveRunning = false;
const playerRepository = new PlayerRepository();
const characterRepository = new CharacterRepository();
const metadataRepository = new MetadataRepository();
const inventoryRepository = new InventoryRepository();
const vehicleRepository = new VehicleRepository();
const factionRepository = new FactionRepository();
const moneyRepository = new MoneyRepository();
const logRepository = new LogRepository();
const migrationRepository = new MigrationRepository();
const frozenPlayers = new Set();
let lastHealthCheck = {};
let logSequence = 0;
function message(source, text, kind = 'info') {
    const prefix = kind === 'error' ? '^1Rumble' : kind === 'success' ? '^2Rumble' : '^5Rumble';
    emitNet('chat:addMessage', source, {
        color: [255, 255, 255],
        multiline: false,
        args: [prefix, text],
    });
}
function isAdmin(source) {
    if (source === 0)
        return true;
    const cached = adminBySource.get(source);
    if (cached !== undefined)
        return cached;
    const allowed = Boolean(Config.adminIdentifier && !Config.adminIdentifier.includes('PASTE_') && getPlayerIdentifiers(source).includes(Config.adminIdentifier));
    adminBySource.set(source, allowed);
    return allowed;
}
function requireAdmin(source) {
    if (isAdmin(source))
        return true;
    message(source, 'You do not have access to Rumble administrative commands.', 'error');
    return false;
}
function allowRate(source, key, limit, windowMs) {
    const allowed = Security.allow(source, key, limit, windowMs);
    if (!allowed && Security.shouldReport(source, key)) {
        Logger.security('Rate limit exceeded', { source, key, limit, windowMs });
        void logAction('security', 'rate_limit', source, source, { key, limit, windowMs });
    }
    return allowed;
}
function rejectSecurity(source, action, payload = {}) {
    emit('rumble:telemetry:securityRejected', { source, action });
    Logger.security(action, { source, ...payload });
    void logAction('security', action, source, source, payload);
}
function setPlayerState(source, key, value) {
    try {
        const playerFactory = globalThis.Player;
        const player = typeof playerFactory === 'function' ? playerFactory(source) : null;
        if (player?.state?.set)
            player.state.set(key, value, true);
    }
    catch { }
}
function toCharacter(row) {
    return {
        id: Number(row.id),
        stateId: Number(row.id),
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
        version: Number(row.revision ?? 0),
    };
}
function publicPlayer(session) {
    return {
        id: session.playerId,
        playerId: session.playerId,
        source: session.source,
        identifier: session.identifier,
        name: session.playerName,
        character: {
            ...session.character,
            position: { ...session.character.position },
        },
        faction: session.faction ? { ...session.faction } : null,
    };
}
function publicInventory(session) {
    return session.inventory.map((item) => ({
        id: item.id,
        slot: item.slot,
        name: item.name,
        amount: item.amount,
        metadata: { ...item.metadata },
    }));
}
function publicMetadata(session) {
    return { ...session.metadata };
}
function syncStateBag(session) {
    setPlayerState(session.source, 'rumbleLoaded', session.spawned);
    setPlayerState(session.source, 'rumblePlayerId', session.playerId);
    setPlayerState(session.source, 'rumbleStateId', session.character.stateId);
    setPlayerState(session.source, 'rumbleCharacterId', session.character.id);
    setPlayerState(session.source, 'rumbleCitizenId', session.character.citizenId);
    setPlayerState(session.source, 'rumbleCash', session.character.cash);
    setPlayerState(session.source, 'rumbleCard', session.character.card);
    setPlayerState(session.source, 'rumbleHunger', session.character.hunger);
    setPlayerState(session.source, 'rumbleThirst', session.character.thirst);
    setPlayerState(session.source, 'rumbleDeathState', String(session.metadata.deathState ?? 'alive'));
    setPlayerState(session.source, 'rumbleFaction', session.faction?.name ?? 'unemployed');
    setPlayerState(session.source, 'rumbleFactionGrade', session.faction?.grade ?? 0);
    setPlayerState(session.source, 'rumbleAdmin', isAdmin(session.source));
}
async function logAction(category, action, source, target, payload = {}) {
    if (!databaseReady)
        return;
    try {
        const sourceSession = source !== null ? sessions.get(source) : null;
        const targetSession = target !== null ? sessions.get(target) : null;
        const sourceIdentifier = source === 0 ? 'console' : sourceSession?.identifier ?? (source !== null ? getCachedIdentifier(source) : null);
        const targetIdentifier = targetSession?.identifier ?? (target !== null ? getCachedIdentifier(target) : null);
        const requestId = typeof payload.requestId === 'string' && payload.requestId.trim()
            ? payload.requestId.trim().slice(0, 96)
            : `${category}:${Date.now().toString(36)}:${(++logSequence).toString(36)}`;
        await logRepository.insert({
            category,
            action,
            sourceIdentifier,
            sourceCharacterId: sourceSession?.character.id ?? null,
            targetIdentifier,
            targetCharacterId: targetSession?.character.id ?? null,
            payload: JSON.stringify(payload),
            requestId,
        });
    }
    catch (error) {
        Logger.error('DATABASE', 'Could not persist structured log', { category, action, error: String(error) });
    }
}
function toFactionMembership(row) {
    if (!row)
        return null;
    return {
        name: String(row.faction_name),
        label: String(row.faction_label),
        grade: Number(row.grade),
        gradeName: String(row.grade_name),
        gradeLabel: String(row.grade_label),
    };
}
async function loadMetadata(characterId) {
    const rows = await metadataRepository.list(characterId);
    const metadata = {};
    for (const row of rows)
        metadata[String(row.meta_key)] = safeJsonParse(row.meta_value, null);
    if (!metadata.deathState)
        metadata.deathState = 'alive';
    return metadata;
}
async function loadInventory(characterId) {
    const rows = await inventoryRepository.list(characterId);
    return rows.map((row) => ({
        id: Number(row.id),
        slot: Number(row.slot),
        name: String(row.item_name),
        amount: Number(row.amount),
        metadata: safeJsonParse(row.metadata, {}),
    }));
}
async function seedStarterItems(characterId) {
    await inventoryRepository.insertMany(characterId, [
        { slot: 1, itemName: 'water', amount: 2, metadata: '{}' },
        { slot: 2, itemName: 'sandwich', amount: 2, metadata: '{}' },
        { slot: 3, itemName: 'medkit', amount: 1, metadata: '{}' },
    ]);
}
async function performHealthCheck() {
    const resourceState = globalThis.GetResourceState;
    const oxState = typeof resourceState === 'function' ? String(resourceState('oxmysql')) : 'unknown';
    const mysqlConnection = GetConvar('mysql_connection_string', '').trim();
    const onesync = GetConvar('onesync', '').trim();
    const onesyncReady = !['', 'off', 'false', '0'].includes(onesync.toLowerCase());
    let database = false;
    let migration = 0;
    let databaseError = '';
    try {
        await dbQuery('SELECT 1 AS ok');
        database = true;
        migration = await migrationRepository.latest();
    }
    catch (error) {
        databaseError = String(error);
    }
    const adminConfigured = Boolean(Config.adminIdentifier && !Config.adminIdentifier.includes('PASTE_'));
    const result = {
        ok: oxState === 'started' && database && migration >= Config.expectedMigration && Boolean(mysqlConnection) && onesyncReady,
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
        onesyncReady,
        cachePlayers: sessions.size,
        timestamp: new Date().toISOString(),
    };
    lastHealthCheck = result;
    Logger.info('HEALTH', 'Startup health check', result);
    if (RESOURCE !== 'core')
        Logger.warn('HEALTH', 'Resource should be named core for the default configuration', { resource: RESOURCE });
    if (!adminConfigured)
        Logger.warn('HEALTH', 'Admin identifier is not configured');
    if (!onesyncReady)
        Logger.warn('HEALTH', 'OneSync is disabled; multiplayer state validation requires OneSync.');
    if (!result.ok)
        Logger.error('HEALTH', 'One or more critical startup checks failed', result);
    return result;
}
async function upsertPlayer(source, identifier) {
    const playerId = await playerRepository.upsert(identifier, GetPlayerName(source) ?? `Player ${source}`);
    const previousSource = sourceByPlayerId.get(playerId);
    if (previousSource !== undefined && previousSource !== source)
        playerIdBySource.delete(previousSource);
    playerIdBySource.set(source, playerId);
    sourceByPlayerId.set(playerId, source);
    identifierBySource.set(source, identifier);
    return playerId;
}
function getCachedIdentifier(source) {
    return sessions.get(source)?.identifier ?? identifierBySource.get(source) ?? getPrimaryIdentifier(source);
}
function getStaticPlayerId(source) {
    return sessions.get(source)?.playerId ?? playerIdBySource.get(source) ?? 0;
}
function getSourceByStaticPlayerId(playerId) {
    if (!Number.isSafeInteger(playerId) || playerId <= 0)
        return null;
    const source = sourceByPlayerId.get(playerId);
    if (source === undefined || !validPlayerSource(source))
        return null;
    return source;
}
function resolveStaticTarget(value, fallbackSource) {
    if ((value === undefined || value === null || String(value).trim() === '') && fallbackSource !== undefined) {
        const playerId = getStaticPlayerId(fallbackSource);
        return playerId > 0 ? { source: fallbackSource, playerId } : null;
    }
    const playerId = Number(value);
    const source = getSourceByStaticPlayerId(playerId);
    return source === null ? null : { source, playerId };
}
const FACTION_ALIASES = Object.freeze({
    police: 'police',
    politie: 'police',
    pd: 'police',
    lspd: 'police',
    medics: 'medics',
    medici: 'medics',
    medic: 'medics',
    ems: 'medics',
    ambulance: 'medics',
});
function normalizeFactionName(value) {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw)
        return null;
    if (['none', 'unemployed', 'fara', 'fără', 'civilian'].includes(raw))
        return 'unemployed';
    return FACTION_ALIASES[raw] ?? (/^[a-z0-9_-]{1,32}$/.test(raw) ? raw : null);
}
async function updateSessionFaction(session, factionName, grade = 0) {
    if (!factionName || factionName === 'unemployed') {
        await factionRepository.removeMembership(session.character.id);
        session.faction = null;
    }
    else {
        if (!await factionRepository.factionExists(factionName))
            throw new CoreError('FACTION_NOT_FOUND', 'Faction does not exist.', { factionName });
        if (!Number.isInteger(grade) || grade < 0 || grade > 255 || !await factionRepository.gradeExists(factionName, grade)) {
            throw new CoreError('FACTION_GRADE_NOT_FOUND', 'Faction grade does not exist.', { factionName, grade });
        }
        await factionRepository.setMembership(session.character.id, factionName, grade);
        session.faction = toFactionMembership(await factionRepository.getMembership(session.character.id));
    }
    setPlayerState(session.source, 'rumbleFaction', session.faction?.name ?? 'unemployed');
    setPlayerState(session.source, 'rumbleFactionGrade', session.faction?.grade ?? 0);
    emitNet('rumble:faction:update', session.source, session.faction ? { ...session.faction } : null);
    emit('rumble:server:factionChanged', session.source, session.faction ? { ...session.faction } : null);
    return session.faction;
}
function clearStaticPlayerMapping(source) {
    const playerId = playerIdBySource.get(source);
    playerIdBySource.delete(source);
    identifierBySource.delete(source);
    adminBySource.delete(source);
    if (playerId !== undefined && sourceByPlayerId.get(playerId) === source)
        sourceByPlayerId.delete(playerId);
}
function makeCitizenId() {
    const time = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `RMB-${time}-${random}`.slice(0, 32);
}
async function listCharacters(identifier) {
    return (await characterRepository.list(identifier)).map(toCharacter);
}
function characterSummary(character, activeCharacterId = 0) {
    return {
        id: character.id,
        stateId: character.stateId,
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
function sendCharacterSelector(source, characters, activeCharacterId) {
    emitNet('rumble:character:selectorRequired', source, {
        characters: characters.map((character) => characterSummary(character, activeCharacterId)),
        maxCharacters: Config.maxCharacters,
        playerId: getStaticPlayerId(source),
    });
}
async function showCharacterSelector(source, identifier) {
    const [characters, activeCharacterId] = await Promise.all([
        listCharacters(identifier),
        playerRepository.getActiveCharacterId(identifier),
    ]);
    sendCharacterSelector(source, characters, activeCharacterId);
}
async function createCharacter(identifier, firstName, lastName, dateOfBirth) {
    const maxCharacters = Config.maxCharacters;
    const slots = await characterRepository.listSlots(identifier);
    if (slots.length >= maxCharacters) {
        throw new Error(`You have reached the limit of ${maxCharacters} characters.`);
    }
    const usedSlots = new Set(slots);
    let slot = 1;
    while (usedSlots.has(slot))
        slot++;
    const defaultCash = Config.defaultCash;
    const defaultCard = Config.defaultCard;
    let insertedId = 0;
    let citizenId = '';
    for (let attempt = 0; attempt < 5 && !insertedId; attempt++) {
        citizenId = makeCitizenId();
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
        }
        catch (error) {
            if (attempt === 4)
                throw error;
        }
    }
    await seedStarterItems(insertedId);
    await Promise.all([
        defaultCash > 0
            ? moneyRepository.record(insertedId, 'cash', defaultCash, defaultCash, 'character:create', 'system')
            : Promise.resolve(),
        defaultCard > 0
            ? moneyRepository.record(insertedId, 'card', defaultCard, defaultCard, 'character:create', 'system')
            : Promise.resolve(),
    ]);
    return {
        id: insertedId,
        stateId: insertedId,
        citizenId,
        slot,
        firstName,
        lastName,
        dateOfBirth,
        cash: defaultCash,
        card: defaultCard,
        position: { ...DEFAULT_SPAWN },
        health: MAX_HEALTH,
        armor: 0,
        hunger: 100,
        thirst: 100,
        version: 0,
    };
}
function markDirty(session, section = 'state') {
    session.dirty.add(section);
    if (section === 'state')
        session.revision++;
}
function refreshRuntimeState(session) {
    if (!session.spawned)
        return;
    const ped = GetPlayerPed(session.source);
    if (!ped)
        return;
    const coords = GetEntityCoords(ped);
    const heading = Number(globalThis.GetEntityHeading?.(ped) ?? session.character.position.heading);
    const health = Number(globalThis.GetEntityHealth?.(ped) ?? session.character.health);
    const armor = Number(globalThis.GetPedArmour?.(ped) ?? session.character.armor);
    const values = [coords[0], coords[1], coords[2], heading, health, armor];
    if (values.some((value) => !Number.isFinite(value)))
        return;
    const nextPosition = { x: values[0], y: values[1], z: values[2], heading: values[3] };
    const nextHealth = Math.max(0, Math.min(MAX_HEALTH, Math.floor(values[4])));
    const nextArmor = Math.max(0, Math.min(MAX_ARMOR, Math.floor(values[5])));
    const previous = session.character.position;
    const moved = Math.hypot(nextPosition.x - previous.x, nextPosition.y - previous.y, nextPosition.z - previous.z) >= Config.stateSyncMinimumDistance;
    const headingDelta = Math.abs(((nextPosition.heading - previous.heading + 540) % 360) - 180);
    const rotated = headingDelta >= Config.stateSyncMinimumHeading;
    const vitalsChanged = nextHealth !== session.character.health || nextArmor !== session.character.armor;
    if (!moved && !rotated && !vitalsChanged)
        return;
    session.character.position = nextPosition;
    session.character.health = nextHealth;
    session.character.armor = nextArmor;
    markDirty(session);
}
async function saveSession(session, force = false) {
    if (!force && !session.dirty.has('state'))
        return;
    const revision = session.revision;
    const c = session.character;
    const saved = await characterRepository.saveState(c.id, session.identifier, c.version, {
        position: { ...c.position },
        health: clampNumber(Math.floor(c.health), 0, MAX_HEALTH),
        armor: clampNumber(Math.floor(c.armor), 0, MAX_ARMOR),
        hunger: clampNumber(Math.floor(c.hunger), 0, 100),
        thirst: clampNumber(Math.floor(c.thirst), 0, 100),
    });
    if (!saved)
        throw new CoreError('CHARACTER_WRITE_CONFLICT', 'Character state changed outside the active session.', { characterId: c.id, version: c.version });
    c.version++;
    session.savedRevision = Math.max(session.savedRevision, revision);
    session.dirty.delete('state');
}
async function flushDirtySessions() {
    if (autosaveRunning || !databaseReady || sessions.size === 0)
        return;
    for (const session of sessions.values())
        refreshRuntimeState(session);
    const pending = Array.from(sessions.values()).filter((session) => session.revision > session.savedRevision);
    if (pending.length === 0)
        return;
    autosaveRunning = true;
    try {
        const concurrency = Math.max(1, Math.floor(Config.autosaveConcurrency));
        for (let index = 0; index < pending.length; index += concurrency) {
            const batch = pending.slice(index, index + concurrency);
            const results = await Promise.allSettled(batch.map((session) => saveSession(session)));
            for (const result of results) {
                if (result.status === 'rejected')
                    Logger.error('DATABASE', 'Autosave failed', { error: String(result.reason) });
            }
        }
    }
    finally {
        autosaveRunning = false;
    }
}
async function selectCharacter(source, identifier, character) {
    if (Config.features.characterLock) {
        const owner = activeCharacterOwners.get(character.id);
        if (owner && owner !== source && GetPlayerName(owner))
            throw new CoreError('CHARACTER_ALREADY_ACTIVE', 'Character is already active on another connection.', { characterId: character.id, owner });
    }
    const playerId = getStaticPlayerId(source) || await upsertPlayer(source, identifier);
    const existing = sessions.get(source);
    if (existing)
        await saveSession(existing, true);
    const [metadata, inventory, factionRow] = await Promise.all([
        loadMetadata(character.id),
        loadInventory(character.id),
        factionRepository.getMembership(character.id),
    ]);
    const session = {
        source,
        playerId,
        identifier,
        playerName: GetPlayerName(source) ?? `Player ${source}`,
        character,
        metadata,
        inventory,
        faction: toFactionMembership(factionRow),
        spawned: false,
        revision: 0,
        savedRevision: 0,
        dirty: new Set(),
    };
    sessions.set(source, session);
    activeCharacterOwners.set(character.id, source);
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
    Logger.info('PLAYER', 'Character selected', { source, playerId, stateId: character.stateId, citizenId: character.citizenId });
    void logAction('character', 'selected', source, source, { characterId: character.id, citizenId: character.citizenId });
}
async function loadPlayer(source) {
    if (sessions.has(source) || loadingPlayers.has(source))
        return;
    loadingPlayers.add(source);
    try {
        for (let attempt = 0; attempt < 30 && !databaseReady; attempt++) {
            if (!GetPlayerName(source))
                return;
            await delay(1000);
        }
        if (!databaseReady) {
            message(source, 'The database is unavailable.', 'error');
            return;
        }
        const identifier = getPrimaryIdentifier(source);
        if (!identifier) {
            message(source, 'Could not find a valid FiveM/license identifier.', 'error');
            return;
        }
        const playerId = await upsertPlayer(source, identifier);
        emit('rumble:server:playerConnected', source, { playerId, id: playerId, identifier, name: GetPlayerName(source) ?? `Player ${source}` });
        Logger.info('PLAYER', 'Player connected to framework', { source, playerId, name: GetPlayerName(source) ?? `Player ${source}`, identifier });
        const [characters, activeCharacterId] = await Promise.all([
            listCharacters(identifier),
            playerRepository.getActiveCharacterId(identifier),
        ]);
        emit('rumble:server:characterSelection', source);
        if (characters.length === 0) {
            emitNet('rumble:character:registrationRequired', source, { mode: 'create', firstName: '', lastName: '', minimumAge: Config.minimumCharacterAge });
            return;
        }
        const incomplete = characters.find((character) => !character.dateOfBirth);
        if (incomplete) {
            emitNet('rumble:character:registrationRequired', source, {
                mode: 'complete',
                characterId: incomplete.id,
                firstName: incomplete.firstName,
                lastName: incomplete.lastName,
                minimumAge: Config.minimumCharacterAge,
            });
            return;
        }
        if (!GetPlayerName(source))
            return;
        sendCharacterSelector(source, characters, activeCharacterId);
    }
    finally {
        loadingPlayers.delete(source);
    }
}
async function persistMetadata(session, key, value) {
    if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(key))
        return false;
    const serialized = JSON.stringify(value);
    if (serialized.length > Config.maxMetadataBytes)
        return false;
    const currentSerialized = Object.prototype.hasOwnProperty.call(session.metadata, key)
        ? JSON.stringify(session.metadata[key])
        : undefined;
    if (currentSerialized === serialized) {
        if (key === 'deathState')
            setPlayerState(session.source, 'rumbleDeathState', String(value));
        return true;
    }
    session.metadata[key] = value;
    markDirty(session, 'metadata');
    await metadataRepository.set(session.character.id, key, serialized);
    session.dirty.delete('metadata');
    if (key === 'deathState')
        setPlayerState(session.source, 'rumbleDeathState', String(value));
    emit('rumble:server:metadataChanged', session.source, key, value);
    return true;
}
async function setMetadata(source, key, value) {
    const session = sessions.get(source);
    if (!session)
        return false;
    return await persistMetadata(session, key, value);
}
async function removeMetadata(source, key) {
    const session = sessions.get(source);
    if (!session || !Object.prototype.hasOwnProperty.call(session.metadata, key))
        return false;
    delete session.metadata[key];
    await metadataRepository.remove(session.character.id, key);
    emit('rumble:server:metadataChanged', source, key, null);
    return true;
}
function inventoryWeight(session) {
    return session.inventory.reduce((total, item) => {
        const definition = ITEM_DEFINITIONS[item.name];
        return total + (definition?.weight ?? 0) * item.amount;
    }, 0);
}
function canCarryItem(source, itemName, amount) {
    const session = sessions.get(source);
    const definition = ITEM_DEFINITIONS[itemName];
    if (!session || !definition || !Number.isInteger(amount) || amount <= 0)
        return false;
    return inventoryWeight(session) + definition.weight * amount <= Config.inventoryMaxWeight;
}
function nextInventorySlot(session) {
    const used = new Set(session.inventory.map((item) => item.slot));
    for (let slot = 1; slot <= Config.inventoryMaxSlots; slot++)
        if (!used.has(slot))
            return slot;
    return null;
}
async function addItem(source, itemName, amount, metadata = {}, reason = 'unknown') {
    const session = sessions.get(source);
    const definition = ITEM_DEFINITIONS[itemName];
    const quantity = Math.floor(Number(amount));
    if (!session || !definition || !Security.validateItemAmount(quantity))
        return false;
    if (!canCarryItem(source, itemName, quantity))
        return false;
    const serialized = JSON.stringify(metadata ?? {});
    if (serialized.length > 8000)
        return false;
    let slotItem = definition.stackable
        ? session.inventory.find((item) => item.name === itemName && JSON.stringify(item.metadata) === serialized)
        : undefined;
    if (slotItem) {
        slotItem.amount += quantity;
        await inventoryRepository.updateAmount(session.character.id, slotItem.id, slotItem.amount);
    }
    else {
        const slot = nextInventorySlot(session);
        if (slot === null)
            return false;
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
async function removeItem(source, itemName, amount, reason = 'unknown') {
    const session = sessions.get(source);
    const quantity = Math.floor(Number(amount));
    if (!session || !ITEM_DEFINITIONS[itemName] || !Security.validateItemAmount(quantity))
        return false;
    const available = session.inventory.filter((item) => item.name === itemName).reduce((total, item) => total + item.amount, 0);
    if (available < quantity)
        return false;
    let remaining = quantity;
    for (const item of [...session.inventory].filter((entry) => entry.name === itemName).sort((a, b) => a.slot - b.slot)) {
        if (remaining <= 0)
            break;
        const take = Math.min(item.amount, remaining);
        item.amount -= take;
        remaining -= take;
        if (item.amount <= 0) {
            await inventoryRepository.remove(session.character.id, item.id);
            session.inventory = session.inventory.filter((entry) => entry.id !== item.id);
        }
        else {
            await inventoryRepository.updateAmount(session.character.id, item.id, item.amount);
        }
    }
    emitNet('rumble:inventory:update', source, publicInventory(session), inventoryWeight(session), Config.inventoryMaxWeight);
    emit('rumble:server:inventoryChanged', source, 'remove', itemName, quantity, reason);
    void logAction('inventory', 'remove', source, source, { itemName, amount: quantity, reason });
    return true;
}
function hasItem(source, itemName, amount = 1) {
    const session = sessions.get(source);
    if (!session || !ITEM_DEFINITIONS[itemName])
        return false;
    const quantity = Math.max(1, Math.floor(Number(amount)));
    return session.inventory.filter((item) => item.name === itemName).reduce((total, item) => total + item.amount, 0) >= quantity;
}
async function useItem(source, itemName) {
    const session = sessions.get(source);
    const definition = ITEM_DEFINITIONS[itemName];
    if (!session || !definition?.usable || !hasItem(source, itemName, 1))
        return false;
    if (String(session.metadata.deathState ?? 'alive') !== 'alive')
        return false;
    if (!allowRate(source, 'inventory:use', 8, 10000))
        return false;
    let applied = false;
    if (itemName === 'water')
        applied = await addNeed(source, 'thirst', 35, 'item:water');
    if (itemName === 'sandwich')
        applied = await addNeed(source, 'hunger', 35, 'item:sandwich');
    if (itemName === 'medkit')
        applied = await setVital(source, 'health', Math.min(MAX_HEALTH, session.character.health + 60), 'item:medkit');
    if (itemName === 'armor')
        applied = await setVital(source, 'armor', MAX_ARMOR, 'item:armor');
    if (!applied)
        return false;
    const removed = await removeItem(source, itemName, 1, `use:${itemName}`);
    if (!removed)
        return false;
    await saveSession(session, true);
    message(source, `You used ${definition.label}.`, 'success');
    return true;
}
function generatePlate() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '0123456789';
    let plate = '';
    for (let i = 0; i < 3; i++)
        plate += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < 3; i++)
        plate += digits[Math.floor(Math.random() * digits.length)];
    return plate;
}
function toOwnedVehicle(row) {
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
async function getOwnedVehicles(source) {
    const session = sessions.get(source);
    if (!session)
        return [];
    const rows = await vehicleRepository.list(session.character.id);
    return rows.map(toOwnedVehicle);
}
async function addOwnedVehicle(source, model, plateInput = '', properties = {}) {
    const session = sessions.get(source);
    const normalizedModel = String(model ?? '').trim().toLowerCase();
    if (!session || !/^[a-zA-Z0-9_-]{1,64}$/.test(normalizedModel))
        return null;
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
    if (!plate)
        return null;
    const duplicate = await vehicleRepository.findByPlate(plate);
    if (duplicate)
        return null;
    const serialized = JSON.stringify(properties ?? {});
    if (serialized.length > 16000)
        return null;
    const id = await vehicleRepository.insert(session.character.id, plate, normalizedModel, serialized);
    const row = await vehicleRepository.getById(id);
    if (!row)
        return null;
    void logAction('vehicle', 'owned_added', source, source, { model: normalizedModel, plate });
    return toOwnedVehicle(row);
}
async function updateOwnedVehicle(source, plateInput, changes) {
    const session = sessions.get(source);
    if (!session)
        return false;
    const plate = String(plateInput ?? '').trim().toUpperCase();
    const row = await vehicleRepository.findByPlate(plate, session.character.id);
    if (!row)
        return false;
    const garage = typeof changes?.garage === 'string' ? changes.garage.slice(0, 64) : String(row.garage);
    const stored = typeof changes?.stored === 'boolean' ? changes.stored : Number(row.stored) === 1;
    const fuel = Number.isFinite(Number(changes?.fuel)) ? Math.max(0, Math.min(100, Number(changes.fuel))) : Number(row.fuel);
    const engineHealth = Number.isFinite(Number(changes?.engineHealth)) ? Math.max(-4000, Math.min(1000, Number(changes.engineHealth))) : Number(row.engine_health);
    const bodyHealth = Number.isFinite(Number(changes?.bodyHealth)) ? Math.max(0, Math.min(1000, Number(changes.bodyHealth))) : Number(row.body_health);
    const properties = changes?.properties && typeof changes.properties === 'object' ? changes.properties : safeJsonParse(row.properties, {});
    const serialized = JSON.stringify(properties);
    if (serialized.length > 16000)
        return false;
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
async function removeOwnedVehicle(source, plateInput) {
    const session = sessions.get(source);
    if (!session)
        return false;
    const plate = String(plateInput ?? '').trim().toUpperCase();
    const changed = await vehicleRepository.remove(session.character.id, plate);
    if (changed > 0)
        void logAction('vehicle', 'owned_removed', source, source, { plate });
    return changed > 0;
}
function registerRpc(name, handler) {
    if (!/^[a-zA-Z0-9_.:-]{1,96}$/.test(name))
        throw new CoreError('RPC_NAME_INVALID', 'Invalid RPC name.', { name });
    if (rpcHandlers.has(name))
        throw new CoreError('RPC_DUPLICATE', 'RPC is already registered.', { name });
    rpcHandlers.set(name, handler);
}
function registerValidatedRpc(name, validator, handler) {
    registerRpc(name, handler);
    rpcValidators.set(name, validator);
}
function registerTypedRpc(name, handler) {
    registerRpc(name, handler);
}
function registerRumbleCommand(name, adminOnly, handler) {
    if (commandRegistry.has(name))
        throw new CoreError('COMMAND_DUPLICATE', 'Command is already registered.', { name });
    commandRegistry.set(name, { adminOnly });
    RegisterCommand(name, (source, args, rawCommand) => {
        if (adminOnly && !requireAdmin(source))
            return;
        if (!allowRate(source, `command:${name}`, adminOnly ? 20 : 12, 10000)) {
            if (source !== 0)
                message(source, 'Too many commands in a short period of time.', 'error');
            return;
        }
        void Promise.resolve(handler(source, args, rawCommand)).catch((error) => {
            Logger.error('ADMIN', `Command /${name} failed`, { source, error: String(error) });
            if (source !== 0)
                message(source, 'The command encountered an error.', 'error');
        });
        if (adminOnly)
            void logAction('admin', `command:${name}`, source, null, { args });
    }, false);
}
async function setMoney(source, account, amount, reason = 'unknown', actorIdentifier) {
    const session = sessions.get(source);
    if (!session || !Security.validateMoney(amount))
        return false;
    const previous = session.character[account];
    const finalAmount = Math.floor(amount);
    if (previous === finalAmount)
        return true;
    const column = account === 'cash' ? 'cash' : 'card';
    const delta = finalAmount - previous;
    const safeReason = sanitizeReason(reason);
    const actor = actorIdentifier ?? session.identifier;
    const committed = await dbTransaction([
        {
            query: `UPDATE rumble_characters SET ${column} = ? WHERE id = ? AND player_identifier = ?`,
            values: [finalAmount, session.character.id, session.identifier],
        },
        {
            query: `INSERT INTO rumble_money_transactions (character_id, account, amount, balance_after, reason, actor_identifier) VALUES (?, ?, ?, ?, ?, ?)`,
            values: [session.character.id, account, delta, finalAmount, safeReason, actor],
        },
    ]);
    if (!committed)
        return false;
    session.character[account] = finalAmount;
    markDirty(session, 'money');
    session.dirty.delete('money');
    setPlayerState(source, account === 'cash' ? 'rumbleCash' : 'rumbleCard', finalAmount);
    emitNet('rumble:money:update', source, account, finalAmount, reason);
    emit('rumble:server:moneyChanged', source, account, finalAmount, reason);
    void logAction('money', 'changed', source, source, { account, previous, current: finalAmount, reason });
    return true;
}
async function addMoney(source, account, amount, reason = 'unknown') {
    const session = sessions.get(source);
    if (!session || !Number.isFinite(amount) || amount <= 0)
        return false;
    return await setMoney(source, account, session.character[account] + Math.floor(amount), reason);
}
async function removeMoney(source, account, amount, reason = 'unknown') {
    const session = sessions.get(source);
    if (!session || !Number.isFinite(amount) || amount <= 0)
        return false;
    const wanted = Math.floor(amount);
    if (session.character[account] < wanted)
        return false;
    return await setMoney(source, account, session.character[account] - wanted, reason);
}
function clampNeed(value) {
    return Math.max(0, Math.min(100, Math.floor(value)));
}
async function setNeeds(source, hunger, thirst, reason = 'unknown') {
    const session = sessions.get(source);
    if (!session || !Number.isFinite(hunger) || !Number.isFinite(thirst))
        return false;
    const nextHunger = clampNeed(hunger);
    const nextThirst = clampNeed(thirst);
    if (nextHunger === session.character.hunger && nextThirst === session.character.thirst)
        return true;
    session.character.hunger = nextHunger;
    session.character.thirst = nextThirst;
    markDirty(session);
    setPlayerState(source, 'rumbleHunger', nextHunger);
    setPlayerState(source, 'rumbleThirst', nextThirst);
    emitNet('rumble:needs:update', source, nextHunger, nextThirst, reason);
    emit('rumble:server:needsChanged', source, nextHunger, nextThirst, reason);
    return true;
}
async function setNeed(source, need, amount, reason = 'unknown') {
    const session = sessions.get(source);
    if (!session || !Number.isFinite(amount))
        return false;
    const hunger = need === 'hunger' ? amount : session.character.hunger;
    const thirst = need === 'thirst' ? amount : session.character.thirst;
    return await setNeeds(source, hunger, thirst, reason);
}
async function addNeed(source, need, amount, reason = 'unknown') {
    const session = sessions.get(source);
    if (!session || !Number.isFinite(amount) || amount <= 0)
        return false;
    return await setNeed(source, need, session.character[need] + amount, reason);
}
async function removeNeed(source, need, amount, reason = 'unknown') {
    const session = sessions.get(source);
    if (!session || !Number.isFinite(amount) || amount <= 0)
        return false;
    return await setNeed(source, need, session.character[need] - amount, reason);
}
function clampVital(vital, value) {
    const maximum = vital === 'health' ? MAX_HEALTH : MAX_ARMOR;
    return Math.max(0, Math.min(maximum, Math.floor(value)));
}
async function setVital(source, vital, amount, reason = 'unknown') {
    const session = sessions.get(source);
    if (!session || !Number.isFinite(amount))
        return false;
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
function tickNeeds() {
    if (!databaseReady || sessions.size === 0)
        return;
    const hungerDecay = Config.hungerDecay;
    const thirstDecay = Config.thirstDecay;
    const hungerDamage = Config.starvationDamage;
    const thirstDamage = Config.dehydrationDamage;
    for (const [source, session] of sessions) {
        if (!GetPlayerName(source) || !session.spawned)
            continue;
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
        if (nextHunger <= 0)
            damage += hungerDamage;
        if (nextThirst <= 0)
            damage += thirstDamage;
        if (damage > 0)
            emitNet('rumble:needs:damage', source, damage);
    }
}
setInterval(() => {
    tickNeeds();
    void flushDirtySessions();
}, Config.maintenanceIntervalMs);
on('onResourceStart', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
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
on('onResourceStop', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    CoreEvents.clear();
    if (!databaseReady)
        return;
    for (const session of sessions.values()) {
        void saveSession(session, true).catch((error) => Logger.error('DATABASE', 'Final save failed', { source: session.source, error: String(error) }));
    }
});
onNet('rumble:player:requestLoad', () => {
    const source = Number(globalThis.source);
    if (!allowRate(source, 'player:requestLoad', 4, 10000))
        return;
    void loadPlayer(source).catch((error) => {
        Logger.error('PLAYER', 'Failed loading player', { source, error: String(error) });
        emitNet('rumble:player:loadError', source, 'Character loading failed. Check the server console.');
        message(source, 'Character loading failed. Check the server console.', 'error');
    });
});
onNet('rumble:character:createInitial', (payload) => {
    const source = Number(globalThis.source);
    if (source <= 0 || creatingCharacters.has(source))
        return;
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
        const identifier = getCachedIdentifier(source);
        if (!identifier) {
            emitNet('rumble:character:registrationError', source, 'Could not find a valid FiveM identifier.');
            return;
        }
        const firstName = String(payload?.firstName ?? '').trim();
        const lastName = String(payload?.lastName ?? '').trim();
        const dateOfBirth = String(payload?.dateOfBirth ?? '').trim();
        const mode = String(payload?.mode ?? 'create');
        if (!validateCharacterName(firstName)) {
            emitNet('rumble:character:registrationError', source, 'First name must contain between 2 and 24 letters.');
            return;
        }
        if (!validateCharacterName(lastName)) {
            emitNet('rumble:character:registrationError', source, 'Last name must contain between 2 and 24 letters.');
            return;
        }
        if (!validateDateOfBirth(dateOfBirth)) {
            emitNet('rumble:character:registrationError', source, 'Date of birth is invalid.');
            return;
        }
        if (!isAtLeastAge(dateOfBirth, Config.minimumCharacterAge)) {
            emitNet('rumble:character:registrationError', source, `You must be at least ${Config.minimumCharacterAge} years old.`);
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
            Logger.info('CHARACTER', 'Character identity updated', { source, characterId, dateOfBirth });
            await showCharacterSelector(source, identifier);
            void logAction('character', 'identity_completed', source, source, { characterId, dateOfBirth });
            return;
        }
        const character = await createCharacter(identifier, firstName, lastName, dateOfBirth);
        Logger.info('CHARACTER', 'Character created', { source, characterId: character.id, citizenId: character.citizenId, dateOfBirth: character.dateOfBirth });
        void logAction('character', 'created', source, source, { characterId: character.id, citizenId: character.citizenId, dateOfBirth: character.dateOfBirth });
        if (!GetPlayerName(source))
            return;
        await showCharacterSelector(source, identifier);
    })().catch((error) => {
        Logger.error('CHARACTER', 'Character creation failed', { source, error: String(error) });
        emitNet('rumble:character:registrationError', source, error instanceof Error ? error.message : 'Could not create the character.');
    }).finally(() => {
        creatingCharacters.delete(source);
    });
});
onNet('rumble:character:select', (characterId) => {
    const source = Number(globalThis.source);
    if (source <= 0 || !allowRate(source, 'character:select', 5, 5000))
        return;
    void (async () => {
        const identifier = getCachedIdentifier(source);
        if (!identifier)
            return;
        const id = Number(characterId);
        if (!Number.isInteger(id) || id <= 0)
            return;
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
                minimumAge: Config.minimumCharacterAge,
            });
            return;
        }
        await selectCharacter(source, identifier, character);
    })().catch((error) => {
        Logger.error('CHARACTER', 'Character selection failed', { source, error: String(error) });
        emitNet('rumble:character:selectorError', source, 'Could not select the character.');
    });
});
onNet('rumble:player:spawned', (spawnId) => {
    const source = Number(globalThis.source);
    const session = sessions.get(source);
    if (!session || !allowRate(source, 'player:spawned', 3, 5000))
        return;
    const safeSpawnId = String(spawnId ?? '');
    if (!Object.prototype.hasOwnProperty.call(SPAWNS, safeSpawnId)) {
        rejectSecurity(source, 'invalid_spawn_id', { spawnId: safeSpawnId });
        return;
    }
    session.spawned = true;
    const ped = GetPlayerPed(source);
    if (ped) {
        const [x, y, z] = GetEntityCoords(ped);
        const heading = Number(globalThis.GetEntityHeading?.(ped) ?? session.character.position.heading);
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
    const source = Number(globalThis.source);
    const session = sessions.get(source);
    if (!session || !session.spawned || !allowRate(source, 'player:state', 4, 5000))
        return;
    const ped = GetPlayerPed(source);
    if (!ped)
        return;
    const coords = GetEntityCoords(ped);
    const heading = Number(globalThis.GetEntityHeading?.(ped) ?? session.character.position.heading);
    const health = Number(globalThis.GetEntityHealth?.(ped) ?? session.character.health);
    const armor = Number(globalThis.GetPedArmour?.(ped) ?? session.character.armor);
    const values = [coords[0], coords[1], coords[2], heading, health, armor];
    if (values.some((value) => !Number.isFinite(value)))
        return;
    const nextPosition = {
        x: values[0],
        y: values[1],
        z: values[2],
        heading: values[3],
    };
    const nextHealth = Math.max(0, Math.min(MAX_HEALTH, Math.floor(values[4])));
    const nextArmor = Math.max(0, Math.min(MAX_ARMOR, Math.floor(values[5])));
    const previous = session.character.position;
    const moved = Math.hypot(nextPosition.x - previous.x, nextPosition.y - previous.y, nextPosition.z - previous.z) >= Config.stateSyncMinimumDistance;
    const headingDelta = Math.abs(((nextPosition.heading - previous.heading + 540) % 360) - 180);
    const rotated = headingDelta >= Config.stateSyncMinimumHeading;
    const vitalsChanged = nextHealth !== session.character.health || nextArmor !== session.character.armor;
    if (!moved && !rotated && !vitalsChanged)
        return;
    session.character.position = nextPosition;
    session.character.health = nextHealth;
    session.character.armor = nextArmor;
    markDirty(session);
});
onNet('rumble:death:update', (stateInput) => {
    const source = Number(globalThis.source);
    const session = sessions.get(source);
    if (!session || !allowRate(source, 'death:update', 4, 10000))
        return;
    const state = String(stateInput);
    if (!['alive', 'downed'].includes(state)) {
        rejectSecurity(source, 'invalid_death_state', { state });
        return;
    }
    const ped = GetPlayerPed(source);
    const health = ped ? Number(globalThis.GetEntityHealth?.(ped) ?? 0) : 0;
    if (state === 'alive') {
        if (health <= 0) {
            setTimeout(() => {
                const current = sessions.get(source);
                if (!current || !GetPlayerName(source))
                    return;
                const currentPed = GetPlayerPed(source);
                const verifiedHealth = currentPed ? Number(globalThis.GetEntityHealth?.(currentPed) ?? 0) : 0;
                if (!Number.isFinite(verifiedHealth) || verifiedHealth <= 0)
                    return;
                current.character.health = Math.max(1, Math.min(MAX_HEALTH, Math.floor(verifiedHealth)));
                markDirty(current);
                void persistMetadata(current, 'deathState', 'alive');
                emitNet('rumble:death:state', source, 'alive');
            }, 500);
            return;
        }
        session.character.health = Math.max(1, Math.min(MAX_HEALTH, Math.floor(health)));
        markDirty(session);
        void persistMetadata(session, 'deathState', 'alive');
        emitNet('rumble:death:state', source, 'alive');
        return;
    }
    if (health > 0) {
        rejectSecurity(source, 'invalid_downed_state', { health });
        return;
    }
    if (String(session.metadata.deathState ?? 'alive') !== 'alive')
        return;
    void persistMetadata(session, 'deathState', 'downed');
    emitNet('rumble:death:state', source, 'downed');
    void logAction('player', 'downed', source, source, {});
    setTimeout(() => {
        const current = sessions.get(source);
        if (!current || String(current.metadata.deathState ?? 'alive') !== 'downed')
            return;
        void persistMetadata(current, 'deathState', 'dead');
        emitNet('rumble:death:state', source, 'dead');
        void logAction('player', 'dead', source, source, {});
    }, Config.deathDeadAfterMs);
});
onNet('rumble:rpc:request', (requestId, name, payload) => {
    const source = Number(globalThis.source);
    const id = String(requestId ?? '').slice(0, 96);
    const rpcName = String(name ?? '').slice(0, 96);
    if (!id || !rpcName || !allowRate(source, 'rpc', 30, 10000))
        return;
    if (!/^[a-zA-Z0-9_.:-]{1,96}$/.test(rpcName) || !Security.validatePayload(payload)) {
        rejectSecurity(source, 'invalid_rpc_request', { rpcName, bytes: serializedSize(payload) });
        emitNet('rumble:rpc:response', source, id, false, null, 'Invalid request.');
        return;
    }
    const handler = rpcHandlers.get(rpcName);
    if (!handler) {
        rejectSecurity(source, 'unknown_rpc', { rpcName });
        emitNet('rumble:rpc:response', source, id, false, null, 'Unknown RPC.');
        return;
    }
    const validator = rpcValidators.get(rpcName);
    if (validator) {
        let valid = false;
        try {
            valid = Boolean(validator(payload));
        }
        catch { }
        if (!valid) {
            rejectSecurity(source, 'rpc_schema_rejected', { rpcName });
            emitNet('rumble:rpc:response', source, id, false, null, 'RPC_SCHEMA_REJECTED');
            return;
        }
    }
    const idempotencyKey = `${source}:${id}`;
    if (Config.features.idempotentRpc) {
        const cached = RpcIdempotency.get(idempotencyKey);
        if (cached) {
            emitNet('rumble:rpc:response', source, id, cached.success, cached.result, cached.error);
            return;
        }
    }
    void Promise.resolve(handler(source, payload)).then((result) => {
        if (Config.features.idempotentRpc)
            RpcIdempotency.set(idempotencyKey, true, result ?? null, null);
        emit('rumble:telemetry:rpc', { source, rpcName, failed: false });
        emitNet('rumble:rpc:response', source, id, true, result ?? null, null);
    }).catch((error) => {
        const errorCode = error instanceof CoreError ? error.code : 'RPC_FAILED';
        if (Config.features.idempotentRpc)
            RpcIdempotency.set(idempotencyKey, false, null, errorCode);
        emit('rumble:telemetry:rpc', { source, rpcName, failed: true, errorCode });
        Logger.error('RPC', 'Callback failed', { source, rpcName, error: String(error), errorCode });
        emitNet('rumble:rpc:response', source, id, false, null, errorCode);
    });
});
on('playerDropped', () => {
    const source = Number(globalThis.source);
    const session = sessions.get(source);
    if (session) {
        activeCharacterOwners.delete(session.character.id);
        refreshRuntimeState(session);
        void saveSession(session, true).catch((error) => Logger.error('DATABASE', 'Could not save dropped player', { source, error: String(error) }));
        void logAction('player', 'disconnected', source, source, { characterId: session.character.id });
        emit('rumble:server:playerUnloaded', source, publicPlayer(session));
    }
    sessions.delete(source);
    loadingPlayers.delete(source);
    creatingCharacters.delete(source);
    Security.clearSource(source);
    RpcIdempotency.clearSource(source);
    frozenPlayers.delete(source);
    clearStaticPlayerMapping(source);
});
registerTypedRpc('rumble:getPlayer', (source) => {
    const session = sessions.get(source);
    return session ? publicPlayer(session) : null;
});
registerTypedRpc('rumble:getInventory', (source) => {
    const session = sessions.get(source);
    if (!session)
        return null;
    return { items: publicInventory(session), weight: inventoryWeight(session), maxWeight: Config.inventoryMaxWeight, maxSlots: Config.inventoryMaxSlots };
});
registerTypedRpc('rumble:getMetadata', (source) => {
    const session = sessions.get(source);
    return session ? publicMetadata(session) : null;
});
registerTypedRpc('rumble:getFaction', (source) => {
    const session = sessions.get(source);
    return session?.faction ? { ...session.faction } : null;
});
registerTypedRpc('rumble:getVehicles', async (source) => await getOwnedVehicles(source));
registerTypedRpc('rumble:getConfig', () => ({
    maxCharacters: Config.maxCharacters,
    inventoryMaxWeight: Config.inventoryMaxWeight,
    inventoryMaxSlots: Config.inventoryMaxSlots,
    itemDefinitions: ITEM_DEFINITIONS,
}));
registerRumbleCommand('inv', false, async (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    if (session.inventory.length === 0)
        return message(source, 'Inventory is empty.', 'info');
    message(source, `Inventory ${inventoryWeight(session)}/${Config.inventoryMaxWeight}g:`, 'info');
    for (const item of session.inventory) {
        const definition = ITEM_DEFINITIONS[item.name];
        message(source, `slot ${item.slot} | ${definition?.label ?? item.name} x${item.amount}`, 'info');
    }
});
registerRumbleCommand('use', false, async (source, args) => {
    if (source === 0)
        return;
    const itemName = String(args[0] ?? '').trim().toLowerCase();
    if (!itemName)
        return message(source, 'Usage: /use [item].', 'error');
    const ok = await useItem(source, itemName);
    if (!ok)
        message(source, 'The item does not exist, you do not have it, or it cannot be used.', 'error');
});
registerRumbleCommand('giveitem', true, async (source, args) => {
    const target = resolveStaticTarget(args[0]);
    const itemName = String(args[1] ?? '').trim().toLowerCase();
    const amount = Math.floor(Number(args[2] ?? 1));
    if (!target || !ITEM_DEFINITIONS[itemName] || !Security.validateItemAmount(amount)) {
        if (source !== 0)
            message(source, 'Usage: /giveitem [permanent-id] [water|sandwich|medkit|armor] [amount].', 'error');
        return;
    }
    const ok = await addItem(target.source, itemName, amount, {}, `admin:${source}`);
    if (source !== 0)
        message(source, ok ? `Item added for ID ${target.playerId}.` : 'Could not add the item.', ok ? 'success' : 'error');
});
registerRumbleCommand('vehicles', false, async (source) => {
    if (source === 0)
        return;
    const vehicles = await getOwnedVehicles(source);
    if (vehicles.length === 0)
        return message(source, 'You do not have any owned vehicles.', 'info');
    for (const vehicle of vehicles)
        message(source, `${vehicle.plate} | ${vehicle.model} | ${vehicle.garage} | ${vehicle.stored ? 'stored' : 'outside'}`, 'info');
});
registerRumbleCommand('addvehicle', true, async (source, args) => {
    const target = resolveStaticTarget(args[0]);
    const model = String(args[1] ?? '').trim();
    const plate = String(args[2] ?? '').trim();
    if (!target || !model) {
        if (source !== 0)
            message(source, 'Usage: /addvehicle [permanent-id] [model] [optional-plate].', 'error');
        return;
    }
    const vehicle = await addOwnedVehicle(target.source, model, plate);
    if (source !== 0)
        message(source, vehicle ? `Vehicle added for ID ${target.playerId}: ${vehicle.model} ${vehicle.plate}.` : 'Could not add the vehicle.', vehicle ? 'success' : 'error');
});
registerRumbleCommand('setfaction', true, async (source, args) => {
    const target = resolveStaticTarget(args[0]);
    const factionName = normalizeFactionName(args[1]);
    const grade = Math.floor(Number(args[2] ?? 0));
    if (!target || !factionName || !Number.isInteger(grade) || grade < 0 || grade > 255) {
        if (source !== 0)
            message(source, 'Usage: /setfaction [permanent-id] [police|medics|none] [grade].', 'error');
        return;
    }
    const targetSession = sessions.get(target.source);
    if (!targetSession) {
        if (source !== 0)
            message(source, 'The player must be online with a loaded character.', 'error');
        return;
    }
    try {
        const faction = await updateSessionFaction(targetSession, factionName, grade);
        const label = faction ? `${faction.label} - ${faction.gradeLabel} (${faction.grade})` : 'No faction';
        if (source !== 0)
            message(source, `Faction updated for ID ${target.playerId}: ${label}.`, 'success');
        message(target.source, `Your faction has been updated: ${label}.`, 'success');
        void logAction('faction', 'assigned', source, target.source, { faction: faction?.name ?? null, grade: faction?.grade ?? 0 });
    }
    catch (error) {
        const text = error instanceof CoreError && error.code === 'FACTION_GRADE_NOT_FOUND'
            ? 'That grade does not exist for the selected faction.'
            : error instanceof CoreError && error.code === 'FACTION_NOT_FOUND'
                ? 'That faction does not exist. Use police, medics, or none.'
                : 'Could not update the faction.';
        if (source !== 0)
            message(source, text, 'error');
    }
});
registerRumbleCommand('respawn', false, async (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    const deathState = String(session.metadata.deathState ?? 'alive');
    if (deathState !== 'dead')
        return message(source, 'You can use /respawn only after your state becomes dead.', 'error');
    await persistMetadata(session, 'deathState', 'respawning');
    emitNet('rumble:death:respawn', source, SPAWNS.hospital.position);
});
registerRumbleCommand('characters', false, async (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    const identifier = session?.identifier ?? getPrimaryIdentifier(source);
    if (!identifier)
        return;
    if (session)
        await saveSession(session, true);
    await showCharacterSelector(source, identifier);
});
RegisterCommand('id', (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    message(source, `Permanent ID: ${session.playerId} | State ID: ${session.character.stateId}`, 'info');
}, false);
RegisterCommand('money', (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    message(source, `Cash: $${session.character.cash.toLocaleString()} | Card: $${session.character.card.toLocaleString()}`, 'info');
}, false);
RegisterCommand('cash', (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    message(source, `Cash: $${session.character.cash.toLocaleString()}`, 'info');
}, false);
RegisterCommand('card', (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    message(source, `Card: $${session.character.card.toLocaleString()}`, 'info');
}, false);
RegisterCommand('stats', (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    message(source, `Hunger: ${session.character.hunger}% | Thirst: ${session.character.thirst}% | Health: ${session.character.health} | Armor: ${session.character.armor}%`, 'info');
}, false);
RegisterCommand('fullstats', (source) => {
    if (source === 0 || !requireAdmin(source))
        return;
    void logAction('admin', 'command:fullstats', source, source, {});
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    void (async () => {
        session.character.health = MAX_HEALTH;
        session.character.armor = MAX_ARMOR;
        markDirty(session);
        await setNeeds(source, 100, 100, `fullstats:${source}`);
        await persistMetadata(session, 'deathState', 'alive');
        await saveSession(session, true);
        emitNet('rumble:admin:fullStats', source);
        message(source, 'Hunger, thirst, health, and armor were fully restored.', 'success');
    })().catch((error) => {
        console.error(error);
        message(source, 'Could not restore all stats.', 'error');
    });
}, false);
RegisterCommand('hunger', (source) => {
    if (source === 0 || !requireAdmin(source))
        return;
    void logAction('admin', 'command:hunger', source, source, {});
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    void (async () => {
        await setNeed(source, 'hunger', 100, `hunger:${source}`);
        await saveSession(session, true);
        message(source, 'Hunger was set to 100%.', 'success');
    })().catch((error) => {
        console.error(error);
        message(source, 'Could not set hunger to maximum.', 'error');
    });
}, false);
RegisterCommand('water', (source) => {
    if (source === 0 || !requireAdmin(source))
        return;
    void logAction('admin', 'command:water', source, source, {});
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    void (async () => {
        await setNeed(source, 'thirst', 100, `water:${source}`);
        await saveSession(session, true);
        message(source, 'Thirst was set to 100%.', 'success');
    })().catch((error) => {
        console.error(error);
        message(source, 'Could not set thirst to maximum.', 'error');
    });
}, false);
RegisterCommand('health', (source) => {
    if (source === 0 || !requireAdmin(source))
        return;
    void logAction('admin', 'command:health', source, source, {});
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    void (async () => {
        await setVital(source, 'health', MAX_HEALTH, `health:${source}`);
        await saveSession(session, true);
        message(source, 'Health was set to maximum.', 'success');
    })().catch((error) => {
        console.error(error);
        message(source, 'Could not set health to maximum.', 'error');
    });
}, false);
RegisterCommand('armor', (source) => {
    if (source === 0 || !requireAdmin(source))
        return;
    void logAction('admin', 'command:armor', source, source, {});
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    void (async () => {
        await setVital(source, 'armor', MAX_ARMOR, `armor:${source}`);
        await saveSession(session, true);
        message(source, 'Armor was set to 100%.', 'success');
    })().catch((error) => {
        console.error(error);
        message(source, 'Could not set armor to maximum.', 'error');
    });
}, false);
RegisterCommand('chars', (source) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    void listCharacters(session.identifier).then((characters) => {
        message(source, `Characters (${characters.length}):`, 'info');
        for (const character of characters) {
            const active = character.id === session.character.id ? ' ^2[ACTIV]^7' : '';
            message(source, `State ID ${character.stateId} | slot ${character.slot} | ${character.firstName} ${character.lastName}${active}`, 'info');
        }
    }).catch((error) => console.error(error));
}, false);
RegisterCommand('newchar', (source, args) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    const firstName = String(args[0] ?? '').trim();
    const lastName = String(args[1] ?? '').trim();
    const dateOfBirth = String(args[2] ?? '').trim();
    if (!validateCharacterName(firstName) || !validateCharacterName(lastName) || !validateDateOfBirth(dateOfBirth)) {
        return message(source, 'Usage: /newchar FirstName LastName YYYY-MM-DD.', 'error');
    }
    if (!isAtLeastAge(dateOfBirth, Config.minimumCharacterAge)) {
        return message(source, `You must be at least ${Config.minimumCharacterAge} years old.`, 'error');
    }
    void (async () => {
        await saveSession(session, true);
        const character = await createCharacter(session.identifier, firstName, lastName, dateOfBirth);
        await selectCharacter(source, session.identifier, character);
        message(source, `Character created: ${firstName} ${lastName}.`, 'success');
    })().catch((error) => message(source, error instanceof Error ? error.message : 'Could not create the character.', 'error'));
}, false);
RegisterCommand('switchchar', (source, args) => {
    if (source === 0)
        return;
    const session = sessions.get(source);
    if (!session)
        return message(source, 'Your player data is not loaded yet.', 'error');
    const id = Number(args[0]);
    if (!Number.isInteger(id) || id <= 0) {
        return message(source, 'Usage: /switchchar StateID. See /chars.', 'error');
    }
    void (async () => {
        const row = await characterRepository.getById(session.identifier, id);
        if (!row)
            return message(source, 'The character does not belong to you or does not exist.', 'error');
        await saveSession(session, true);
        await selectCharacter(source, session.identifier, toCharacter(row));
        message(source, `Switched to the character with State ID ${id}.`, 'success');
    })().catch((error) => {
        console.error(error);
        message(source, 'Could not switch character.', 'error');
    });
}, false);
RegisterCommand('setmoney', (source, args) => {
    if (!requireAdmin(source))
        return;
    void logAction('admin', 'command:setmoney', source, null, { args });
    const target = resolveStaticTarget(args[0]);
    const account = args[1];
    const amount = Number(args[2]);
    if (!target || (account !== 'cash' && account !== 'card') || !Security.validateMoney(amount)) {
        if (source !== 0)
            message(source, 'Usage: /setmoney [permanent-id] [cash|card] [amount]', 'error');
        return;
    }
    void setMoney(target.source, account, amount, `admin:${source}`, source === 0 ? 'console' : getPrimaryIdentifier(source) ?? `source:${source}`).then((ok) => {
        if (source !== 0)
            message(source, ok ? `Money was updated for ID ${target.playerId}.` : 'The player is not loaded.', ok ? 'success' : 'error');
    });
}, false);
RegisterCommand('ara', (source) => {
    if (source === 0 || !requireAdmin(source))
        return;
    void logAction('admin', 'command:ara', source, null, {});
    const callerPed = GetPlayerPed(source);
    if (!callerPed)
        return message(source, 'Your ped is not available.', 'error');
    const [cx, cy, cz] = GetEntityCoords(callerPed);
    let revived = 0;
    for (const targetString of getPlayers()) {
        const target = Number(targetString);
        const targetPed = GetPlayerPed(target);
        if (!targetPed)
            continue;
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
    message(source, `Revive sent to ${revived} player(s) within 10m, including yourself.`, 'success');
}, false);
RegisterCommand('fly', (source) => {
    if (source === 0 || !requireAdmin(source))
        return;
    void logAction('admin', 'command:fly', source, source, {});
    emitNet('rumble:admin:toggleFly', source);
}, false);
RegisterCommand('gotow', (source) => {
    if (source === 0 || !requireAdmin(source))
        return;
    void logAction('admin', 'command:gotow', source, source, {});
    emitNet('rumble:admin:gotoWaypoint', source);
}, false);
function getServerPosition(source) {
    if (!validPlayerSource(source))
        return null;
    const ped = GetPlayerPed(source);
    if (!ped)
        return null;
    const [x, y, z] = GetEntityCoords(ped);
    const heading = Number(GetEntityHeading(ped));
    if (![x, y, z, heading].every(Number.isFinite))
        return null;
    return { x, y, z, heading };
}
function validTeleportPosition(position) {
    return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z) && Number.isFinite(position.heading)
        && Math.abs(position.x) <= 10000 && Math.abs(position.y) <= 10000 && position.z >= -1000 && position.z <= 10000;
}
registerRumbleCommand('tp', true, async (source, args) => {
    if (source === 0)
        return;
    const position = {
        x: Number(args[0]),
        y: Number(args[1]),
        z: Number(args[2]),
        heading: args[3] === undefined ? Number(GetEntityHeading(GetPlayerPed(source))) : Number(args[3]),
    };
    if (!validTeleportPosition(position))
        return message(source, 'Usage: /tp [x] [y] [z] [optional-heading].', 'error');
    emitNet('rumble:admin:teleport', source, position);
    message(source, `Teleport: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}.`, 'success');
});
registerRumbleCommand('bring', true, async (source, args) => {
    if (source === 0)
        return;
    const target = resolveStaticTarget(args[0]);
    if (!target)
        return message(source, 'Usage: /bring [permanent-id].', 'error');
    const position = getServerPosition(source);
    if (!position)
        return message(source, 'Your position is unavailable.', 'error');
    emitNet('rumble:admin:teleport', target.source, position);
    message(source, `Player ID ${target.playerId} was brought to you.`, 'success');
});
registerRumbleCommand('goto', true, async (source, args) => {
    if (source === 0)
        return;
    const target = resolveStaticTarget(args[0]);
    if (!target)
        return message(source, 'Usage: /goto [permanent-id].', 'error');
    const position = getServerPosition(target.source);
    if (!position)
        return message(source, "The player's position is unavailable.", 'error');
    emitNet('rumble:admin:teleport', source, position);
    message(source, `You were teleported to player ID ${target.playerId}.`, 'success');
});
registerRumbleCommand('coords', true, async (source) => {
    if (source === 0)
        return;
    const position = getServerPosition(source);
    if (!position)
        return message(source, 'Position is unavailable.', 'error');
    message(source, `x=${position.x.toFixed(4)} y=${position.y.toFixed(4)} z=${position.z.toFixed(4)}`, 'info');
});
registerRumbleCommand('heading', true, async (source) => {
    if (source === 0)
        return;
    const position = getServerPosition(source);
    if (!position)
        return message(source, 'Heading is unavailable.', 'error');
    message(source, `heading=${position.heading.toFixed(3)}`, 'info');
});
registerRumbleCommand('pos', true, async (source) => {
    if (source === 0)
        return;
    const position = getServerPosition(source);
    if (!position)
        return message(source, 'Position is unavailable.', 'error');
    message(source, `vector4(${position.x.toFixed(4)}, ${position.y.toFixed(4)}, ${position.z.toFixed(4)}, ${position.heading.toFixed(3)})`, 'info');
});
registerRumbleCommand('vehicle', true, async (source, args) => {
    if (source === 0)
        return;
    const model = String(args[0] ?? '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,64}$/.test(model))
        return message(source, 'Usage: /vehicle [model].', 'error');
    emitNet('rumble:admin:spawnVehicle', source, model);
});
registerRumbleCommand('dv', true, async (source, args) => {
    if (source === 0)
        return;
    const radius = args[0] === undefined ? 5 : Number(args[0]);
    if (!Number.isFinite(radius) || radius < 1 || radius > 100)
        return message(source, 'Usage: /dv [radius 1-100].', 'error');
    emitNet('rumble:admin:deleteVehicle', source, radius);
});
registerRumbleCommand('freeze', true, async (source, args) => {
    const target = resolveStaticTarget(args[0]);
    if (!target) {
        if (source !== 0)
            message(source, 'Usage: /freeze [permanent-id].', 'error');
        return;
    }
    const enabled = !frozenPlayers.has(target.source);
    if (enabled)
        frozenPlayers.add(target.source);
    else
        frozenPlayers.delete(target.source);
    emitNet('rumble:admin:freeze', target.source, enabled);
    if (source !== 0)
        message(source, `Freeze ${enabled ? 'ON' : 'OFF'} for ID ${target.playerId}.`, 'success');
});
registerRumbleCommand('heal', true, async (source, args) => {
    const target = resolveStaticTarget(args[0], source);
    if (!target) {
        if (source !== 0)
            message(source, 'Usage: /heal [optional-permanent-id].', 'error');
        return;
    }
    const session = sessions.get(target.source);
    if (!session)
        return source !== 0 ? message(source, 'The player is not loaded.', 'error') : undefined;
    if (String(session.metadata.deathState ?? 'alive') !== 'alive')
        return source !== 0 ? message(source, 'The player is dead. Use /revive.', 'error') : undefined;
    await setVital(target.source, 'health', MAX_HEALTH, `admin:heal:${source}`);
    await saveSession(session, true);
    if (source !== 0)
        message(source, `Heal applied to ID ${target.playerId}.`, 'success');
});
registerRumbleCommand('revive', true, async (source, args) => {
    const target = resolveStaticTarget(args[0], source);
    if (!target) {
        if (source !== 0)
            message(source, 'Usage: /revive [optional-permanent-id].', 'error');
        return;
    }
    const session = sessions.get(target.source);
    if (!session)
        return source !== 0 ? message(source, 'The player is not loaded.', 'error') : undefined;
    session.character.health = MAX_HEALTH;
    session.character.armor = 0;
    markDirty(session);
    await persistMetadata(session, 'deathState', 'alive');
    await saveSession(session, true);
    emitNet('rumble:admin:revive', target.source);
    if (source !== 0)
        message(source, `Revive applied to ID ${target.playerId}.`, 'success');
});
registerRumbleCommand('spectate', true, async (source, args) => {
    if (source === 0)
        return;
    const value = String(args[0] ?? '').trim().toLowerCase();
    if (!value || value === 'off' || value === '0') {
        emitNet('rumble:admin:spectate', source, 0);
        return;
    }
    const target = resolveStaticTarget(value);
    if (!target || target.source === source)
        return message(source, 'Usage: /spectate [permanent-id] or /spectate off.', 'error');
    emitNet('rumble:admin:spectate', source, target.source);
});
registerRumbleCommand('entity', true, async (source) => {
    if (source === 0)
        return;
    emitNet('rumble:admin:inspectEntity', source);
});
registerRumbleCommand('vehinfo', true, async (source) => {
    if (source === 0)
        return;
    emitNet('rumble:admin:vehicleInfo', source);
});
registerRumbleCommand('healthcheck', true, async (source) => {
    const result = await performHealthCheck();
    if (source === 0)
        return;
    message(source, `Health: ${result.ok ? 'OK' : 'FAIL'} | DB ${result.database ? 'OK' : 'FAIL'} | oxmysql ${result.oxmysql} | OneSync ${result.onesyncReady ? 'OK' : 'OFF'} | migration ${result.migration}/${result.expectedMigration} | admin ${result.adminConfigured ? 'OK' : 'MISSING'}`, result.ok ? 'success' : 'error');
});
exports('GetPlayerId', (source) => getStaticPlayerId(Number(source)) || null);
exports('GetStateId', (source) => sessions.get(Number(source))?.character.stateId ?? null);
exports('GetPlayer', (source) => {
    const session = sessions.get(Number(source));
    return session ? publicPlayer(session) : null;
});
exports('GetCharacter', (source) => {
    const session = sessions.get(Number(source));
    return session ? { ...session.character, position: { ...session.character.position } } : null;
});
exports('GetMoney', (source, account) => {
    const session = sessions.get(Number(source));
    if (!session || (account !== 'cash' && account !== 'card'))
        return null;
    return session.character[account];
});
exports('SetMoney', async (source, account, amount, reason) => {
    if (account !== 'cash' && account !== 'card')
        return false;
    return await setMoney(Number(source), account, Number(amount), reason ?? 'export');
});
exports('AddMoney', async (source, account, amount, reason) => {
    if (account !== 'cash' && account !== 'card')
        return false;
    return await addMoney(Number(source), account, Number(amount), reason ?? 'export');
});
exports('RemoveMoney', async (source, account, amount, reason) => {
    if (account !== 'cash' && account !== 'card')
        return false;
    return await removeMoney(Number(source), account, Number(amount), reason ?? 'export');
});
exports('GetNeeds', (source) => {
    const session = sessions.get(Number(source));
    if (!session)
        return null;
    return { hunger: session.character.hunger, thirst: session.character.thirst };
});
exports('GetVitals', (source) => {
    const session = sessions.get(Number(source));
    if (!session)
        return null;
    return { health: session.character.health, armor: session.character.armor };
});
exports('SetHealth', async (source, amount, reason) => {
    return await setVital(Number(source), 'health', Number(amount), reason ?? 'export');
});
exports('SetArmor', async (source, amount, reason) => {
    return await setVital(Number(source), 'armor', Number(amount), reason ?? 'export');
});
exports('SetNeed', async (source, need, amount, reason) => {
    if (need !== 'hunger' && need !== 'thirst')
        return false;
    return await setNeed(Number(source), need, Number(amount), reason ?? 'export');
});
exports('AddNeed', async (source, need, amount, reason) => {
    if (need !== 'hunger' && need !== 'thirst')
        return false;
    return await addNeed(Number(source), need, Number(amount), reason ?? 'export');
});
exports('RemoveNeed', async (source, need, amount, reason) => {
    if (need !== 'hunger' && need !== 'thirst')
        return false;
    return await removeNeed(Number(source), need, Number(amount), reason ?? 'export');
});
exports('GetPlayerById', (playerId) => {
    const source = getSourceByStaticPlayerId(Number(playerId));
    if (source === null)
        return null;
    const session = sessions.get(source);
    return session ? publicPlayer(session) : null;
});
exports('GetSourceByPlayerId', (playerId) => getSourceByStaticPlayerId(Number(playerId)) ?? 0);
exports('GetPlayerByCitizenId', (citizenId) => {
    const wanted = String(citizenId ?? '').trim();
    for (const session of sessions.values())
        if (session.character.citizenId === wanted)
            return publicPlayer(session);
    return null;
});
exports('SavePlayer', async (source) => {
    const session = sessions.get(Number(source));
    if (!session)
        return false;
    await saveSession(session, true);
    return true;
});
exports('KickPlayer', (source, reason) => {
    const target = Number(source);
    if (!GetPlayerName(target))
        return false;
    const drop = globalThis.DropPlayer;
    if (typeof drop !== 'function')
        return false;
    drop(target, String(reason ?? 'You were disconnected by Rumble.'));
    return true;
});
exports('IsAdmin', (source) => isAdmin(Number(source)));
exports('GetFaction', (source) => {
    const session = sessions.get(Number(source));
    return session?.faction ? { ...session.faction } : null;
});
exports('SetFaction', async (source, factionInput, grade = 0) => {
    const session = sessions.get(Number(source));
    if (!session)
        return false;
    const factionName = normalizeFactionName(factionInput);
    if (!factionName)
        return false;
    try {
        await updateSessionFaction(session, factionName, Math.floor(Number(grade)));
        return true;
    }
    catch {
        return false;
    }
});
exports('GetMetadata', (source, key) => {
    const session = sessions.get(Number(source));
    if (!session)
        return null;
    if (key === undefined)
        return publicMetadata(session);
    return session.metadata[String(key)] ?? null;
});
exports('SetMetadata', async (source, key, value) => {
    return await setMetadata(Number(source), String(key), value);
});
exports('RemoveMetadata', async (source, key) => {
    return await removeMetadata(Number(source), String(key));
});
exports('GetInventory', (source) => {
    const session = sessions.get(Number(source));
    return session ? publicInventory(session) : null;
});
exports('GetItemDefinition', (itemName) => {
    const item = ITEM_DEFINITIONS[String(itemName ?? '').toLowerCase()];
    return item ? { ...item } : null;
});
exports('CanCarry', (source, itemName, amount) => {
    return canCarryItem(Number(source), String(itemName ?? '').toLowerCase(), Number(amount));
});
exports('HasItem', (source, itemName, amount) => {
    return hasItem(Number(source), String(itemName ?? '').toLowerCase(), Number(amount ?? 1));
});
exports('AddItem', async (source, itemName, amount, metadata, reason) => {
    return await addItem(Number(source), String(itemName ?? '').toLowerCase(), Number(amount), metadata ?? {}, reason ?? 'export');
});
exports('RemoveItem', async (source, itemName, amount, reason) => {
    return await removeItem(Number(source), String(itemName ?? '').toLowerCase(), Number(amount), reason ?? 'export');
});
exports('UseItem', async (source, itemName) => {
    return await useItem(Number(source), String(itemName ?? '').toLowerCase());
});
exports('GetOwnedVehicles', async (source) => await getOwnedVehicles(Number(source)));
exports('AddOwnedVehicle', async (source, model, plate, properties) => {
    return await addOwnedVehicle(Number(source), model, plate ?? '', properties ?? {});
});
exports('UpdateOwnedVehicle', async (source, plate, changes) => {
    return await updateOwnedVehicle(Number(source), String(plate), changes);
});
exports('RemoveOwnedVehicle', async (source, plate) => {
    return await removeOwnedVehicle(Number(source), String(plate));
});
exports('RegisterCallback', (name, handler) => {
    registerRpc(String(name), handler);
    return true;
});
exports('RegisterValidatedCallback', (name, validator, handler) => {
    if (typeof validator !== 'function' || typeof handler !== 'function')
        return false;
    registerValidatedRpc(String(name), validator, handler);
    return true;
});
exports('RegisterCommand', (name, adminOnly, handler) => {
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
exports('GetApiVersion', () => Config.apiVersion);
exports('GetCapabilities', () => ({
    apiVersion: Config.apiVersion,
    version: Config.version,
    features: { ...Config.features },
    managers: ['runtime', 'sessions', 'permissions', 'observability', 'gameplay'],
}));
exports('GetDiagnostics', () => ({
    version: Config.version,
    apiVersion: Config.apiVersion,
    environment: Config.environment,
    databaseReady,
    activeSessions: sessions.size,
    dirtySessions: Array.from(sessions.values()).filter((session) => session.dirty.size > 0).length,
    characterLocks: activeCharacterOwners.size,
    registeredRpc: rpcHandlers.size,
    validatedRpc: rpcValidators.size,
    registeredCommands: commandRegistry.size,
    database: getDatabaseMetrics(),
    modules: getCoreModules(),
}));
exports('RegisterModule', (name, version) => registerCoreModule(name, version));
exports('PublishEvent', (name, payload) => {
    const safe = String(name ?? '').trim();
    if (!/^[a-zA-Z0-9_.:-]{1,96}$/.test(safe))
        return false;
    emit(`rumble:event:${safe}`, payload ?? null);
    void CoreEvents.emit(safe, payload ?? null);
    return true;
});
exports('GetRegisteredCommands', () => Array.from(commandRegistry.entries()).map(([name, data]) => ({ name, ...data })));
exports('FlushAllPlayers', async () => {
    const current = Array.from(sessions.values());
    await Promise.allSettled(current.map((session) => saveSession(session, true)));
    return true;
});
Logger.info('CORE', 'Server script loaded', { resource: RESOURCE, version: Config.version });
