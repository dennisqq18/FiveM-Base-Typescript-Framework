
interface Position {
  x: number;
  y: number;
  z: number;
  heading: number;
}

interface Character {
  id: number;
  stateId: number;
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

interface PlayerData {
  id: number;
  playerId: number;
  source: number;
  identifier: string;
  name: string;
  character: Character;
}

const clientDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let availableSpawns = new Map<string, Position>();
let characterPreviewCamera = 0;
let characterSceneToken = 0;

let playerData: PlayerData | null = null;
let loaded = false;
let registrationOpen = false;
let selectorOpen = false;
let spawnOpen = false;
let deathState: 'alive' | 'downed' | 'dead' | 'respawning' = 'alive';
let inventoryState: any[] = [];
let registrationProfile: any = {};
const rpcPending = new Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void; timer: ReturnType<typeof setTimeout> }>();
let rpcSequence = 0;

let flyEnabled = false;
let flyTick: number | null = null;
let flyEntity = 0;
const flySpeeds = [0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
const flyControls = [21, 22, 32, 33, 34, 35, 36, 44, 75];
let flySpeedIndex = 3;

function chat(text: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  const prefix = kind === 'error' ? '^1Rumble' : kind === 'success' ? '^2Rumble' : '^5Rumble';
  emit('chat:addMessage', {
    color: [255, 255, 255],
    multiline: false,
    args: [prefix, text],
  });
}

function refreshNuiFocus(): void {
  SetNuiFocus(registrationOpen || selectorOpen || spawnOpen, registrationOpen || selectorOpen || spawnOpen);
}

async function ensureScreenVisible(): Promise<void> {
  ShutdownLoadingScreen();
  ShutdownLoadingScreenNui();
  DoScreenFadeIn(0);
  for (let frame = 0; frame < 30 && IsScreenFadedOut(); frame++) {
    DoScreenFadeIn(0);
    await clientDelay(0);
  }
}

function destroyCharacterPreviewCamera(immediate = false): void {
  if (characterPreviewCamera && DoesCamExist(characterPreviewCamera)) {
    SetCamActive(characterPreviewCamera, false);
    RenderScriptCams(false, !immediate, immediate ? 0 : 250, true, true);
    DestroyCam(characterPreviewCamera, false);
  }
  characterPreviewCamera = 0;
}

async function ensureDefaultCharacterModel(): Promise<number> {
  const modelName = ClientConfig.characterPreview.model;
  const model = GetHashKey(modelName);
  let ped = PlayerPedId();

  if (!DoesEntityExist(ped) || GetEntityModel(ped) !== model) {
    await loadModel(modelName);
    SetPlayerModel(PlayerId(), model);
    SetModelAsNoLongerNeeded(model);
    await clientDelay(0);
    ped = PlayerPedId();
  }

  if (!DoesEntityExist(ped)) throw new Error('The default character could not be created.');

  SetPedDefaultComponentVariation(ped);
  ClearAllPedProps(ped);
  ClearPedTasksImmediately(ped);
  ClearPedBloodDamage(ped);
  ResetPedVisibleDamage(ped);
  ResetEntityAlpha(ped);
  SetEntityVisible(ped, true, false);
  return ped;
}

function createCharacterPreviewCamera(ped: number): void {
  destroyCharacterPreviewCamera(true);
  const p = ClientConfig.characterPreview.position;
  const heading = p.heading * Math.PI / 180;
  const forwardX = -Math.sin(heading);
  const forwardY = Math.cos(heading);
  const cameraX = p.x + forwardX * ClientConfig.characterPreview.cameraDistance;
  const cameraY = p.y + forwardY * ClientConfig.characterPreview.cameraDistance;
  const cameraZ = p.z + ClientConfig.characterPreview.cameraHeight;

  characterPreviewCamera = CreateCamWithParams(
    'DEFAULT_SCRIPTED_CAMERA',
    cameraX,
    cameraY,
    cameraZ,
    0.0,
    0.0,
    0.0,
    ClientConfig.characterPreview.cameraFov,
    true,
    2,
  );

  PointCamAtEntity(characterPreviewCamera, ped, 0.0, 0.0, 0.62, true);
  SetCamActive(characterPreviewCamera, true);
  RenderScriptCams(true, true, 250, true, true);
}

async function prepareCharacterMenuScene(): Promise<void> {
  const token = ++characterSceneToken;
  await ensureScreenVisible();

  const currentPed = PlayerPedId();
  if (DoesEntityExist(currentPed)) {
    ResetEntityAlpha(currentPed);
    SetEntityVisible(currentPed, true, false);
  }

  const ped = await ensureDefaultCharacterModel();
  if (token !== characterSceneToken) return;

  const p = ClientConfig.characterPreview.position;
  RequestCollisionAtCoord(p.x, p.y, p.z);
  SetFocusPosAndVel(p.x, p.y, p.z, 0, 0, 0);
  SetEntityCoordsNoOffset(ped, p.x, p.y, p.z, false, false, false);
  SetEntityHeading(ped, p.heading);
  SetEntityInvincible(ped, true);
  SetEntityCollision(ped, false, false);
  SetEntityVisible(ped, true, false);
  ResetEntityAlpha(ped);
  FreezeEntityPosition(ped, true);
  createCharacterPreviewCamera(ped);

  const started = Date.now();
  while (token === characterSceneToken && !HasCollisionLoadedAroundEntity(ped) && Date.now() - started < ClientConfig.characterSceneCollisionTimeoutMs) {
    await clientDelay(50);
  }
}

function openRegistration(profile: any = {}): void {
  registrationProfile = { ...profile };
  registrationOpen = true;
  selectorOpen = false;
  spawnOpen = false;
  loaded = false;
  void prepareCharacterMenuScene();

  refreshNuiFocus();
  SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
  SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
  SendNuiMessage(JSON.stringify({
    type: 'registration',
    active: true,
    mode: String(profile?.mode ?? 'create'),
    characterId: Number(profile?.characterId ?? 0),
    firstName: String(profile?.firstName ?? ''),
    lastName: String(profile?.lastName ?? ''),
    minimumAge: Number(profile?.minimumAge ?? 18),
  }));
}

function closeRegistration(): void {
  registrationOpen = false;
  SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
  refreshNuiFocus();
}

function openSelector(data: any): void {
  registrationOpen = false;
  spawnOpen = false;
  selectorOpen = true;
  loaded = false;
  void prepareCharacterMenuScene();
  refreshNuiFocus();
  SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
  SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
  SendNuiMessage(JSON.stringify({ type: 'selector', active: true, ...data }));
}

function closeSelector(): void {
  selectorOpen = false;
  SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
  refreshNuiFocus();
}

function openSpawn(data: any): void {
  const spawns = Array.isArray(data?.spawns) ? data.spawns : [];
  availableSpawns = new Map<string, Position>();
  for (const spawn of spawns) {
    const position = spawn?.position;
    if (!position) continue;
    const values = [Number(position.x), Number(position.y), Number(position.z), Number(position.heading)];
    if (values.every(Number.isFinite)) availableSpawns.set(String(spawn.id), { x: values[0], y: values[1], z: values[2], heading: values[3] });
  }
  registrationOpen = false;
  selectorOpen = false;
  spawnOpen = true;
  loaded = false;
  void prepareCharacterMenuScene();
  refreshNuiFocus();
  SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
  SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
  SendNuiMessage(JSON.stringify({
    type: 'spawn',
    active: true,
    spawns,
    forcedHospital: deathState !== 'alive',
  }));
}

function closeSpawn(): void {
  spawnOpen = false;
  SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
  refreshNuiFocus();
}

async function loadModel(modelName: string): Promise<number> {
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

async function spawnCharacter(data: PlayerData, position?: Position, spawnId = 'last'): Promise<void> {
  closeRegistration();
  closeSelector();
  closeSpawn();
  characterSceneToken++;
  destroyCharacterPreviewCamera();
  loaded = false;
  await ensureScreenVisible();

  const model = await loadModel(ClientConfig.characterPreview.model);
  SetPlayerModel(PlayerId(), model);
  SetModelAsNoLongerNeeded(model);

  const ped = PlayerPedId();
  SetPedDefaultComponentVariation(ped);
  ClearAllPedProps(ped);
  ResetEntityAlpha(ped);
  const p = position ?? data.character.position;

  RequestCollisionAtCoord(p.x, p.y, p.z);
  NetworkResurrectLocalPlayer(p.x, p.y, p.z, p.heading, true, false);
  SetEntityCoordsNoOffset(ped, p.x, p.y, p.z, false, false, false);
  SetEntityHeading(ped, p.heading);
  SetEntityVisible(ped, true, false);
  SetEntityCollision(ped, true, true);
  SetEntityHealth(ped, Math.max(100, data.character.health || 200));
  SetPedArmour(ped, Math.max(0, data.character.armor || 0));
  ClearPedTasksImmediately(ped);
  ClearPedBloodDamage(ped);
  SetEntityInvincible(ped, false);
  FreezeEntityPosition(ped, false);
  ClearFocus();

  const collisionStarted = Date.now();
  while (!HasCollisionLoadedAroundEntity(ped) && Date.now() - collisionStarted < ClientConfig.spawnCollisionTimeoutMs) {
    await clientDelay(50);
  }

  playerData = data;
  loaded = true;

  await ensureScreenVisible();

  chat(
    `Welcome, ${data.character.firstName} ${data.character.lastName}. ID: ${data.playerId} | State ID: ${data.character.stateId}`,
    'success',
  );

  emitNet('rumble:player:spawned', spawnId);
}

onNet('rumble:player:loadError', (text: string) => {
  registrationOpen = false;
  selectorOpen = false;
  spawnOpen = false;
  refreshNuiFocus();
  void ensureScreenVisible();
  chat(String(text || 'Character loading failed. Check the server console.'), 'error');
});

onNet('rumble:character:registrationRequired', (profile: any) => {
  openRegistration(profile);
});

onNet('rumble:character:registrationError', (text: string) => {
  SendNuiMessage(JSON.stringify({ type: 'registrationError', message: String(text || 'Could not create the character.') }));
});

onNet('rumble:character:selectorRequired', (data: any) => {
  openSelector(data);
});

onNet('rumble:character:selectorError', (text: string) => {
  SendNuiMessage(JSON.stringify({ type: 'selectorError', message: String(text || 'Could not select the character.') }));
});

RegisterNuiCallbackType('characterCreate');
on('__cfx_nui:characterCreate', (data: any, callback: (response: any) => void) => {
  if (!registrationOpen) {
    callback({ accepted: false });
    return;
  }

  emitNet('rumble:character:createInitial', {
    mode: String(registrationProfile?.mode ?? 'create'),
    characterId: Number(registrationProfile?.characterId ?? 0),
    firstName: String(data?.firstName ?? ''),
    lastName: String(data?.lastName ?? ''),
    dateOfBirth: String(data?.dateOfBirth ?? ''),
  });
  callback({ accepted: true });
});

RegisterNuiCallbackType('characterSelect');
on('__cfx_nui:characterSelect', (data: any, callback: (response: any) => void) => {
  if (!selectorOpen) {
    callback({ accepted: false });
    return;
  }
  const id = Number(data?.id ?? 0);
  if (!Number.isInteger(id) || id <= 0) {
    callback({ accepted: false });
    return;
  }
  emitNet('rumble:character:select', id);
  callback({ accepted: true });
});

RegisterNuiCallbackType('characterNew');
on('__cfx_nui:characterNew', (_data: any, callback: (response: any) => void) => {
  if (!selectorOpen) {
    callback({ accepted: false });
    return;
  }
  openRegistration({ mode: 'create', firstName: '', lastName: '' });
  callback({ accepted: true });
});

RegisterNuiCallbackType('spawnSelect');
on('__cfx_nui:spawnSelect', (data: any, callback: (response: any) => void) => {
  if (!spawnOpen || !playerData) {
    callback({ accepted: false });
    return;
  }
  const id = String(data?.id ?? '');
  if (deathState !== 'alive' && id !== 'hospital') {
    callback({ accepted: false });
    return;
  }
  const position = id === 'last' ? playerData.character.position : availableSpawns.get(id);
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
    void ensureScreenVisible();
    console.error('[rumble] Spawn failed', error);
    chat('Could not spawn. Check the F8 console.', 'error');
  });
});

