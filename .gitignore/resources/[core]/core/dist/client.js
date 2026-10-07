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
const clientDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let playerData = null;
let loaded = false;
let registrationOpen = false;
let selectorOpen = false;
let spawnOpen = false;
let deathState = 'alive';
let inventoryState = [];
let registrationProfile = {};
const rpcPending = new Map();
let rpcSequence = 0;
let flyEnabled = false;
let flyTick = null;
let flyEntity = 0;
const flySpeeds = [0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
const flyControls = [21, 22, 32, 33, 34, 35, 36, 44, 75];
let flySpeedIndex = 3;
function chat(text, kind = 'info') {
    const prefix = kind === 'error' ? '^1Rumble' : kind === 'success' ? '^2Rumble' : '^5Rumble';
    emit('chat:addMessage', {
        color: [255, 255, 255],
        multiline: false,
        args: [prefix, text],
    });
}
function refreshNuiFocus() {
    SetNuiFocus(registrationOpen || selectorOpen || spawnOpen, registrationOpen || selectorOpen || spawnOpen);
}
function openRegistration(profile = {}) {
    var _a, _b, _c, _d;
    registrationProfile = { ...profile };
    registrationOpen = true;
    selectorOpen = false;
    spawnOpen = false;
    loaded = false;
    DoScreenFadeOut(0);
    ShutdownLoadingScreen();
    ShutdownLoadingScreenNui();
    const ped = PlayerPedId();
    if (DoesEntityExist(ped)) {
        FreezeEntityPosition(ped, true);
        SetEntityInvincible(ped, true);
    }
    refreshNuiFocus();
    SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
    SendNuiMessage(JSON.stringify({
        type: 'registration',
        active: true,
        mode: String((_a = profile === null || profile === void 0 ? void 0 : profile.mode) !== null && _a !== void 0 ? _a : 'create'),
        characterId: Number((_b = profile === null || profile === void 0 ? void 0 : profile.characterId) !== null && _b !== void 0 ? _b : 0),
        firstName: String((_c = profile === null || profile === void 0 ? void 0 : profile.firstName) !== null && _c !== void 0 ? _c : ''),
        lastName: String((_d = profile === null || profile === void 0 ? void 0 : profile.lastName) !== null && _d !== void 0 ? _d : ''),
    }));
}
function closeRegistration() {
    registrationOpen = false;
    SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
    refreshNuiFocus();
}
function openSelector(data) {
    registrationOpen = false;
    spawnOpen = false;
    selectorOpen = true;
    loaded = false;
    DoScreenFadeOut(0);
    ShutdownLoadingScreen();
    ShutdownLoadingScreenNui();
    const ped = PlayerPedId();
    if (DoesEntityExist(ped)) {
        FreezeEntityPosition(ped, true);
        SetEntityInvincible(ped, true);
    }
    refreshNuiFocus();
    SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'selector', active: true, ...data }));
}
function closeSelector() {
    selectorOpen = false;
    SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
    refreshNuiFocus();
}
function openSpawn(data) {
    registrationOpen = false;
    selectorOpen = false;
    spawnOpen = true;
    loaded = false;
    refreshNuiFocus();
    SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
    SendNuiMessage(JSON.stringify({
        type: 'spawn',
        active: true,
        spawns: Array.isArray(data === null || data === void 0 ? void 0 : data.spawns) ? data.spawns : [],
        forcedHospital: deathState !== 'alive',
    }));
}
function closeSpawn() {
    spawnOpen = false;
    SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
    refreshNuiFocus();
}
async function loadModel(modelName) {
    const model = GetHashKey(modelName);
    RequestModel(model);
    const started = Date.now();
    while (!HasModelLoaded(model)) {
        if (Date.now() - started > 10000) {
            throw new Error(`Model ${modelName} could not be loaded.`);
        }
        await clientDelay(0);
    }
    return model;
}
async function spawnCharacter(data, position, spawnId = 'last') {
    closeRegistration();
    closeSelector();
    closeSpawn();
    loaded = false;
    DoScreenFadeOut(250);
    while (!IsScreenFadedOut()) {
        await clientDelay(0);
    }
    const model = await loadModel('mp_m_freemode_01');
    SetPlayerModel(PlayerId(), model);
    SetModelAsNoLongerNeeded(model);
    const ped = PlayerPedId();
    const p = position !== null && position !== void 0 ? position : data.character.position;
    RequestCollisionAtCoord(p.x, p.y, p.z);
    NetworkResurrectLocalPlayer(p.x, p.y, p.z, p.heading, true, false);
    SetEntityCoordsNoOffset(ped, p.x, p.y, p.z, false, false, false);
    SetEntityHeading(ped, p.heading);
    SetEntityHealth(ped, Math.max(100, data.character.health || 200));
    SetPedArmour(ped, Math.max(0, data.character.armor || 0));
    ClearPedTasksImmediately(ped);
    ClearPedBloodDamage(ped);
    SetEntityInvincible(ped, false);
    FreezeEntityPosition(ped, false);
    const collisionStarted = Date.now();
    while (!HasCollisionLoadedAroundEntity(ped) && Date.now() - collisionStarted < 2500) {
        await clientDelay(50);
    }
    playerData = data;
    loaded = true;
    ShutdownLoadingScreen();
    ShutdownLoadingScreenNui();
    DoScreenFadeIn(350);
    chat(`Welcome, ${data.character.firstName} ${data.character.lastName}. Character ID: ${data.character.id}`, 'success');
    emitNet('rumble:player:spawned', spawnId);
}
function sendPlayerState() {
    if (!loaded || !playerData)
        return;
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    emitNet('rumble:player:updateState');
}
setInterval(sendPlayerState, 15000);
onNet('rumble:character:registrationRequired', (profile) => {
    openRegistration(profile);
});
onNet('rumble:character:registrationError', (text) => {
    SendNuiMessage(JSON.stringify({ type: 'registrationError', message: String(text || 'The character could not be created.') }));
});
onNet('rumble:character:selectorRequired', (data) => {
    openSelector(data);
});
onNet('rumble:character:selectorError', (text) => {
    SendNuiMessage(JSON.stringify({ type: 'selectorError', message: String(text || 'The character could not be selected.') }));
});
RegisterNuiCallbackType('characterCreate');
on('__cfx_nui:characterCreate', (data, callback) => {
    var _a, _b, _c, _d, _e;
    if (!registrationOpen) {
        callback({ accepted: false });
        return;
    }
    emitNet('rumble:character:createInitial', {
        mode: String((_a = registrationProfile === null || registrationProfile === void 0 ? void 0 : registrationProfile.mode) !== null && _a !== void 0 ? _a : 'create'),
        characterId: Number((_b = registrationProfile === null || registrationProfile === void 0 ? void 0 : registrationProfile.characterId) !== null && _b !== void 0 ? _b : 0),
        firstName: String((_c = data === null || data === void 0 ? void 0 : data.firstName) !== null && _c !== void 0 ? _c : ''),
        lastName: String((_d = data === null || data === void 0 ? void 0 : data.lastName) !== null && _d !== void 0 ? _d : ''),
        dateOfBirth: String((_e = data === null || data === void 0 ? void 0 : data.dateOfBirth) !== null && _e !== void 0 ? _e : ''),
    });
    callback({ accepted: true });
});
RegisterNuiCallbackType('characterSelect');
on('__cfx_nui:characterSelect', (data, callback) => {
    var _a;
    if (!selectorOpen) {
        callback({ accepted: false });
        return;
    }
    const id = Number((_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : 0);
    if (!Number.isInteger(id) || id <= 0) {
        callback({ accepted: false });
        return;
    }
    emitNet('rumble:character:select', id);
    callback({ accepted: true });
});
RegisterNuiCallbackType('characterNew');
on('__cfx_nui:characterNew', (_data, callback) => {
    if (!selectorOpen) {
        callback({ accepted: false });
        return;
    }
    openRegistration({ mode: 'create', firstName: '', lastName: '' });
    callback({ accepted: true });
});
RegisterNuiCallbackType('spawnSelect');
on('__cfx_nui:spawnSelect', (data, callback) => {
    var _a;
    if (!spawnOpen || !playerData) {
        callback({ accepted: false });
        return;
    }
    const id = String((_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : '');
    const positions = {
        airport: { x: -1037.72, y: -2737.88, z: 20.17, heading: 329.0 },
        legion: { x: 215.76, y: -810.12, z: 30.73, heading: 158.0 },
        hospital: { x: 298.18, y: -584.45, z: 43.26, heading: 70.0 },
    };
    if (deathState !== 'alive' && id !== 'hospital') {
        callback({ accepted: false });
        return;
    }
    const position = id === 'last' ? playerData.character.position : positions[id];
    if (!position) {
        callback({ accepted: false });
        return;
    }
    if (deathState !== 'alive' && id === 'hospital') {
        playerData.character.health = 200;
        playerData.character.armor = 0;
    }
    callback({ accepted: true });
    void spawnCharacter(playerData, position, id).catch((error) => {
        console.error('[rumble] Spawn failed', error);
        chat('Spawn failed. Check the F8 console.', 'error');
    });
});
onNet('rumble:character:selected', (data) => {
    var _a, _b, _c;
    playerData = (_a = data === null || data === void 0 ? void 0 : data.player) !== null && _a !== void 0 ? _a : null;
    inventoryState = Array.isArray(data === null || data === void 0 ? void 0 : data.inventory) ? data.inventory : [];
    deathState = String((_c = (_b = data === null || data === void 0 ? void 0 : data.metadata) === null || _b === void 0 ? void 0 : _b.deathState) !== null && _c !== void 0 ? _c : 'alive');
    if (!playerData)
        return;
    openSpawn(data);
});
onNet('rumble:player:loaded', (data) => {
    playerData = data;
    loaded = true;
    chat(`Welcome, ${data.character.firstName} ${data.character.lastName}. Character ID: ${data.character.id}`, 'success');
    emit('rumble:client:playerLoaded', data);
});
onNet('rumble:money:update', (account, amount) => {
    if (!playerData)
        return;
    playerData.character[account] = Number(amount);
});
onNet('rumble:inventory:update', (items) => {
    inventoryState = Array.isArray(items) ? items : [];
    emit('rumble:client:inventoryChanged', inventoryState);
});
onNet('rumble:rpc:response', (requestId, ok, result, error) => {
    const pending = rpcPending.get(String(requestId));
    if (!pending)
        return;
    clearTimeout(pending.timer);
    rpcPending.delete(String(requestId));
    if (ok)
        pending.resolve(result);
    else
        pending.reject(new Error(String(error !== null && error !== void 0 ? error : 'RPC failed')));
});
function rpcCall(name, payload = null, timeoutMs = 10000) {
    const id = `${Date.now().toString(36)}-${(++rpcSequence).toString(36)}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            rpcPending.delete(id);
            reject(new Error(`RPC timeout: ${name}`));
        }, Math.max(1000, timeoutMs));
        rpcPending.set(id, { resolve, reject, timer });
        emitNet('rumble:rpc:request', id, name, payload);
    });
}
onNet('rumble:needs:update', (hunger, thirst, reason) => {
    if (!playerData)
        return;
    const previousHunger = playerData.character.hunger;
    const previousThirst = playerData.character.thirst;
    playerData.character.hunger = Math.max(0, Math.min(100, Number(hunger)));
    playerData.character.thirst = Math.max(0, Math.min(100, Number(thirst)));
    if (reason === 'decay') {
        const currentHunger = playerData.character.hunger;
        const currentThirst = playerData.character.thirst;
        if (previousHunger > 25 && currentHunger <= 25)
            chat('You are hungry. Hunger dropped below 25%.', 'info');
        if (previousThirst > 25 && currentThirst <= 25)
            chat('You are thirsty. Thirst dropped below 25%.', 'info');
        if (previousHunger > 10 && currentHunger <= 10)
            chat('Critical hunger: below 10%.', 'error');
        if (previousThirst > 10 && currentThirst <= 10)
            chat('Critical thirst: below 10%.', 'error');
        if (previousHunger > 0 && currentHunger <= 0)
            chat('Your hunger is empty. You are starting to lose health.', 'error');
        if (previousThirst > 0 && currentThirst <= 0)
            chat('Your thirst is empty. You are starting to lose health.', 'error');
    }
});
onNet('rumble:needs:damage', (amount) => {
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped) || IsEntityDead(ped))
        return;
    const damage = Math.max(0, Math.floor(Number(amount)));
    if (damage <= 0)
        return;
    SetEntityHealth(ped, Math.max(0, GetEntityHealth(ped) - damage));
});
onNet('rumble:vitals:set', (vital, amount) => {
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    if (vital === 'health') {
        const maximum = GetEntityMaxHealth(ped);
        const targetHealth = Math.max(0, Math.min(maximum, Math.floor(Number(amount))));
        if (IsEntityDead(ped) && targetHealth > 0) {
            const [x, y, z] = GetEntityCoords(ped, false);
            const heading = GetEntityHeading(ped);
            NetworkResurrectLocalPlayer(x, y, z + 0.1, heading, true, false);
        }
        SetEntityHealth(PlayerPedId(), targetHealth);
        ClearPedBloodDamage(PlayerPedId());
        ResetPedVisibleDamage(PlayerPedId());
    }
    else if (vital === 'armor') {
        SetPedArmour(ped, Math.max(0, Math.min(100, Math.floor(Number(amount)))));
    }
    sendPlayerState();
});
onNet('rumble:admin:fullStats', () => {
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    if (IsEntityDead(ped)) {
        const [x, y, z] = GetEntityCoords(ped, false);
        const heading = GetEntityHeading(ped);
        NetworkResurrectLocalPlayer(x, y, z + 0.1, heading, true, false);
    }
    const activePed = PlayerPedId();
    SetEntityHealth(activePed, GetEntityMaxHealth(activePed));
    SetPedArmour(activePed, 100);
    ClearPedBloodDamage(activePed);
    ResetPedVisibleDamage(activePed);
    deathState = 'alive';
    emitNet('rumble:death:update', 'alive');
    sendPlayerState();
});
onNet('rumble:admin:revive', () => {
    const ped = PlayerPedId();
    const [x, y, z] = GetEntityCoords(ped, false);
    const heading = GetEntityHeading(ped);
    NetworkResurrectLocalPlayer(x, y, z + 0.1, heading, true, false);
    ClearPedTasksImmediately(ped);
    ClearPedBloodDamage(ped);
    ResetPedVisibleDamage(ped);
    SetEntityHealth(ped, GetEntityMaxHealth(ped));
    SetPedArmour(ped, 0);
    SetEntityInvincible(ped, false);
    FreezeEntityPosition(ped, false);
    deathState = 'alive';
    emitNet('rumble:death:update', 'alive');
    sendPlayerState();
    chat('You have been revived.', 'success');
});
onNet('rumble:death:state', (stateInput) => {
    const next = String(stateInput);
    if (!['alive', 'downed', 'dead', 'respawning'].includes(next))
        return;
    deathState = next;
    if (deathState === 'downed')
        chat('You are downed. If you are not revived, you will become dead.', 'error');
    if (deathState === 'dead')
        chat('You are dead. You can use /respawn.', 'error');
});
onNet('rumble:death:respawn', (position) => {
    if (!playerData || !position)
        return;
    deathState = 'respawning';
    void (async () => {
        playerData.character.health = 200;
        playerData.character.armor = 0;
        await spawnCharacter(playerData, position, 'hospital');
        deathState = 'alive';
        emitNet('rumble:death:update', 'alive');
        chat('You respawned at the hospital.', 'success');
    })().catch((error) => console.error('[rumble] Respawn failed', error));
});
setInterval(() => {
    if (!loaded || !playerData)
        return;
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    const dead = IsEntityDead(ped) || GetEntityHealth(ped) <= 0;
    if (dead && deathState === 'alive') {
        deathState = 'downed';
        emitNet('rumble:death:update', 'downed');
    }
    else if (!dead && deathState !== 'alive' && deathState !== 'respawning') {
        deathState = 'alive';
        emitNet('rumble:death:update', 'alive');
    }
}, 1000);
function getFlyTarget() {
    const ped = PlayerPedId();
    const vehicle = GetVehiclePedIsIn(ped, false);
    if (vehicle !== 0 && DoesEntityExist(vehicle) && GetPedInVehicleSeat(vehicle, -1) === ped) {
        return vehicle;
    }
    return ped;
}
function restoreFlyEntity(entity) {
    if (!entity || !DoesEntityExist(entity))
        return;
    SetEntityCollision(entity, true, true);
    SetEntityInvincible(entity, false);
    FreezeEntityPosition(entity, false);
    SetEntityVelocity(entity, 0.0, 0.0, 0.0);
}
function updateFlyUi() {
    SendNuiMessage(JSON.stringify({
        type: 'fly',
        active: flyEnabled,
        speed: flySpeeds[flySpeedIndex],
    }));
}
function directionFromCamera() {
    const [pitch, , yaw] = GetGameplayCamRot(2);
    const pitchRad = pitch * Math.PI / 180.0;
    const yawRad = yaw * Math.PI / 180.0;
    const cosPitch = Math.cos(pitchRad);
    const forward = [
        -Math.sin(yawRad) * Math.abs(cosPitch),
        Math.cos(yawRad) * Math.abs(cosPitch),
        Math.sin(pitchRad),
    ];
    const right = [
        Math.cos(yawRad),
        Math.sin(yawRad),
        0.0,
    ];
    return { forward, right };
}
function startFly() {
    if (flyEnabled)
        return;
    flyEnabled = true;
    flyEntity = getFlyTarget();
    updateFlyUi();
    chat('Fly enabled. Use the mouse wheel to change speed; /fly disables it.', 'success');
    flyTick = setTick(() => {
        const nextEntity = getFlyTarget();
        if (nextEntity !== flyEntity) {
            restoreFlyEntity(flyEntity);
            flyEntity = nextEntity;
        }
        if (!flyEntity || !DoesEntityExist(flyEntity))
            return;
        SetEntityCollision(flyEntity, false, false);
        SetEntityInvincible(flyEntity, true);
        SetEntityVelocity(flyEntity, 0.0, 0.0, 0.0);
        for (const control of flyControls)
            DisableControlAction(0, control, true);
        if (IsDisabledControlJustPressed(0, 15)) {
            flySpeedIndex = Math.min(flySpeeds.length - 1, flySpeedIndex + 1);
            updateFlyUi();
        }
        if (IsDisabledControlJustPressed(0, 14)) {
            flySpeedIndex = Math.max(0, flySpeedIndex - 1);
            updateFlyUi();
        }
        const { forward, right } = directionFromCamera();
        const [x, y, z] = GetEntityCoords(flyEntity, false);
        let dx = 0.0;
        let dy = 0.0;
        let dz = 0.0;
        if (IsDisabledControlPressed(0, 32)) {
            dx += forward[0];
            dy += forward[1];
            dz += forward[2];
        }
        if (IsDisabledControlPressed(0, 33)) {
            dx -= forward[0];
            dy -= forward[1];
            dz -= forward[2];
        }
        if (IsDisabledControlPressed(0, 35)) {
            dx += right[0];
            dy += right[1];
        }
        if (IsDisabledControlPressed(0, 34)) {
            dx -= right[0];
            dy -= right[1];
        }
        if (IsDisabledControlPressed(0, 22)) {
            dz += 1.0;
        }
        if (IsDisabledControlPressed(0, 44)) {
            dz -= 1.0;
        }
        const length = Math.hypot(dx, dy, dz);
        if (length > 0.0) {
            dx /= length;
            dy /= length;
            dz /= length;
            let speed = flySpeeds[flySpeedIndex];
            if (IsDisabledControlPressed(0, 21))
                speed *= 3.0;
            if (IsDisabledControlPressed(0, 36))
                speed *= 0.25;
            const frameScale = Math.max(0.25, Math.min(3.0, GetFrameTime() * 60.0));
            const move = speed * frameScale;
            SetEntityCoordsNoOffset(flyEntity, x + dx * move, y + dy * move, z + dz * move, false, false, false);
            const [, , yaw] = GetGameplayCamRot(2);
            SetEntityHeading(flyEntity, yaw);
        }
    });
}
function stopFly() {
    if (!flyEnabled)
        return;
    flyEnabled = false;
    if (flyTick !== null) {
        clearTick(flyTick);
        flyTick = null;
    }
    restoreFlyEntity(flyEntity);
    flyEntity = 0;
    updateFlyUi();
    chat('Fly disabled.', 'info');
}
onNet('rumble:admin:toggleFly', () => {
    if (flyEnabled)
        stopFly();
    else
        startFly();
});
async function getGroundAtWaypoint(x, y) {
    const heights = [0, 25, 50, 75, 100, 150, 200, 300, 400, 500, 650, 800, 1000];
    for (const height of heights) {
        RequestCollisionAtCoord(x, y, height);
        SetFocusPosAndVel(x, y, height, 0.0, 0.0, 0.0);
        await clientDelay(80);
        const [found, groundZ] = GetGroundZFor_3dCoord(x, y, height + 25.0, false);
        if (found) {
            ClearFocus();
            return groundZ;
        }
    }
    ClearFocus();
    return null;
}
onNet('rumble:admin:gotoWaypoint', () => {
    void (async () => {
        const waypoint = GetFirstBlipInfoId(8);
        if (!waypoint || !DoesBlipExist(waypoint)) {
            return chat('You do not have a waypoint set on the map.', 'error');
        }
        const [x, y] = GetBlipInfoIdCoord(waypoint);
        DoScreenFadeOut(200);
        await clientDelay(250);
        const ground = await getGroundAtWaypoint(x, y);
        const z = ground !== null ? ground + 1.0 : 100.0;
        const ped = PlayerPedId();
        const vehicle = GetVehiclePedIsIn(ped, false);
        const target = vehicle !== 0 && GetPedInVehicleSeat(vehicle, -1) === ped ? vehicle : ped;
        RequestCollisionAtCoord(x, y, z);
        SetEntityCoordsNoOffset(target, x, y, z, false, false, false);
        SetEntityVelocity(target, 0.0, 0.0, 0.0);
        await clientDelay(250);
        DoScreenFadeIn(250);
        chat(ground !== null ? 'Teleported to waypoint.' : 'Teleported to waypoint; exact ground height was not found.', ground !== null ? 'success' : 'info');
    })().catch((error) => {
        console.error(error);
        ClearFocus();
        DoScreenFadeIn(250);
        chat('Waypoint teleport failed.', 'error');
    });
});
function getControllableEntity() {
    const ped = PlayerPedId();
    const vehicle = GetVehiclePedIsIn(ped, false);
    if (vehicle !== 0 && DoesEntityExist(vehicle) && GetPedInVehicleSeat(vehicle, -1) === ped)
        return vehicle;
    return ped;
}
async function requestEntityControl(entity, timeoutMs = 1500) {
    if (!entity || !DoesEntityExist(entity))
        return false;
    const started = Date.now();
    while (!NetworkHasControlOfEntity(entity) && Date.now() - started < timeoutMs) {
        NetworkRequestControlOfEntity(entity);
        await clientDelay(0);
    }
    return NetworkHasControlOfEntity(entity);
}
onNet('rumble:admin:teleport', (position) => {
    var _a;
    if (!position)
        return;
    const values = [Number(position.x), Number(position.y), Number(position.z), Number((_a = position.heading) !== null && _a !== void 0 ? _a : 0)];
    if (values.some((value) => !Number.isFinite(value)))
        return;
    const entity = getControllableEntity();
    RequestCollisionAtCoord(values[0], values[1], values[2]);
    SetEntityCoordsNoOffset(entity, values[0], values[1], values[2], false, false, false);
    SetEntityHeading(entity, values[3]);
    SetEntityVelocity(entity, 0.0, 0.0, 0.0);
});
onNet('rumble:admin:freeze', (enabled) => {
    const entity = getControllableEntity();
    FreezeEntityPosition(entity, Boolean(enabled));
    chat(Boolean(enabled) ? 'You were frozen by the administrator.' : 'Freeze disabled.', 'info');
});
onNet('rumble:admin:spawnVehicle', (modelName) => {
    void (async () => {
        const normalized = String(modelName !== null && modelName !== void 0 ? modelName : '').trim().toLowerCase();
        if (!/^[a-z0-9_-]{1,64}$/.test(normalized))
            return chat('Invalid vehicle model.', 'error');
        const model = GetHashKey(normalized);
        if (!IsModelInCdimage(model) || !IsModelAVehicle(model))
            return chat('The model is not a valid vehicle.', 'error');
        RequestModel(model);
        const started = Date.now();
        while (!HasModelLoaded(model)) {
            if (Date.now() - started > 10000)
                return chat('The vehicle model failed to load.', 'error');
            await clientDelay(0);
        }
        const ped = PlayerPedId();
        const [x, y, z] = GetEntityCoords(ped, false);
        const heading = GetEntityHeading(ped);
        const vehicle = CreateVehicle(model, x, y, z + 0.5, heading, true, true);
        if (!vehicle || !DoesEntityExist(vehicle))
            return chat('The vehicle could not be created.', 'error');
        SetEntityAsMissionEntity(vehicle, true, true);
        SetVehicleOnGroundProperly(vehicle);
        SetPedIntoVehicle(ped, vehicle, -1);
        SetModelAsNoLongerNeeded(model);
        chat(`Vehicle created: ${normalized}.`, 'success');
    })().catch((error) => chat(`Vehicle spawn error: ${String(error)}`, 'error'));
});
onNet('rumble:admin:deleteVehicle', (radiusInput) => {
    void (async () => {
        const ped = PlayerPedId();
        let vehicle = GetVehiclePedIsIn(ped, false);
        if (!vehicle) {
            const [x, y, z] = GetEntityCoords(ped, false);
            const radius = Math.max(1, Math.min(100, Number(radiusInput) || 5));
            vehicle = GetClosestVehicle(x, y, z, radius, 0, 70);
        }
        if (!vehicle || !DoesEntityExist(vehicle))
            return chat('There is no vehicle nearby.', 'error');
        if (!await requestEntityControl(vehicle))
            return chat('Could not obtain control of the vehicle.', 'error');
        SetEntityAsMissionEntity(vehicle, true, true);
        DeleteEntity(vehicle);
        chat('Vehicle deleted.', 'success');
    })();
});
let spectatingServerId = 0;
onNet('rumble:admin:spectate', (targetServerId) => {
    const target = Number(targetServerId);
    if (!Number.isInteger(target) || target <= 0) {
        NetworkSetInSpectatorMode(false, PlayerPedId());
        spectatingServerId = 0;
        chat('Spectate disabled.', 'info');
        return;
    }
    const player = GetPlayerFromServerId(target);
    if (player < 0)
        return chat('The player is not in scope.', 'error');
    const ped = GetPlayerPed(player);
    if (!ped || !DoesEntityExist(ped))
        return chat('The player ped is unavailable.', 'error');
    NetworkSetInSpectatorMode(true, ped);
    spectatingServerId = target;
    chat(`Spectating ID ${target}.`, 'success');
});
onNet('rumble:admin:inspectEntity', () => {
    const [cx, cy, cz] = GetGameplayCamCoord();
    const { forward } = directionFromCamera();
    const distance = 15.0;
    const ray = StartShapeTestRay(cx, cy, cz, cx + forward[0] * distance, cy + forward[1] * distance, cz + forward[2] * distance, -1, PlayerPedId(), 0);
    const [, hit, endCoords, , entity] = GetShapeTestResult(ray);
    if (!hit || !entity || !DoesEntityExist(entity))
        return chat('There is no entity in front of you.', 'error');
    const model = GetEntityModel(entity);
    const type = GetEntityType(entity);
    const networkId = NetworkGetNetworkIdFromEntity(entity);
    const [x, y, z] = endCoords;
    chat(`Entity ${entity} | type ${type} | model ${model} | net ${networkId} | ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`, 'info');
});
onNet('rumble:admin:vehicleInfo', () => {
    const ped = PlayerPedId();
    const vehicle = GetVehiclePedIsIn(ped, false);
    if (!vehicle || !DoesEntityExist(vehicle))
        return chat('You are not in a vehicle.', 'error');
    const model = GetEntityModel(vehicle);
    const plate = GetVehicleNumberPlateText(vehicle).trim();
    const engine = GetVehicleEngineHealth(vehicle);
    const body = GetVehicleBodyHealth(vehicle);
    const fuel = GetVehicleFuelLevel(vehicle);
    chat(`Model ${model} | plate ${plate} | engine ${engine.toFixed(1)} | body ${body.toFixed(1)} | fuel ${fuel.toFixed(1)}`, 'info');
});
async function serverCallback(name, payload, timeoutMs = 10000) {
    return await rpcCall(name, payload, timeoutMs);
}
on('onClientResourceStart', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    setTimeout(() => {
        emit('chat:addSuggestion', '/ara', 'Revive all players within 10m, including yourself.');
        emit('chat:addSuggestion', '/fly', 'Enable or disable fly/noclip.');
        emit('chat:addSuggestion', '/gotow', 'Teleport to the waypoint set on the map.');
        emit('chat:addSuggestion', '/tp', 'Teleport to coordinates.', [
            { name: 'x', help: 'Coordonata X' },
            { name: 'y', help: 'Coordonata Y' },
            { name: 'z', help: 'Coordonata Z' },
            { name: 'heading', help: 'Optional heading' },
        ]);
        emit('chat:addSuggestion', '/bring', 'Bring a player to you.', [{ name: 'id', help: 'Server ID' }]);
        emit('chat:addSuggestion', '/goto', 'Go to a player.', [{ name: 'id', help: 'Server ID' }]);
        emit('chat:addSuggestion', '/coords', 'Show current coordinates.');
        emit('chat:addSuggestion', '/heading', 'Show current heading.');
        emit('chat:addSuggestion', '/pos', 'Show the current position as vector4.');
        emit('chat:addSuggestion', '/vehicle', 'Spawn a vehicle.', [{ name: 'model', help: 'Model GTA' }]);
        emit('chat:addSuggestion', '/dv', 'Delete the current or a nearby vehicle.', [{ name: 'radius', help: '1-100, default 5' }]);
        emit('chat:addSuggestion', '/freeze', 'Freeze or unfreeze a player.', [{ name: 'id', help: 'Server ID' }]);
        emit('chat:addSuggestion', '/heal', 'Heal yourself or another player.', [{ name: 'id', help: 'Optional server ID' }]);
        emit('chat:addSuggestion', '/revive', 'Revive yourself or another player.', [{ name: 'id', help: 'Optional server ID' }]);
        emit('chat:addSuggestion', '/spectate', 'Spectate a player or turn spectate off.', [{ name: 'id/off', help: 'Server ID or off' }]);
        emit('chat:addSuggestion', '/entity', 'Inspect the entity in front of the camera.');
        emit('chat:addSuggestion', '/vehinfo', 'Show information about the current vehicle.');
        emit('chat:addSuggestion', '/healthcheck', 'Run the core health check.');
        emit('chat:addSuggestion', '/money', 'Show cash and card balance.');
        emit('chat:addSuggestion', '/cash', 'Show cash balance.');
        emit('chat:addSuggestion', '/card', 'Show card balance.');
        emit('chat:addSuggestion', '/stats', 'Show hunger, thirst, health, and armor.');
        emit('chat:addSuggestion', '/fullstats', 'Fully restore hunger, thirst, health, and armor.');
        emit('chat:addSuggestion', '/hunger', 'Set hunger to 100%.');
        emit('chat:addSuggestion', '/water', 'Set thirst to 100%.');
        emit('chat:addSuggestion', '/health', 'Restore health to maximum.');
        emit('chat:addSuggestion', '/armor', 'Set armor to 100%.');
        emit('chat:addSuggestion', '/chars', 'List your characters.');
        emit('chat:addSuggestion', '/newchar', 'Create and select a character.', [
            { name: 'firstName', help: 'First Name' },
            { name: 'lastName', help: 'Last Name' },
            { name: 'date', help: 'YYYY-MM-DD' },
        ]);
        emit('chat:addSuggestion', '/switchchar', 'Switch character using the ID from /chars.', [
            { name: 'id', help: 'Character ID' },
        ]);
        emit('chat:addSuggestion', '/characters', 'Open the character selector.');
        emit('chat:addSuggestion', '/inv', 'List your inventory in chat.');
        emit('chat:addSuggestion', '/use', 'Use an item.', [{ name: 'item', help: 'water, sandwich, medkit, armor' }]);
        emit('chat:addSuggestion', '/giveitem', 'Give an item to a player.');
        emit('chat:addSuggestion', '/vehicles', 'List owned vehicles.');
        emit('chat:addSuggestion', '/addvehicle', 'Add an owned vehicle to a player.');
        emit('chat:addSuggestion', '/respawn', 'Respawn at the hospital when dead.');
        emitNet('rumble:player:requestLoad');
    }, 1000);
});
on('onClientResourceStop', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    stopFly();
    if (spectatingServerId)
        NetworkSetInSpectatorMode(false, PlayerPedId());
    spectatingServerId = 0;
    closeRegistration();
    closeSelector();
    closeSpawn();
    for (const pending of rpcPending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Rumble resource stopped.'));
    }
    rpcPending.clear();
});
exports('GetPlayerData', () => playerData ? JSON.parse(JSON.stringify(playerData)) : null);
exports('GetInventory', () => JSON.parse(JSON.stringify(inventoryState)));
exports('IsLoaded', () => loaded);
exports('Rpc', async (name, payload, timeoutMs) => await rpcCall(String(name), payload !== null && payload !== void 0 ? payload : null, Number(timeoutMs !== null && timeoutMs !== void 0 ? timeoutMs : 10000)));
exports('Callback', async (name, payload, timeoutMs) => await serverCallback(name, payload !== null && payload !== void 0 ? payload : null, Number(timeoutMs !== null && timeoutMs !== void 0 ? timeoutMs : 10000)));
console.log('[rumble] Client script loaded.');
