const PUBLICWORKS_CLIENT_RESOURCE = GetCurrentResourceName();
const CONTROL_INTERACT = 38; // E
const CONTROL_SECONDARY = 47; // G

interface ClientPublicWorksJob {
  jobId: string;
  type: PublicWorksJobType;
  points: PublicWorksPoint[];
  step: number;
  phase: PublicWorksPhase;
  level: number;
  truck: number;
  routeBlip: number;
  truckBlip: number;
  bagObject: number;
  garbageObjects: Map<string, number>;
  litterObjects: Map<string, number>;
  busy: boolean;
  pendingSince: number;
  cleanDurationMs: number;
}

let activeJob: ClientPublicWorksJob | null = null;
let depotBlip = 0;
let interactionTimer: ReturnType<typeof setTimeout> | null = null;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function chat(text: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  const prefix = kind === 'error' ? '^1Public Works' : kind === 'success' ? '^2Public Works' : '^3Public Works';
  emit('chat:addMessage', {
    color: [255, 255, 255],
    multiline: false,
    args: [prefix, text],
  });
}

function distanceTo(position: PublicWorksPosition): number {
  const [x, y, z] = GetEntityCoords(PlayerPedId(), false);
  return Math.hypot(x - position.x, y - position.y, z - position.z);
}

function drawPrompt(text: string, y = 0.88): void {
  SetTextFont(4);
  SetTextScale(0.0, 0.42);
  SetTextColour(255, 255, 255, 235);
  SetTextCentre(true);
  SetTextOutline();
  BeginTextCommandDisplayText('STRING');
  AddTextComponentSubstringPlayerName(text);
  EndTextCommandDisplayText(0.5, y);
}

function drawWorkMarker(position: PublicWorksPosition, scale = 0.75): void {
  DrawMarker(2, position.x, position.y, position.z + 0.25, 0, 0, 0, 0, 180, 0, scale, scale, scale, 80, 180, 255, 170, false, true, 2, false, null, null, false);
}

function createNamedBlip(position: PublicWorksPosition, name: string, sprite: number, color: number, route = false): number {
  const blip = AddBlipForCoord(position.x, position.y, position.z);
  SetBlipSprite(blip, sprite);
  SetBlipColour(blip, color);
  SetBlipScale(blip, 0.82);
  SetBlipAsShortRange(blip, !route);
  SetBlipRoute(blip, route);
  BeginTextCommandSetBlipName('STRING');
  AddTextComponentString(name);
  EndTextCommandSetBlipName(blip);
  return blip;
}

function removeBlipSafe(blip: number): void {
  if (blip && DoesBlipExist(blip)) RemoveBlip(blip);
}

async function loadModel(modelName: string, timeoutMs = 10000): Promise<number> {
  const hash = GetHashKey(modelName);
  if (!IsModelInCdimage(hash)) throw new Error(`Model invalid: ${modelName}`);
  RequestModel(hash);
  const started = Date.now();
  while (!HasModelLoaded(hash)) {
    if (Date.now() - started > timeoutMs) throw new Error(`Model timeout: ${modelName}`);
    await delay(25);
  }
  return hash;
}

async function loadAnimDict(dict: string, timeoutMs = 5000): Promise<boolean> {
  RequestAnimDict(dict);
  const started = Date.now();
  while (!HasAnimDictLoaded(dict)) {
    if (Date.now() - started > timeoutMs) return false;
    await delay(25);
  }
  return true;
}

async function requestControl(entity: number, timeoutMs = 1200): Promise<boolean> {
  if (!entity || !DoesEntityExist(entity)) return false;
  const started = Date.now();
  while (!NetworkHasControlOfEntity(entity) && Date.now() - started < timeoutMs) {
    NetworkRequestControlOfEntity(entity);
    await delay(25);
  }
  return NetworkHasControlOfEntity(entity);
}

function updateRouteBlip(): void {
  const job = activeJob;
  if (!job) return;
  removeBlipSafe(job.routeBlip);
  job.routeBlip = 0;

  if (job.phase === 'return') {
    job.routeBlip = createNamedBlip(PublicWorksConfig.depot.position, 'Return to Public Works', 1, 5, true);
    return;
  }

  if (job.phase === 'carry') return;
  const point = job.points[job.step];
  if (!point) return;
  job.routeBlip = createNamedBlip(point.position, point.label, job.type === 'garbage' ? 318 : 280, job.type === 'garbage' ? 2 : 25, true);
}