onNet('rumble:character:selected', (data: any) => {
  playerData = data?.player ?? null;
  inventoryState = Array.isArray(data?.inventory) ? data.inventory : [];
  deathState = String(data?.metadata?.deathState ?? 'alive') as any;
  if (!playerData) return;
  openSpawn(data);
});

onNet('rumble:player:loaded', (data: PlayerData) => {
  playerData = data;
  loaded = true;
  emit('rumble:client:playerLoaded', data);
});

onNet('rumble:money:update', (account: 'cash' | 'card', amount: number) => {
  if (!playerData) return;
  playerData.character[account] = Number(amount);
});

onNet('rumble:inventory:update', (items: any[]) => {
  inventoryState = Array.isArray(items) ? items : [];
  emit('rumble:client:inventoryChanged', inventoryState);
});

onNet('rumble:rpc:response', (requestId: string, ok: boolean, result: any, error: string | null) => {
  const pending = rpcPending.get(String(requestId));
  if (!pending) return;
  clearTimeout(pending.timer);
  rpcPending.delete(String(requestId));
  if (ok) pending.resolve(result);
  else pending.reject(new Error(String(error ?? 'RPC failed')));
});

function rpcCall(name: string, payload: any = null, timeoutMs = 10000): Promise<any> {
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

onNet('rumble:needs:update', (hunger: number, thirst: number, reason?: string) => {
  if (!playerData) return;

  const previousHunger = playerData.character.hunger;
  const previousThirst = playerData.character.thirst;
  playerData.character.hunger = Math.max(0, Math.min(100, Number(hunger)));
  playerData.character.thirst = Math.max(0, Math.min(100, Number(thirst)));

  if (reason === 'decay') {
    const currentHunger = playerData.character.hunger;
    const currentThirst = playerData.character.thirst;

    if (previousHunger > 25 && currentHunger <= 25) chat('You are hungry. Hunger dropped below 25%.', 'info');
    if (previousThirst > 25 && currentThirst <= 25) chat('You are thirsty. Thirst dropped below 25%.', 'info');
    if (previousHunger > 10 && currentHunger <= 10) chat('Critical hunger: below 10%.', 'error');
    if (previousThirst > 10 && currentThirst <= 10) chat('Critical thirst: below 10%.', 'error');
    if (previousHunger > 0 && currentHunger <= 0) chat('Your hunger is empty. You are starting to lose health.', 'error');
    if (previousThirst > 0 && currentThirst <= 0) chat('Your thirst is empty. You are starting to lose health.', 'error');
  }
});

onNet('rumble:needs:damage', (amount: number) => {
  const ped = PlayerPedId();
  if (!DoesEntityExist(ped) || IsEntityDead(ped)) return;

  const damage = Math.max(0, Math.floor(Number(amount)));
  if (damage <= 0) return;

  SetEntityHealth(ped, Math.max(0, GetEntityHealth(ped) - damage));
  syncDeathStateFromPed();
});

onNet('rumble:vitals:set', (vital: 'health' | 'armor', amount: number) => {
  const ped = PlayerPedId();
  if (!DoesEntityExist(ped)) return;

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
  } else if (vital === 'armor') {
    SetPedArmour(ped, Math.max(0, Math.min(100, Math.floor(Number(amount)))));
  }

});

