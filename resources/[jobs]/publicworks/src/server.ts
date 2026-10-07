const PUBLICWORKS_RESOURCE = GetCurrentResourceName();

interface PublicWorksSession {
  source: number;
  jobId: string;
  type: PublicWorksJobType;
  points: PublicWorksPoint[];
  step: number;
  phase: PublicWorksPhase;
  startedAt: number;
  lastActionAt: number;
  carriedSince: number;
  vehicleNetId: number;
  level: number;
}

interface JobProgressBucket {
  shifts: number;
  tasks: number;
  earnings: number;
  xp: number;
}

interface PublicWorksProgress {
  garbage: JobProgressBucket;
  sweeper: JobProgressBucket;
}

const activeJobs = new Map<number, PublicWorksSession>();
const startCooldowns = new Map<number, number>();
const eventCooldowns = new Map<string, number>();
let jobSequence = 0;

function coreApi(): any {
  const api = (globalThis as any).exports?.core;
  if (!api) throw new Error('Rumble core is unavailable.');
  return api;
}

function message(source: number, text: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  const prefix = kind === 'error' ? '^1Public Works' : kind === 'success' ? '^2Public Works' : '^3Public Works';
  emitNet('chat:addMessage', source, {
    color: [255, 255, 255],
    multiline: false,
    args: [prefix, text],
  });
}