async function spawnGarbageTruck(job: ClientPublicWorksJob): Promise<void> {
  const model = await loadModel(PublicWorksConfig.garbage.vehicleModel);
  const spawn = PublicWorksConfig.depot.vehicleSpawn;
  const vehicle = CreateVehicle(model, spawn.x, spawn.y, spawn.z, Number(spawn.heading ?? 0), true, true);
  SetModelAsNoLongerNeeded(model);
  if (!vehicle || !DoesEntityExist(vehicle)) throw new Error('The garbage truck could not be created.');

  SetEntityAsMissionEntity(vehicle, true, true);
  SetVehicleOnGroundProperly(vehicle);
  SetVehicleNumberPlateText(vehicle, `PW${String(Date.now()).slice(-6)}`);
  const netId = NetworkGetNetworkIdFromEntity(vehicle);
  if (!netId) throw new Error('The garbage truck did not receive a network ID.');
  SetNetworkIdCanMigrate(netId, true);
  job.truck = vehicle;
  job.truckBlip = AddBlipForEntity(vehicle);
  SetBlipSprite(job.truckBlip, 67);
  SetBlipColour(job.truckBlip, 2);
  SetBlipScale(job.truckBlip, 0.78);
  BeginTextCommandSetBlipName('STRING');
  AddTextComponentString('Public Works Garbage Truck');
  EndTextCommandSetBlipName(job.truckBlip);
  emitNet('publicworks:vehicleReady', job.jobId, netId);
  chat('The garbage truck is ready. GPS is routing you to the first stop.', 'success');
}

async function spawnGarbageRouteProps(job: ClientPublicWorksJob): Promise<void> {
  const hash = await loadModel('prop_cs_rub_binbag_01');
  for (const point of job.points) {
    if (activeJob?.jobId !== job.jobId) break;
    const object = CreateObject(hash, point.position.x, point.position.y, point.position.z + 0.12, false, false, false);
    if (!object || !DoesEntityExist(object)) continue;
    PlaceObjectOnGroundProperly(object);
    FreezeEntityPosition(object, true);
    SetEntityCollision(object, true, true);
    job.garbageObjects.set(point.id, object);
  }
  SetModelAsNoLongerNeeded(hash);
}

async function spawnLitter(job: ClientPublicWorksJob): Promise<void> {
  const models = PublicWorksConfig.sweeper.litterModels;
  const hashes = new Map<string, number>();
  for (const modelName of models) hashes.set(modelName, await loadModel(modelName));

  for (let index = 0; index < job.points.length; index++) {
    if (activeJob?.jobId !== job.jobId) break;
    const point = job.points[index];
    const modelName = models[index % models.length];
    const hash = hashes.get(modelName)!;
    const object = CreateObject(hash, point.position.x, point.position.y, point.position.z + 0.15, false, false, false);
    if (!object || !DoesEntityExist(object)) continue;
    PlaceObjectOnGroundProperly(object);
    FreezeEntityPosition(object, true);
    SetEntityCollision(object, true, true);
    job.litterObjects.set(point.id, object);
  }
  for (const hash of hashes.values()) SetModelAsNoLongerNeeded(hash);
}

async function createGarbageBag(job: ClientPublicWorksJob): Promise<void> {
  if (job.bagObject && DoesEntityExist(job.bagObject)) DeleteEntity(job.bagObject);
  const ped = PlayerPedId();
  const hash = await loadModel('prop_cs_rub_binbag_01');
  const [x, y, z] = GetEntityCoords(ped, false);
  const bag = CreateObject(hash, x, y, z, false, false, false);
  SetModelAsNoLongerNeeded(hash);
  if (bag && DoesEntityExist(bag)) {
    AttachEntityToEntity(bag, ped, GetPedBoneIndex(ped, 57005), 0.12, 0.0, -0.05, 220.0, 120.0, 0.0, true, true, false, true, 1, true);
    job.bagObject = bag;
  }
  if (await loadAnimDict('missfbi4prepp1')) {
    TaskPlayAnim(ped, 'missfbi4prepp1', '_idle_garbage_man', 8.0, -8.0, -1, 49, 0, false, false, false);
  }
}