onNet('rumble:admin:fullStats', () => {
  const ped = PlayerPedId();
  if (!DoesEntityExist(ped)) return;

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
  chat('You have been revived.', 'success');
});


onNet('rumble:death:state', (stateInput: string) => {
  const next = String(stateInput);
  if (!['alive', 'downed', 'dead', 'respawning'].includes(next)) return;
  deathState = next as any;
  if (deathState === 'downed') chat('You are downed. If you are not revived, you will become dead.', 'error');
  if (deathState === 'dead') chat('You are dead. You can use /respawn.', 'error');
});

onNet('rumble:death:respawn', (position: Position) => {
  if (!playerData || !position) return;
  deathState = 'respawning';
  void (async () => {
    playerData!.character.health = 200;
    playerData!.character.armor = 0;
    await spawnCharacter(playerData!, position, 'hospital');
    deathState = 'alive';
    emitNet('rumble:death:update', 'alive');
    chat('You respawned at the hospital.', 'success');
  })().catch((error) => console.error('[rumble] Respawn failed', error));
});

function syncDeathStateFromPed(): void {
  if (!loaded || !playerData) return;
  const ped = PlayerPedId();
  if (!DoesEntityExist(ped)) return;
  const dead = IsEntityDead(ped) || GetEntityHealth(ped) <= 0;
  if (dead && deathState === 'alive') {
    deathState = 'downed';
    emitNet('rumble:death:update', 'downed');
  } else if (!dead && deathState !== 'alive' && deathState !== 'respawning') {
    deathState = 'alive';
    emitNet('rumble:death:update', 'alive');
  }
}