function distance(a: PublicWorksPosition, b: PublicWorksPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function playerPosition(source: number): PublicWorksPosition | null {
  if (!GetPlayerName(source)) return null;
  const ped = GetPlayerPed(source);
  if (!ped || !DoesEntityExist(ped)) return null;
  const [x, y, z] = GetEntityCoords(ped);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}

function playerNear(source: number, point: PublicWorksPosition, radius: number): boolean {
  const position = playerPosition(source);
  return Boolean(position && distance(position, point) <= radius);
}

function allowEvent(source: number, action: string, cooldown: number = PublicWorksConfig.actionCooldownMs): boolean {
  const key = `${source}:${action}`;
  const now = Date.now();
  const previous = eventCooldowns.get(key) ?? 0;
  if (now - previous < cooldown) return false;
  eventCooldowns.set(key, now);
  return true;
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function buildGarbageRoute(): PublicWorksPoint[] {
  return shuffle(PublicWorksConfig.garbage.stops).slice(0, PublicWorksConfig.garbage.routeStopCount).map((point) => ({
    id: point.id,
    label: point.label,
    position: { ...point.position },
  }));
}

function buildSweeperRoute(): PublicWorksPoint[] {
  const zones = shuffle(PublicWorksConfig.sweeper.zones).slice(0, PublicWorksConfig.sweeper.routeZoneCount);
  const points: PublicWorksPoint[] = [];
  for (const zone of zones) {
    for (const point of zone.points) {
      points.push({
        id: point.id,
        label: `${zone.label} - ${point.label}`,
        position: { ...point.position },
      });
    }
  }
  return points;
}

function emptyBucket(): JobProgressBucket {
  return { shifts: 0, tasks: 0, earnings: 0, xp: 0 };
}

function parseBucket(input: any): JobProgressBucket {
  return {
    shifts: Math.max(0, Math.floor(Number(input?.shifts ?? 0))),
    tasks: Math.max(0, Math.floor(Number(input?.tasks ?? 0))),
    earnings: Math.max(0, Math.floor(Number(input?.earnings ?? 0))),
    xp: Math.max(0, Math.floor(Number(input?.xp ?? 0))),
  };
}

function getProgress(source: number): PublicWorksProgress {
  try {
    const raw = coreApi().GetMetadata(source, 'jobs.publicworks');
    return {
      garbage: parseBucket(raw?.garbage),
      sweeper: parseBucket(raw?.sweeper),
    };
  } catch {
    return { garbage: emptyBucket(), sweeper: emptyBucket() };
  }
}

function jobLevel(progress: PublicWorksProgress, type: PublicWorksJobType): number {
  const xp = progress[type].xp;
  return Math.max(1, Math.min(10, Math.floor(xp / 250) + 1));
}

async function saveProgress(source: number, type: PublicWorksJobType, taskCount: number, pay: number): Promise<{ xp: number; level: number }> {
  const progress = getProgress(source);
  const bucket = progress[type];
  const gainedXp = taskCount * 12 + 30;
  bucket.shifts += 1;
  bucket.tasks += taskCount;
  bucket.earnings += pay;
  bucket.xp += gainedXp;
  await Promise.resolve(coreApi().SetMetadata(source, 'jobs.publicworks', progress));
  return { xp: gainedXp, level: jobLevel(progress, type) };
}

function cleanupSession(source: number, reason?: string): void {
  const session = activeJobs.get(source);
  if (!session) return;
  activeJobs.delete(source);
  startCooldowns.set(source, Date.now());
  emitNet('publicworks:cancelled', source, reason ?? 'The shift was stopped.');
}

async function startJob(source: number, type: PublicWorksJobType): Promise<void> {
  if (!allowEvent(source, 'start', 1000)) return;
  if (type !== 'garbage' && type !== 'sweeper') return;
  if (GetResourceState('core') !== 'started') return message(source, 'The framework is unavailable.', 'error');
  if (!playerNear(source, PublicWorksConfig.depot.position, PublicWorksConfig.depotValidationRadius)) {
    return message(source, 'You must be at the Municipal Sanitation Center to start a shift.', 'error');
  }
  if (activeJobs.has(source)) return message(source, 'You already have an active shift. Use /stopjob to stop it.', 'error');
  const lastStop = startCooldowns.get(source) ?? 0;
  if (Date.now() - lastStop < PublicWorksConfig.restartCooldownMs) {
    return message(source, 'Wait a few seconds before starting another shift.', 'error');
  }

  let player: any;
  try {
    player = coreApi().GetPlayer(source);
  } catch {
    player = null;
  }
  if (!player?.character?.id) return message(source, 'Your character is not fully loaded.', 'error');

  const progress = getProgress(source);
  const level = jobLevel(progress, type);
  const points = type === 'garbage' ? buildGarbageRoute() : buildSweeperRoute();
  const jobId = `${type}-${Date.now().toString(36)}-${(++jobSequence).toString(36)}`;
  const session: PublicWorksSession = {
    source,
    jobId,
    type,
    points,
    step: 0,
    phase: type === 'garbage' ? 'pickup' : 'work',
    startedAt: Date.now(),
    lastActionAt: Date.now(),
    carriedSince: 0,
    vehicleNetId: 0,
    level,
  };
  activeJobs.set(source, session);

  emitNet('publicworks:jobStarted', source, {
    jobId,
    type,
    points,
    level,
    depot: PublicWorksConfig.depot,
    vehicleModel: type === 'garbage' ? PublicWorksConfig.garbage.vehicleModel : null,
    cleanDurationMs: PublicWorksConfig.sweeper.cleanDurationMs,
  });
  message(source, type === 'garbage'
    ? `Garbage collection shift started. You have ${points.length} stops. Job level: ${level}.`
    : `City cleaning shift started. You have ${points.length} physical cleanup points. Job level: ${level}.`, 'success');
}

onNet('publicworks:requestStart', (typeInput: string) => {
  const source = Number((globalThis as any).source);
  const type = String(typeInput ?? '').toLowerCase() as PublicWorksJobType;
  void startJob(source, type).catch((error) => {
    console.error(`[publicworks] start failed for ${source}`, error);
    message(source, 'Could not start the shift.', 'error');
  });
});

onNet('publicworks:vehicleReady', (jobIdInput: string, netIdInput: number) => {
  const source = Number((globalThis as any).source);
  const session = activeJobs.get(source);
  if (!session || session.type !== 'garbage' || session.jobId !== String(jobIdInput ?? '') || session.vehicleNetId !== 0) return;
  if (!allowEvent(source, 'vehicleReady', 500)) return;
  if (!playerNear(source, PublicWorksConfig.depot.position, 35.0)) return cleanupSession(source, 'The service vehicle was not created correctly.');

  const netId = Math.floor(Number(netIdInput));
  if (!Number.isInteger(netId) || netId <= 0) return cleanupSession(source, 'Invalid service vehicle.');
  const entity = NetworkGetEntityFromNetworkId(netId);
  if (!entity || !DoesEntityExist(entity) || GetEntityModel(entity) !== GetHashKey(PublicWorksConfig.garbage.vehicleModel)) {
    return cleanupSession(source, 'The service vehicle could not be validated.');
  }
  const [vehicleX, vehicleY, vehicleZ] = GetEntityCoords(entity);
  if (distance({ x: vehicleX, y: vehicleY, z: vehicleZ }, PublicWorksConfig.depot.vehicleSpawn) > 20.0) {
    return cleanupSession(source, 'The service vehicle was created outside the authorized area.');
  }
  session.vehicleNetId = netId;
  session.lastActionAt = Date.now();
});

onNet('publicworks:garbage:pickup', (jobIdInput: string, stepInput: number) => {
  const source = Number((globalThis as any).source);
  const session = activeJobs.get(source);
  const step = Math.floor(Number(stepInput));
  if (!session || session.type !== 'garbage' || session.jobId !== String(jobIdInput ?? '') || session.phase !== 'pickup' || step !== session.step) return;
  if (!allowEvent(source, 'garbagePickup')) return;
  const point = session.points[session.step];
  if (!point || !playerNear(source, point.position, PublicWorksConfig.serverValidationRadius)) return;
  if (session.vehicleNetId <= 0) return message(source, 'The service vehicle is not synchronized.', 'error');

  session.phase = 'carry';
  session.carriedSince = Date.now();
  session.lastActionAt = Date.now();
  emitNet('publicworks:garbage:carry', source, { step: session.step, point });
});

onNet('publicworks:garbage:deposit', (jobIdInput: string, stepInput: number, vehicleNetIdInput: number) => {
  const source = Number((globalThis as any).source);
  const session = activeJobs.get(source);
  const step = Math.floor(Number(stepInput));
  const vehicleNetId = Math.floor(Number(vehicleNetIdInput));
  if (!session || session.type !== 'garbage' || session.jobId !== String(jobIdInput ?? '') || session.phase !== 'carry' || step !== session.step) return;
  if (!allowEvent(source, 'garbageDeposit')) return;
  if (vehicleNetId !== session.vehicleNetId || Date.now() - session.carriedSince < PublicWorksConfig.garbage.minimumCarryMs) return;

  const vehicle = NetworkGetEntityFromNetworkId(session.vehicleNetId);
  if (!vehicle || !DoesEntityExist(vehicle)) return cleanupSession(source, 'The garbage truck no longer exists. The shift was cancelled.');
  const [vx, vy, vz] = GetEntityCoords(vehicle);
  if (!playerNear(source, { x: vx, y: vy, z: vz }, 8.0)) return;

  session.step += 1;
  session.carriedSince = 0;
  session.lastActionAt = Date.now();
  if (session.step >= session.points.length) {
    session.phase = 'return';
    emitNet('publicworks:returnToDepot', source, { completed: session.points.length });
  } else {
    session.phase = 'pickup';
    emitNet('publicworks:stepAdvanced', source, { step: session.step, completed: session.step, total: session.points.length });
  }
});

onNet('publicworks:sweeper:clean', (jobIdInput: string, stepInput: number) => {
  const source = Number((globalThis as any).source);
  const session = activeJobs.get(source);
  const step = Math.floor(Number(stepInput));
  if (!session || session.type !== 'sweeper' || session.jobId !== String(jobIdInput ?? '') || session.phase !== 'work' || step !== session.step) return;
  if (!allowEvent(source, 'sweeperClean')) return;
  const point = session.points[session.step];
  if (!point || !playerNear(source, point.position, PublicWorksConfig.serverValidationRadius)) return;
  const cleanReference = session.step === 0 ? session.startedAt : session.lastActionAt;
  if (Date.now() - cleanReference < PublicWorksConfig.sweeper.minimumServerCleanMs) return;

  session.step += 1;
  session.lastActionAt = Date.now();
  if (session.step >= session.points.length) {
    session.phase = 'return';
    emitNet('publicworks:returnToDepot', source, { completed: session.points.length });
  } else {
    emitNet('publicworks:stepAdvanced', source, { step: session.step, completed: session.step, total: session.points.length });
  }
});

onNet('publicworks:finish', (jobIdInput: string) => {
  const source = Number((globalThis as any).source);
  const session = activeJobs.get(source);
  if (!session || session.jobId !== String(jobIdInput ?? '') || session.phase !== 'return') return;
  if (!allowEvent(source, 'finish', 1000)) return;
  if (!playerNear(source, PublicWorksConfig.depot.position, PublicWorksConfig.depotValidationRadius)) return;

  if (session.type === 'garbage') {
    const vehicle = NetworkGetEntityFromNetworkId(session.vehicleNetId);
    if (!vehicle || !DoesEntityExist(vehicle)) return message(source, 'You must return the garbage truck.', 'error');
    const [vx, vy, vz] = GetEntityCoords(vehicle);
    if (distance({ x: vx, y: vy, z: vz }, PublicWorksConfig.depot.vehicleReturn) > 20.0) {
      return message(source, 'Park the garbage truck in the return area.', 'error');
    }
  }

  const base = session.type === 'garbage' ? PublicWorksConfig.garbage.basePay : PublicWorksConfig.sweeper.basePay;
  const perTask = session.type === 'garbage' ? PublicWorksConfig.garbage.payPerStop : PublicWorksConfig.sweeper.payPerPoint;
  const returnBonus = session.type === 'garbage' ? PublicWorksConfig.garbage.returnBonus : PublicWorksConfig.sweeper.returnBonus;
  const levelMultiplier = 1 + Math.min(0.225, (session.level - 1) * 0.025);
  const gross = base + session.points.length * perTask + returnBonus;
  const pay = Math.floor(gross * levelMultiplier);

  // Lock the finished shift before awaiting I/O. This prevents duplicate finish events
  // from ever paying the same route twice when the DB is slow.
  session.phase = 'settling';

  void (async () => {
    let paid = false;
    try {
      paid = Boolean(await Promise.resolve(coreApi().AddMoney(source, 'card', pay, `publicworks:${session.type}`)));
    } catch (error) {
      console.error(`[publicworks] payout failed for ${source}`, error);
    }

    if (!paid) {
      session.phase = 'return';
      return message(source, 'The payment could not be processed. Try again at the dispatcher.', 'error');
    }

    // Money is already committed at this point, so the active shift must be closed
    // even if optional progression metadata has a temporary database failure.
    activeJobs.delete(source);
    startCooldowns.set(source, Date.now());

    let gainedXp = 0;
    let level = session.level;
    try {
      const progress = await saveProgress(source, session.type, session.points.length, pay);
      gainedXp = progress.xp;
      level = progress.level;
    } catch (error) {
      console.error(`[publicworks] progress save failed for ${source}`, error);
      message(source, 'Payment was completed, but job progress could not be saved. Check the database.', 'error');
    }

    emitNet('publicworks:finished', source, { type: session.type, pay, gainedXp, level });
    message(source, `Shift completed: $${pay.toLocaleString()} to bank${gainedXp > 0 ? `, +${gainedXp} XP. Level ${level}.` : '.'}`, 'success');
  })().catch((error) => {
    console.error(`[publicworks] finish failed for ${source}`, error);
    if (activeJobs.get(source)?.jobId === session.jobId) session.phase = 'return';
    message(source, 'An error occurred while finishing the shift.', 'error');
  });
});

onNet('publicworks:cancelFromClient', () => {
  const source = Number((globalThis as any).source);
  if (!allowEvent(source, 'cancelFromClient', 1000)) return;
  if (activeJobs.has(source)) cleanupSession(source, 'The shift was cancelled because the client could not initialize the job.');
});

RegisterCommand('stopjob', (source) => {
  if (source === 0) return;
  if (!activeJobs.has(source)) return message(source, 'You do not have an active Public Works shift.', 'info');
  cleanupSession(source, 'You stopped the shift. No payment was issued for the incomplete shift.');
}, false);

RegisterCommand('jobstats', (source) => {
  if (source === 0) return;
  const progress = getProgress(source);
  const garbageLevel = jobLevel(progress, 'garbage');
  const sweeperLevel = jobLevel(progress, 'sweeper');
  message(source, `Garbage: level ${garbageLevel}, ${progress.garbage.shifts} shifts, ${progress.garbage.tasks} stops, $${progress.garbage.earnings.toLocaleString()} earned.`, 'info');
  message(source, `Cleaning: level ${sweeperLevel}, ${progress.sweeper.shifts} shifts, ${progress.sweeper.tasks} points, $${progress.sweeper.earnings.toLocaleString()} earned.`, 'info');
}, false);

setInterval(() => {
  const now = Date.now();
  for (const [source, session] of activeJobs) {
    if (now - session.startedAt > PublicWorksConfig.maximumShiftMs) {
      cleanupSession(source, 'The shift expired after exceeding the maximum work time.');
    }
  }
}, 60000);

on('playerDropped', () => {
  const source = Number((globalThis as any).source);
  activeJobs.delete(source);
  startCooldowns.delete(source);
  for (const key of Array.from(eventCooldowns.keys())) if (key.startsWith(`${source}:`)) eventCooldowns.delete(key);
});

on('rumble:server:playerUnloaded', (sourceInput: number) => {
  const source = Number(sourceInput);
  if (activeJobs.has(source)) cleanupSession(source, 'The shift was stopped because you changed character.');
});

on('onResourceStart', (resourceName: string) => {
  if (resourceName !== PUBLICWORKS_RESOURCE) return;
  if (GetResourceState('runtime') === 'started') {
    try {
      (globalThis as any).exports.runtime.RegisterModule('publicworks', '1.0.0', PUBLICWORKS_RESOURCE);
      (globalThis as any).exports.runtime.ReportHealth('publicworks', 'healthy', { activeJobs: activeJobs.size });
    } catch {}
  }
  console.log('[publicworks] Advanced garbage + city cleaning jobs loaded.');
});

on('onResourceStop', (resourceName: string) => {
  if (resourceName !== PUBLICWORKS_RESOURCE) return;
  activeJobs.clear();
  eventCooldowns.clear();
});

exports('GetActiveJob', (sourceInput: number) => {
  const session = activeJobs.get(Number(sourceInput));
  return session ? { type: session.type, phase: session.phase, step: session.step, total: session.points.length, level: session.level } : null;
});