function clearGarbageBag(job: ClientPublicWorksJob): void {
  ClearPedTasks(PlayerPedId());
  if (job.bagObject && DoesEntityExist(job.bagObject)) DeleteEntity(job.bagObject);
  job.bagObject = 0;
  RemoveAnimDict('missfbi4prepp1');
}

function deleteGarbagePoint(job: ClientPublicWorksJob, pointId: string): void {
  const object = job.garbageObjects.get(pointId);
  if (object && DoesEntityExist(object)) DeleteEntity(object);
  job.garbageObjects.delete(pointId);
}

function deleteLitterPoint(job: ClientPublicWorksJob, pointId: string): void {
  const object = job.litterObjects.get(pointId);
  if (object && DoesEntityExist(object)) DeleteEntity(object);
  job.litterObjects.delete(pointId);
}

async function runSweepAnimation(job: ClientPublicWorksJob): Promise<void> {
  if (job.busy || job.phase !== 'work') return;
  const point = job.points[job.step];
  if (!point || distanceTo(point.position) > PublicWorksConfig.interactionRadius + 0.8) return;

  job.busy = true;
  const jobId = job.jobId;
  const step = job.step;
  const ped = PlayerPedId();
  FreezeEntityPosition(ped, true);
  TaskStartScenarioInPlace(ped, 'WORLD_HUMAN_JANITOR', 0, true);
  chat('Cleaning the area... stay in position until the task is complete.', 'info');
  await delay(job.cleanDurationMs);
  ClearPedTasks(ped);
  FreezeEntityPosition(ped, false);

  if (!activeJob || activeJob.jobId !== jobId || activeJob.step !== step || activeJob.phase !== 'work') return;
  activeJob.pendingSince = Date.now();
  emitNet('publicworks:sweeper:clean', jobId, step);
}

async function cleanupClientJob(deleteVehicle = true): Promise<void> {
  const job = activeJob;
  activeJob = null;
  if (!job) return;
  removeBlipSafe(job.routeBlip);
  removeBlipSafe(job.truckBlip);
  clearGarbageBag(job);
  for (const object of job.garbageObjects.values()) if (object && DoesEntityExist(object)) DeleteEntity(object);
  job.garbageObjects.clear();
  for (const object of job.litterObjects.values()) if (object && DoesEntityExist(object)) DeleteEntity(object);
  job.litterObjects.clear();
  FreezeEntityPosition(PlayerPedId(), false);
  ClearPedTasks(PlayerPedId());

  if (deleteVehicle && job.truck && DoesEntityExist(job.truck)) {
    await requestControl(job.truck);
    if (DoesEntityExist(job.truck)) {
      SetEntityAsMissionEntity(job.truck, true, true);
      DeleteEntity(job.truck);
    }
  }
}

onNet('publicworks:jobStarted', (payload: any) => {
  void (async () => {
    await cleanupClientJob(true);
    const type = String(payload?.type ?? '') as PublicWorksJobType;
    const points = Array.isArray(payload?.points) ? payload.points as PublicWorksPoint[] : [];
    if ((type !== 'garbage' && type !== 'sweeper') || points.length === 0) return;

    const job: ClientPublicWorksJob = {
      jobId: String(payload.jobId ?? ''),
      type,
      points,
      step: 0,
      phase: type === 'garbage' ? 'pickup' : 'work',
      level: Math.max(1, Number(payload?.level ?? 1)),
      truck: 0,
      routeBlip: 0,
      truckBlip: 0,
      bagObject: 0,
      garbageObjects: new Map(),
      litterObjects: new Map(),
      busy: false,
      pendingSince: 0,
      cleanDurationMs: Math.max(1000, Number(payload?.cleanDurationMs ?? PublicWorksConfig.sweeper.cleanDurationMs)),
    };
    activeJob = job;
    if (type === 'garbage') {
      await Promise.all([spawnGarbageTruck(job), spawnGarbageRouteProps(job)]);
    } else {
      await spawnLitter(job);
    }
    if (activeJob?.jobId === job.jobId) updateRouteBlip();
  })().catch((error) => {
    console.error('[publicworks] Failed to initialize job', error);
    chat('The shift could not be initialized and was cancelled.', 'error');
    emitNet('publicworks:cancelFromClient');
    void cleanupClientJob(true);
  });
});