let deathCheckQueued = false;
on('gameEventTriggered', (eventName: string, args: any[]) => {
  if (eventName !== 'CEventNetworkEntityDamage' || !loaded || deathCheckQueued) return;
  const victim = Number(args?.[0] ?? 0);
  if (victim !== PlayerPedId()) return;
  deathCheckQueued = true;
  setTimeout(() => {
    deathCheckQueued = false;
    syncDeathStateFromPed();
  }, 0);
});

function getFlyTarget(): number {
  const ped = PlayerPedId();
  const vehicle = GetVehiclePedIsIn(ped, false);

  if (vehicle !== 0 && DoesEntityExist(vehicle) && GetPedInVehicleSeat(vehicle, -1) === ped) {
    return vehicle;
  }

  return ped;
}

function restoreFlyEntity(entity: number): void {
  if (!entity || !DoesEntityExist(entity)) return;
  SetEntityCollision(entity, true, true);
  SetEntityInvincible(entity, false);
  FreezeEntityPosition(entity, false);
  SetEntityVelocity(entity, 0.0, 0.0, 0.0);
}

function updateFlyUi(): void {
  SendNuiMessage(JSON.stringify({
    type: 'fly',
    active: flyEnabled,
    speed: flySpeeds[flySpeedIndex],
  }));
}

function directionFromCamera(): { forward: [number, number, number]; right: [number, number, number] } {
  const [pitch, , yaw] = GetGameplayCamRot(2);
  const pitchRad = pitch * Math.PI / 180.0;
  const yawRad = yaw * Math.PI / 180.0;
  const cosPitch = Math.cos(pitchRad);

  const forward: [number, number, number] = [
    -Math.sin(yawRad) * Math.abs(cosPitch),
    Math.cos(yawRad) * Math.abs(cosPitch),
    Math.sin(pitchRad),
  ];

  const right: [number, number, number] = [
    Math.cos(yawRad),
    Math.sin(yawRad),
    0.0,
  ];

  return { forward, right };
}

function startFly(): void {
  if (flyEnabled) return;
  flyEnabled = true;
  flyEntity = getFlyTarget();
  updateFlyUi();

  chat('Fly enabled. Scroll changes speed; /fly disables it.', 'success');

  flyTick = setTick(() => {
    const nextEntity = getFlyTarget();
    if (nextEntity !== flyEntity) {
      restoreFlyEntity(flyEntity);
      flyEntity = nextEntity;
    }

    if (!flyEntity || !DoesEntityExist(flyEntity)) return;

    SetEntityCollision(flyEntity, false, false);
    SetEntityInvincible(flyEntity, true);
    SetEntityVelocity(flyEntity, 0.0, 0.0, 0.0);

    for (const control of flyControls) DisableControlAction(0, control, true);

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
      dx += forward[0]; dy += forward[1]; dz += forward[2];
    }
    if (IsDisabledControlPressed(0, 33)) {
      dx -= forward[0]; dy -= forward[1]; dz -= forward[2];
    }
    if (IsDisabledControlPressed(0, 35)) {
      dx += right[0]; dy += right[1];
    }
    if (IsDisabledControlPressed(0, 34)) {
      dx -= right[0]; dy -= right[1];
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
      if (IsDisabledControlPressed(0, 21)) speed *= 3.0;
      if (IsDisabledControlPressed(0, 36)) speed *= 0.25;

      const frameScale = Math.max(0.25, Math.min(3.0, GetFrameTime() * 60.0));
      const move = speed * frameScale;

      SetEntityCoordsNoOffset(
        flyEntity,
        x + dx * move,
        y + dy * move,
        z + dz * move,
        false,
        false,
        false,
      );

      const [, , yaw] = GetGameplayCamRot(2);
      SetEntityHeading(flyEntity, yaw);
    }
  });
}