onNet('publicworks:garbage:carry', (payload: any) => {
  const job = activeJob;
  if (!job || job.type !== 'garbage' || job.step !== Number(payload?.step)) return;
  job.phase = 'carry';
  deleteGarbagePoint(job, job.points[job.step]?.id ?? '');
  job.busy = false;
  job.pendingSince = 0;
  removeBlipSafe(job.routeBlip);
  job.routeBlip = 0;
  void createGarbageBag(job).catch((error) => console.error('[publicworks] bag animation failed', error));
  chat('You picked up the bag. Take it to the rear of the garbage truck.', 'info');
});

onNet('publicworks:stepAdvanced', (payload: any) => {
  const job = activeJob;
  if (!job) return;
  const nextStep = Number(payload?.step);
  if (!Number.isInteger(nextStep) || nextStep < 0 || nextStep > job.points.length) return;
  if (job.type === 'garbage') clearGarbageBag(job);
  if (job.type === 'sweeper' && nextStep > 0) deleteLitterPoint(job, job.points[nextStep - 1]?.id ?? '');
  job.step = nextStep;
  job.phase = job.type === 'garbage' ? 'pickup' : 'work';
  job.busy = false;
  job.pendingSince = 0;
  updateRouteBlip();
  chat(`Progress: ${Math.min(nextStep, job.points.length)}/${job.points.length}. The next point is on your GPS.`, 'success');
});

onNet('publicworks:returnToDepot', () => {
  const job = activeJob;
  if (!job) return;
  if (job.type === 'garbage') clearGarbageBag(job);
  if (job.type === 'sweeper') {
    for (const object of job.litterObjects.values()) if (object && DoesEntityExist(object)) DeleteEntity(object);
    job.litterObjects.clear();
  }
  job.step = job.points.length;
  job.phase = 'return';
  job.busy = false;
  job.pendingSince = 0;
  updateRouteBlip();
  chat(job.type === 'garbage'
    ? 'The route is complete. Return the garbage truck to the depot to get paid.'
    : 'All cleanup areas are complete. Return to the depot to get paid.', 'success');
});

onNet('publicworks:finished', (payload: any) => {
  const pay = Number(payload?.pay ?? 0);
  const gainedXp = Number(payload?.gainedXp ?? 0);
  const level = Number(payload?.level ?? 1);
  chat(`Payment received: $${pay.toLocaleString()} | +${gainedXp} XP | level ${level}.`, 'success');
  void cleanupClientJob(true);
});

onNet('publicworks:cancelled', (reason: string) => {
  chat(String(reason ?? 'The shift was stopped.'), 'error');
  void cleanupClientJob(true);
});