function stopFly(): void {
  if (!flyEnabled) return;
  flyEnabled = false;

  if (flyTick !== null) {
    clearTick(flyTick);
    flyTick = null;
  }

  restoreFlyEntity(flyEntity);
  flyEntity = 0;
  updateFlyUi();
  chat('Fly dezactivat.', 'info');
}

onNet('rumble:admin:toggleFly', () => {
  if (flyEnabled) stopFly();
  else startFly();
});

async function getGroundAtWaypoint(x: number, y: number): Promise<number | null> {
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

    chat(ground !== null ? 'Teleported to waypoint.' : 'Teleported to waypoint; exact ground level was not found.', ground !== null ? 'success' : 'info');
  })().catch((error) => {
    console.error(error);
    ClearFocus();
    DoScreenFadeIn(250);
    chat('Waypoint teleport failed.', 'error');
  });
});


function getControllableEntity(): number {
  const ped = PlayerPedId();
  const vehicle = GetVehiclePedIsIn(ped, false);
  if (vehicle !== 0 && DoesEntityExist(vehicle) && GetPedInVehicleSeat(vehicle, -1) === ped) return vehicle;
  return ped;
}

async function requestEntityControl(entity: number, timeoutMs = 1500): Promise<boolean> {
  if (!entity || !DoesEntityExist(entity)) return false;
  const started = Date.now();
  while (!NetworkHasControlOfEntity(entity) && Date.now() - started < timeoutMs) {
    NetworkRequestControlOfEntity(entity);
    await clientDelay(0);
  }
  return NetworkHasControlOfEntity(entity);
}

onNet('rumble:admin:teleport', (position: Position) => {
  if (!position) return;
  const values = [Number(position.x), Number(position.y), Number(position.z), Number(position.heading ?? 0)];
  if (values.some((value) => !Number.isFinite(value))) return;
  const entity = getControllableEntity();
  RequestCollisionAtCoord(values[0], values[1], values[2]);
  SetEntityCoordsNoOffset(entity, values[0], values[1], values[2], false, false, false);
  SetEntityHeading(entity, values[3]);
  SetEntityVelocity(entity, 0.0, 0.0, 0.0);
});

onNet('rumble:admin:freeze', (enabled: boolean) => {
  const entity = getControllableEntity();
  FreezeEntityPosition(entity, Boolean(enabled));
  chat(Boolean(enabled) ? 'You were frozen by an administrator.' : 'Freeze disabled.', 'info');
});

onNet('rumble:admin:spawnVehicle', (modelName: string) => {
  void (async () => {
    const normalized = String(modelName ?? '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,64}$/.test(normalized)) return chat('Invalid vehicle model.', 'error');
    const model = GetHashKey(normalized);
    if (!IsModelInCdimage(model) || !IsModelAVehicle(model)) return chat('The model is not a valid vehicle.', 'error');
    RequestModel(model);
    const started = Date.now();
    while (!HasModelLoaded(model)) {
      if (Date.now() - started > 10000) return chat('The vehicle model failed to load.', 'error');
      await clientDelay(0);
    }
    const ped = PlayerPedId();
    const [x, y, z] = GetEntityCoords(ped, false);
    const heading = GetEntityHeading(ped);
    const vehicle = CreateVehicle(model, x, y, z + 0.5, heading, true, true);
    if (!vehicle || !DoesEntityExist(vehicle)) return chat('Vehiculul nu a putut fi creat.', 'error');
    SetEntityAsMissionEntity(vehicle, true, true);
    SetVehicleOnGroundProperly(vehicle);
    SetPedIntoVehicle(ped, vehicle, -1);
    SetModelAsNoLongerNeeded(model);
    chat(`Vehicle created: ${normalized}.`, 'success');
  })().catch((error) => chat(`Vehicle spawn error: ${String(error)}`, 'error'));
});

onNet('rumble:admin:deleteVehicle', (radiusInput: number) => {
  void (async () => {
    const ped = PlayerPedId();
    let vehicle = GetVehiclePedIsIn(ped, false);
    if (!vehicle) {
      const [x, y, z] = GetEntityCoords(ped, false);
      const radius = Math.max(1, Math.min(100, Number(radiusInput) || 5));
      vehicle = GetClosestVehicle(x, y, z, radius, 0, 70);
    }
    if (!vehicle || !DoesEntityExist(vehicle)) return chat('There is no vehicle nearby.', 'error');
    if (!await requestEntityControl(vehicle)) return chat('Could not obtain control of the vehicle.', 'error');
    SetEntityAsMissionEntity(vehicle, true, true);
    DeleteEntity(vehicle);
    chat('Vehicle deleted.', 'success');
  })();
});

let spectatingServerId = 0;

onNet('rumble:admin:spectate', (targetServerId: number) => {
  const target = Number(targetServerId);
  if (!Number.isInteger(target) || target <= 0) {
    NetworkSetInSpectatorMode(false, PlayerPedId());
    spectatingServerId = 0;
    chat('Spectate disabled.', 'info');
    return;
  }
  const player = GetPlayerFromServerId(target);
  if (player < 0) return chat('The player is not in scope.', 'error');
  const ped = GetPlayerPed(player);
  if (!ped || !DoesEntityExist(ped)) return chat("The player's ped is not available.", 'error');
  NetworkSetInSpectatorMode(true, ped);
  spectatingServerId = target;
  chat(`Spectate enabled for ID ${target}.`, 'success');
});

onNet('rumble:admin:inspectEntity', () => {
  const [cx, cy, cz] = GetGameplayCamCoord();
  const { forward } = directionFromCamera();
  const distance = 15.0;
  const ray = StartShapeTestRay(
    cx,
    cy,
    cz,
    cx + forward[0] * distance,
    cy + forward[1] * distance,
    cz + forward[2] * distance,
    -1,
    PlayerPedId(),
    0,
  );
  const [, hit, endCoords, , entity] = GetShapeTestResult(ray);
  if (!hit || !entity || !DoesEntityExist(entity)) return chat('There is no entity in front of you.', 'error');
  const model = GetEntityModel(entity);
  const type = GetEntityType(entity);
  const networkId = NetworkGetNetworkIdFromEntity(entity);
  const [x, y, z] = endCoords;
  chat(`Entity ${entity} | type ${type} | model ${model} | net ${networkId} | ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`, 'info');
});

onNet('rumble:admin:vehicleInfo', () => {
  const ped = PlayerPedId();
  const vehicle = GetVehiclePedIsIn(ped, false);
  if (!vehicle || !DoesEntityExist(vehicle)) return chat('You are not in a vehicle.', 'error');
  const model = GetEntityModel(vehicle);
  const plate = GetVehicleNumberPlateText(vehicle).trim();
  const engine = GetVehicleEngineHealth(vehicle);
  const body = GetVehicleBodyHealth(vehicle);
  const fuel = GetVehicleFuelLevel(vehicle);
  chat(`Model ${model} | plate ${plate} | engine ${engine.toFixed(1)} | body ${body.toFixed(1)} | fuel ${fuel.toFixed(1)}`, 'info');
});

async function serverCallback<K extends RumbleCallbackName>(
  name: K,
  payload: RumbleCallbackRequest<K>,
  timeoutMs = 10000,
): Promise<RumbleCallbackResponse<K>> {
  return await rpcCall(name, payload, timeoutMs) as RumbleCallbackResponse<K>;
}

on('onClientResourceStart', (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;


  setTimeout(() => {
    emit('chat:addSuggestion', '/ara', 'Revive all players within 10m, including yourself.');
    emit('chat:addSuggestion', '/fly', 'Enable/disable fly/noclip.');
    emit('chat:addSuggestion', '/gotow', 'Teleport to the waypoint set on the map.');
    emit('chat:addSuggestion', '/tp', 'Teleport la coordonate.', [
      { name: 'x', help: 'Coordonata X' },
      { name: 'y', help: 'Coordonata Y' },
      { name: 'z', help: 'Coordonata Z' },
      { name: 'heading', help: 'Optional heading' },
    ]);
    emit('chat:addSuggestion', '/bring', 'Bring a player to you.', [{ name: 'id', help: 'Permanent ID' }]);
    emit('chat:addSuggestion', '/goto', 'Teleport to a player.', [{ name: 'id', help: 'Permanent ID' }]);
    emit('chat:addSuggestion', '/coords', 'Show current coordinates.');
    emit('chat:addSuggestion', '/heading', 'Show current heading.');
    emit('chat:addSuggestion', '/pos', 'Show position as vector4.');
    emit('chat:addSuggestion', '/vehicle', 'Spawn a vehicle.', [{ name: 'model', help: 'Model GTA' }]);
    emit('chat:addSuggestion', '/dv', 'Delete the current or a nearby vehicle.', [{ name: 'radius', help: '1-100, default 5' }]);
    emit('chat:addSuggestion', '/freeze', 'Freeze/unfreeze a player.', [{ name: 'id', help: 'Permanent ID' }]);
    emit('chat:addSuggestion', '/heal', 'Heal yourself or another player.', [{ name: 'id', help: 'Optional permanent ID' }]);
    emit('chat:addSuggestion', '/revive', 'Revive yourself or another player.', [{ name: 'id', help: 'Optional permanent ID' }]);
    emit('chat:addSuggestion', '/spectate', 'Spectate a player or turn spectate off.', [{ name: 'id/off', help: 'Permanent ID or off' }]);
    emit('chat:addSuggestion', '/entity', 'Inspect the entity in front of the camera.');
    emit('chat:addSuggestion', '/vehinfo', 'Show information about the current vehicle.');
    emit('chat:addSuggestion', '/healthcheck', 'Run the core health check.');
    emit('chat:addSuggestion', '/id', "Show the permanent player ID and the character's State ID.");
    emit('chat:addSuggestion', '/money', 'Show cash and card balance.');
    emit('chat:addSuggestion', '/cash', 'Show cash balance.');
    emit('chat:addSuggestion', '/card', 'Show card balance.');
    emit('chat:addSuggestion', '/stats', 'Show hunger, thirst, health, and armor.');
    emit('chat:addSuggestion', '/fullstats', 'Restore hunger, thirst, health, and armor to maximum.');
    emit('chat:addSuggestion', '/hunger', 'Set hunger to 100%.');
    emit('chat:addSuggestion', '/water', 'Set thirst to 100%.');
    emit('chat:addSuggestion', '/health', 'Set health to maximum.');
    emit('chat:addSuggestion', '/armor', 'Set armor to 100%.');
    emit('chat:addSuggestion', '/chars', 'List your characters.');
    emit('chat:addSuggestion', '/newchar', 'Create and select a character.', [
      { name: 'firstName', help: 'First name' },
      { name: 'lastName', help: 'Last name' },
      { name: 'data', help: 'YYYY-MM-DD' },
    ]);
    emit('chat:addSuggestion', '/switchchar', 'Switch character using the ID from /chars.', [
      { name: 'stateId', help: 'Character State ID' },
    ]);
    emit('chat:addSuggestion', '/characters', 'Open the character selector.');
    emit('chat:addSuggestion', '/inv', 'List inventory in chat.');
    emit('chat:addSuggestion', '/use', 'Use an item.', [{ name: 'item', help: 'water, sandwich, medkit, armor' }]);
    emit('chat:addSuggestion', '/giveitem', 'Add an item to a player.');
    emit('chat:addSuggestion', '/vehicles', 'List owned vehicles.');
    emit('chat:addSuggestion', '/addvehicle', 'Add an owned vehicle to a player.');
    emit('chat:addSuggestion', '/respawn', 'Respawn at the hospital when dead.');

    emitNet('rumble:player:requestLoad');
  }, 1000);
});

on('onClientResourceStop', (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
  stopFly();
  characterSceneToken++;
  destroyCharacterPreviewCamera(true);
  ClearFocus();
  const ped = PlayerPedId();
  if (DoesEntityExist(ped)) {
    ResetEntityAlpha(ped);
    SetEntityVisible(ped, true, false);
    SetEntityInvincible(ped, false);
    SetEntityCollision(ped, true, true);
    FreezeEntityPosition(ped, false);
  }
  if (spectatingServerId) NetworkSetInSpectatorMode(false, ped);
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
exports('Rpc', async (name: string, payload?: any, timeoutMs?: number) => await rpcCall(String(name), payload ?? null, Number(timeoutMs ?? 10000)));
exports('Callback', async (name: RumbleCallbackName, payload?: any, timeoutMs?: number) => await serverCallback(name, payload ?? null, Number(timeoutMs ?? 10000)));

console.log('[rumble] Client script loaded.');