function handleInteraction(): number {
  const ped = PlayerPedId();
  if (!ped || !DoesEntityExist(ped)) return 1000;
  const job = activeJob;

  if (!job) {
    const depotDistance = distanceTo(PublicWorksConfig.depot.position);
    if (depotDistance > 70.0) return 1000;
    if (depotDistance < 35.0) drawWorkMarker(PublicWorksConfig.depot.position, 0.9);
    if (depotDistance <= PublicWorksConfig.interactionRadius) {
      drawPrompt('~g~[E]~s~ Advanced garbage collection   ~b~[G]~s~ Street sweeping');
      if (IsControlJustPressed(0, CONTROL_INTERACT)) emitNet('publicworks:requestStart', 'garbage');
      else if (IsControlJustPressed(0, CONTROL_SECONDARY)) emitNet('publicworks:requestStart', 'sweeper');
    }
    return depotDistance < 45.0 ? 0 : 350;
  }

  if (job.pendingSince && Date.now() - job.pendingSince > 5000) {
    job.busy = false;
    job.pendingSince = 0;
  }

  if (job.phase === 'return') {
    const depotDistance = distanceTo(PublicWorksConfig.depot.position);
    if (depotDistance < 35.0) drawWorkMarker(PublicWorksConfig.depot.position, 1.0);
    if (depotDistance <= PublicWorksConfig.interactionRadius + 1.0) {
      drawPrompt(job.type === 'garbage' ? '~g~[E]~s~ Return the garbage truck and collect payment' : '~g~[E]~s~ Finish the shift and collect payment');
      if (IsControlJustPressed(0, CONTROL_INTERACT) && !job.busy) {
        job.busy = true;
        job.pendingSince = Date.now();
        emitNet('publicworks:finish', job.jobId);
      }
    }
    return depotDistance < 45.0 ? 0 : 300;
  }

  if (job.type === 'garbage' && job.phase === 'carry') {
    if (!job.truck || !DoesEntityExist(job.truck)) {
      drawPrompt('The garbage truck is missing. Use /stopjob.', 0.86);
      return 300;
    }
    const [x, y, z] = GetOffsetFromEntityInWorldCoords(job.truck, 0.0, -4.15, 0.0);
    const rear = { x, y, z };
    const rearDistance = distanceTo(rear);
    if (rearDistance < 25.0) drawWorkMarker(rear, 0.65);
    if (rearDistance <= PublicWorksConfig.interactionRadius + 0.7) {
      drawPrompt('~g~[E]~s~ Throw the bag into the garbage truck');
      if (IsControlJustPressed(0, CONTROL_INTERACT) && !job.busy) {
        job.busy = true;
        job.pendingSince = Date.now();
        emitNet('publicworks:garbage:deposit', job.jobId, job.step, NetworkGetNetworkIdFromEntity(job.truck));
      }
    }
    return rearDistance < 30.0 ? 0 : 250;
  }

  const point = job.points[job.step];
  if (!point) return 500;
  const pointDistance = distanceTo(point.position);
  if (pointDistance < 35.0) drawWorkMarker(point.position, 0.7);
  if (pointDistance <= PublicWorksConfig.interactionRadius + 0.4) {
    if (job.type === 'garbage') {
      drawPrompt(`~g~[E]~s~ Pick up the bag (${job.step + 1}/${job.points.length})`);
      if (IsControlJustPressed(0, CONTROL_INTERACT) && !job.busy) {
        job.busy = true;
        job.pendingSince = Date.now();
        emitNet('publicworks:garbage:pickup', job.jobId, job.step);
      }
    } else {
      drawPrompt(`~g~[E]~s~ Sweep the litter (${job.step + 1}/${job.points.length})`);
      if (IsControlJustPressed(0, CONTROL_INTERACT) && !job.busy) void runSweepAnimation(job);
    }
  }
  return pointDistance < 45.0 ? 0 : 300;
}

function scheduleInteractionLoop(delayMs = 0): void {
  if (interactionTimer) clearTimeout(interactionTimer);
  interactionTimer = setTimeout(() => {
    interactionTimer = null;
    let next = 1000;
    try {
      next = handleInteraction();
    } catch (error) {
      console.error('[publicworks] interaction loop', error);
      next = 1000;
    }
    scheduleInteractionLoop(next);
  }, Math.max(0, delayMs));
}

on('onClientResourceStart', (resourceName: string) => {
  if (resourceName !== PUBLICWORKS_CLIENT_RESOURCE) return;
  if (!depotBlip || !DoesBlipExist(depotBlip)) {
    depotBlip = createNamedBlip(PublicWorksConfig.depot.position, PublicWorksConfig.depot.label, 318, 5, false);
  }
  emit('chat:addSuggestion', '/stopjob', 'Stop the active Public Works shift.');
  emit('chat:addSuggestion', '/jobstats', 'Show your Public Works progress and job levels.');
  scheduleInteractionLoop(250);
});

on('onClientResourceStop', (resourceName: string) => {
  if (resourceName !== PUBLICWORKS_CLIENT_RESOURCE) return;
  if (interactionTimer) clearTimeout(interactionTimer);
  interactionTimer = null;
  removeBlipSafe(depotBlip);
  depotBlip = 0;
  void cleanupClientJob(true);
});

exports('GetActiveJob', () => activeJob ? {
  type: activeJob.type,
  step: activeJob.step,
  total: activeJob.points.length,
  phase: activeJob.phase,
  level: activeJob.level,
} : null);
