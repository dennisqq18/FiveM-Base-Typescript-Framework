"use strict";
const PublicWorksConfig = Object.freeze({
    depot: Object.freeze({
        label: 'Municipal Sanitation Center',
        position: Object.freeze({ x: -321.75, y: -1545.94, z: 31.02 }),
        vehicleSpawn: Object.freeze({ x: -334.28, y: -1529.04, z: 27.57, heading: 270.0 }),
        vehicleReturn: Object.freeze({ x: -334.28, y: -1529.04, z: 27.57 }),
    }),
    interactionRadius: 2.2,
    serverValidationRadius: 6.5,
    depotValidationRadius: 12.0,
    actionCooldownMs: 650,
    restartCooldownMs: 8000,
    maximumShiftMs: 90 * 60 * 1000,
    garbage: Object.freeze({
        vehicleModel: 'trash2',
        routeStopCount: 7,
        basePay: 240,
        payPerStop: 95,
        returnBonus: 325,
        minimumCarryMs: 900,
        stops: Object.freeze([
            Object.freeze({ id: 'strawberry-1', label: 'Strawberry Ave', position: Object.freeze({ x: 115.08, y: -1462.14, z: 29.29 }) }),
            Object.freeze({ id: 'grove-1', label: 'Grove Street', position: Object.freeze({ x: -7.44, y: -1565.86, z: 29.21 }) }),
            Object.freeze({ id: 'forum-1', label: 'Forum Drive', position: Object.freeze({ x: -146.72, y: -1726.87, z: 30.36 }) }),
            Object.freeze({ id: 'davis-1', label: 'Davis Avenue', position: Object.freeze({ x: 157.56, y: -1818.78, z: 27.99 }) }),
            Object.freeze({ id: 'rancho-1', label: 'Rancho', position: Object.freeze({ x: 359.14, y: -1810.38, z: 28.97 }) }),
            Object.freeze({ id: 'el-rancho-1', label: 'El Rancho Blvd', position: Object.freeze({ x: 481.08, y: -1278.62, z: 29.61 }) }),
            Object.freeze({ id: 'legion-1', label: 'Legion Square', position: Object.freeze({ x: 255.86, y: -984.26, z: 29.30 }) }),
            Object.freeze({ id: 'mission-row-1', label: 'Mission Row', position: Object.freeze({ x: 127.18, y: -1054.16, z: 29.19 }) }),
            Object.freeze({ id: 'vespucci-1', label: 'Vespucci Blvd', position: Object.freeze({ x: -141.12, y: -1377.26, z: 29.29 }) }),
            Object.freeze({ id: 'little-seoul-1', label: 'Little Seoul', position: Object.freeze({ x: -706.03, y: -915.36, z: 19.21 }) }),
            Object.freeze({ id: 'del-perro-1', label: 'Del Perro', position: Object.freeze({ x: -1223.76, y: -906.18, z: 12.33 }) }),
            Object.freeze({ id: 'morningwood-1', label: 'Morningwood', position: Object.freeze({ x: -1482.02, y: -379.56, z: 40.16 }) }),
            Object.freeze({ id: 'vespucci-beach-1', label: 'Vespucci Beach', position: Object.freeze({ x: -1185.72, y: -1490.43, z: 4.38 }) }),
            Object.freeze({ id: 'la-puerta-1', label: 'La Puerta', position: Object.freeze({ x: -1036.72, y: -1594.87, z: 5.00 }) }),
        ]),
    }),
    sweeper: Object.freeze({
        routeZoneCount: 2,
        basePay: 190,
        payPerPoint: 48,
        returnBonus: 260,
        cleanDurationMs: 5200,
        minimumServerCleanMs: 4200,
        litterModels: Object.freeze(['prop_rub_pile_03', 'prop_rub_pile_04', 'prop_cs_rub_binbag_01']),
        zones: Object.freeze([
            Object.freeze({
                id: 'legion-square',
                label: 'Legion Square',
                points: Object.freeze([
                    Object.freeze({ id: 'legion-a', label: 'North path', position: Object.freeze({ x: 205.50, y: -927.72, z: 30.69 }) }),
                    Object.freeze({ id: 'legion-b', label: 'West path', position: Object.freeze({ x: 190.21, y: -939.46, z: 30.69 }) }),
                    Object.freeze({ id: 'legion-c', label: 'Fountain', position: Object.freeze({ x: 211.30, y: -948.08, z: 30.69 }) }),
                    Object.freeze({ id: 'legion-d', label: 'South path', position: Object.freeze({ x: 225.17, y: -940.48, z: 30.69 }) }),
                    Object.freeze({ id: 'legion-e', label: 'East corner', position: Object.freeze({ x: 228.82, y: -921.81, z: 30.69 }) }),
                ]),
            }),
            Object.freeze({
                id: 'vespucci-promenade',
                label: 'Vespucci Promenade',
                points: Object.freeze([
                    Object.freeze({ id: 'vesp-a', label: 'Promenade 1', position: Object.freeze({ x: -1206.73, y: -1542.06, z: 4.38 }) }),
                    Object.freeze({ id: 'vesp-b', label: 'Promenade 2', position: Object.freeze({ x: -1220.34, y: -1532.79, z: 4.37 }) }),
                    Object.freeze({ id: 'vesp-c', label: 'Promenade 3', position: Object.freeze({ x: -1232.46, y: -1522.64, z: 4.35 }) }),
                    Object.freeze({ id: 'vesp-d', label: 'Promenade 4', position: Object.freeze({ x: -1246.07, y: -1513.64, z: 4.35 }) }),
                    Object.freeze({ id: 'vesp-e', label: 'Promenade 5', position: Object.freeze({ x: -1260.31, y: -1503.42, z: 4.34 }) }),
                ]),
            }),
            Object.freeze({
                id: 'mirror-park',
                label: 'Mirror Park',
                points: Object.freeze([
                    Object.freeze({ id: 'mirror-a', label: 'Park 1', position: Object.freeze({ x: 1070.44, y: -650.16, z: 56.82 }) }),
                    Object.freeze({ id: 'mirror-b', label: 'Park 2', position: Object.freeze({ x: 1083.23, y: -650.02, z: 56.77 }) }),
                    Object.freeze({ id: 'mirror-c', label: 'Park 3', position: Object.freeze({ x: 1093.84, y: -639.50, z: 56.73 }) }),
                    Object.freeze({ id: 'mirror-d', label: 'Park 4', position: Object.freeze({ x: 1086.77, y: -626.28, z: 56.72 }) }),
                    Object.freeze({ id: 'mirror-e', label: 'Park 5', position: Object.freeze({ x: 1072.38, y: -629.92, z: 56.78 }) }),
                ]),
            }),
            Object.freeze({
                id: 'del-perro-walk',
                label: 'Del Perro Promenade',
                points: Object.freeze([
                    Object.freeze({ id: 'del-a', label: 'Sidewalk 1', position: Object.freeze({ x: -1350.50, y: -1212.10, z: 4.71 }) }),
                    Object.freeze({ id: 'del-b', label: 'Sidewalk 2', position: Object.freeze({ x: -1363.72, y: -1222.32, z: 4.70 }) }),
                    Object.freeze({ id: 'del-c', label: 'Sidewalk 3', position: Object.freeze({ x: -1377.18, y: -1231.39, z: 4.70 }) }),
                    Object.freeze({ id: 'del-d', label: 'Sidewalk 4', position: Object.freeze({ x: -1390.02, y: -1240.73, z: 4.68 }) }),
                    Object.freeze({ id: 'del-e', label: 'Sidewalk 5', position: Object.freeze({ x: -1402.58, y: -1249.90, z: 4.67 }) }),
                ]),
            }),
        ]),
    }),
});
const PUBLICWORKS_RESOURCE = GetCurrentResourceName();
const activeJobs = new Map();
const startCooldowns = new Map();
const eventCooldowns = new Map();
let jobSequence = 0;
function coreApi() {
    const api = globalThis.exports?.core;
    if (!api)
        throw new Error('Rumble core is unavailable.');
    return api;
}
function message(source, text, kind = 'info') {
    const prefix = kind === 'error' ? '^1Public Works' : kind === 'success' ? '^2Public Works' : '^3Public Works';
    emitNet('chat:addMessage', source, {
        color: [255, 255, 255],
        multiline: false,
        args: [prefix, text],
    });
}
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function playerPosition(source) {
    if (!GetPlayerName(source))
        return null;
    const ped = GetPlayerPed(source);
    if (!ped || !DoesEntityExist(ped))
        return null;
    const [x, y, z] = GetEntityCoords(ped);
    if (![x, y, z].every(Number.isFinite))
        return null;
    return { x, y, z };
}
function playerNear(source, point, radius) {
    const position = playerPosition(source);
    return Boolean(position && distance(position, point) <= radius);
}
function getGarbageVehicle(session) {
    if (session.type !== 'garbage' || session.vehicleNetId <= 0)
        return 0;
    const vehicle = NetworkGetEntityFromNetworkId(session.vehicleNetId);
    if (!vehicle || !DoesEntityExist(vehicle))
        return 0;
    if (GetEntityModel(vehicle) !== GetHashKey(PublicWorksConfig.garbage.vehicleModel))
        return 0;
    return vehicle;
}
function allowEvent(source, action, cooldown = PublicWorksConfig.actionCooldownMs) {
    const key = `${source}:${action}`;
    const now = Date.now();
    const previous = eventCooldowns.get(key) ?? 0;
    if (now - previous < cooldown)
        return false;
    eventCooldowns.set(key, now);
    return true;
}
function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }
    return result;
}
function buildGarbageRoute() {
    return shuffle(PublicWorksConfig.garbage.stops).slice(0, PublicWorksConfig.garbage.routeStopCount).map((point) => ({
        id: point.id,
        label: point.label,
        position: { ...point.position },
    }));
}
function buildSweeperRoute() {
    const zones = shuffle(PublicWorksConfig.sweeper.zones).slice(0, PublicWorksConfig.sweeper.routeZoneCount);
    const points = [];
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
function emptyBucket() {
    return { shifts: 0, tasks: 0, earnings: 0, xp: 0 };
}
function parseBucket(input) {
    return {
        shifts: Math.max(0, Math.floor(Number(input?.shifts ?? 0))),
        tasks: Math.max(0, Math.floor(Number(input?.tasks ?? 0))),
        earnings: Math.max(0, Math.floor(Number(input?.earnings ?? 0))),
        xp: Math.max(0, Math.floor(Number(input?.xp ?? 0))),
    };
}
function getProgress(source) {
    try {
        const raw = coreApi().GetMetadata(source, 'jobs.publicworks');
        return {
            garbage: parseBucket(raw?.garbage),
            sweeper: parseBucket(raw?.sweeper),
        };
    }
    catch {
        return { garbage: emptyBucket(), sweeper: emptyBucket() };
    }
}
function jobLevel(progress, type) {
    const xp = progress[type].xp;
    return Math.max(1, Math.min(10, Math.floor(xp / 250) + 1));
}
async function saveProgress(source, type, taskCount, pay) {
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
function cleanupSession(source, reason) {
    const session = activeJobs.get(source);
    if (!session)
        return;
    activeJobs.delete(source);
    startCooldowns.set(source, Date.now());
    emitNet('publicworks:cancelled', source, reason ?? 'The shift was stopped.');
}
async function startJob(source, type) {
    if (!allowEvent(source, 'start', 1000))
        return;
    if (type !== 'garbage' && type !== 'sweeper')
        return;
    if (GetResourceState('core') !== 'started')
        return message(source, 'The framework is unavailable.', 'error');
    if (!playerNear(source, PublicWorksConfig.depot.position, PublicWorksConfig.depotValidationRadius)) {
        return message(source, 'You must be at the Municipal Sanitation Center to start a shift.', 'error');
    }
    if (activeJobs.has(source))
        return message(source, 'You already have an active shift. Use /stopjob to stop it.', 'error');
    const lastStop = startCooldowns.get(source) ?? 0;
    if (Date.now() - lastStop < PublicWorksConfig.restartCooldownMs) {
        return message(source, 'Wait a few seconds before starting another shift.', 'error');
    }
    let player;
    try {
        player = coreApi().GetPlayer(source);
    }
    catch {
        player = null;
    }
    if (!player?.character?.id)
        return message(source, 'Your character is not fully loaded.', 'error');
    const progress = getProgress(source);
    const level = jobLevel(progress, type);
    const points = type === 'garbage' ? buildGarbageRoute() : buildSweeperRoute();
    const jobId = `${type}-${Date.now().toString(36)}-${(++jobSequence).toString(36)}`;
    const session = {
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
onNet('publicworks:requestStart', (typeInput) => {
    const source = Number(globalThis.source);
    const type = String(typeInput ?? '').toLowerCase();
    void startJob(source, type).catch((error) => {
        console.error(`[publicworks] start failed for ${source}`, error);
        message(source, 'Could not start the shift.', 'error');
    });
});
onNet('publicworks:vehicleReady', (jobIdInput, netIdInput) => {
    const source = Number(globalThis.source);
    const session = activeJobs.get(source);
    if (!session || session.type !== 'garbage' || session.jobId !== String(jobIdInput ?? '') || session.vehicleNetId !== 0)
        return;
    if (!allowEvent(source, 'vehicleReady', 500))
        return;
    if (!playerNear(source, PublicWorksConfig.depot.position, 35.0))
        return cleanupSession(source, 'The service vehicle was not created correctly.');
    const netId = Math.floor(Number(netIdInput));
    if (!Number.isInteger(netId) || netId <= 0)
        return cleanupSession(source, 'Invalid service vehicle.');
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
onNet('publicworks:vehicleMissing', (jobIdInput) => {
    const source = Number(globalThis.source);
    const session = activeJobs.get(source);
    if (!session || session.type !== 'garbage' || session.jobId !== String(jobIdInput ?? '') || session.vehicleNetId <= 0)
        return;
    if (!allowEvent(source, 'vehicleMissing', 750))
        return;
    if (getGarbageVehicle(session))
        return;
    cleanupSession(source, 'The garbage truck disappeared or was deleted. The shift was cancelled and no payment will be issued.');
});
onNet('publicworks:garbage:pickup', (jobIdInput, stepInput) => {
    const source = Number(globalThis.source);
    const session = activeJobs.get(source);
    const step = Math.floor(Number(stepInput));
    if (!session || session.type !== 'garbage' || session.jobId !== String(jobIdInput ?? '') || session.phase !== 'pickup' || step !== session.step)
        return;
    if (!allowEvent(source, 'garbagePickup'))
        return;
    const point = session.points[session.step];
    if (!point || !playerNear(source, point.position, PublicWorksConfig.serverValidationRadius))
        return;
    if (session.vehicleNetId <= 0)
        return message(source, 'The service vehicle is not synchronized.', 'error');
    if (!getGarbageVehicle(session))
        return cleanupSession(source, 'The garbage truck no longer exists. The shift was cancelled with no payment.');
    session.phase = 'carry';
    session.carriedSince = Date.now();
    session.lastActionAt = Date.now();
    emitNet('publicworks:garbage:carry', source, { step: session.step, point });
});
onNet('publicworks:garbage:deposit', (jobIdInput, stepInput, vehicleNetIdInput) => {
    const source = Number(globalThis.source);
    const session = activeJobs.get(source);
    const step = Math.floor(Number(stepInput));
    const vehicleNetId = Math.floor(Number(vehicleNetIdInput));
    if (!session || session.type !== 'garbage' || session.jobId !== String(jobIdInput ?? '') || session.phase !== 'carry' || step !== session.step)
        return;
    if (!allowEvent(source, 'garbageDeposit'))
        return;
    if (vehicleNetId !== session.vehicleNetId || Date.now() - session.carriedSince < PublicWorksConfig.garbage.minimumCarryMs)
        return;
    const vehicle = getGarbageVehicle(session);
    if (!vehicle)
        return cleanupSession(source, 'The garbage truck no longer exists. The shift was cancelled with no payment.');
    const [vx, vy, vz] = GetEntityCoords(vehicle);
    if (!playerNear(source, { x: vx, y: vy, z: vz }, 8.0))
        return;
    session.step += 1;
    session.carriedSince = 0;
    session.lastActionAt = Date.now();
    if (session.step >= session.points.length) {
        session.phase = 'return';
        emitNet('publicworks:returnToDepot', source, { completed: session.points.length });
    }
    else {
        session.phase = 'pickup';
        emitNet('publicworks:stepAdvanced', source, { step: session.step, completed: session.step, total: session.points.length });
    }
});
onNet('publicworks:sweeper:clean', (jobIdInput, stepInput) => {
    const source = Number(globalThis.source);
    const session = activeJobs.get(source);
    const step = Math.floor(Number(stepInput));
    if (!session || session.type !== 'sweeper' || session.jobId !== String(jobIdInput ?? '') || session.phase !== 'work' || step !== session.step)
        return;
    if (!allowEvent(source, 'sweeperClean'))
        return;
    const point = session.points[session.step];
    if (!point || !playerNear(source, point.position, PublicWorksConfig.serverValidationRadius))
        return;
    const cleanReference = session.step === 0 ? session.startedAt : session.lastActionAt;
    if (Date.now() - cleanReference < PublicWorksConfig.sweeper.minimumServerCleanMs)
        return;
    session.step += 1;
    session.lastActionAt = Date.now();
    if (session.step >= session.points.length) {
        session.phase = 'return';
        emitNet('publicworks:returnToDepot', source, { completed: session.points.length });
    }
    else {
        emitNet('publicworks:stepAdvanced', source, { step: session.step, completed: session.step, total: session.points.length });
    }
});
onNet('publicworks:finish', (jobIdInput) => {
    const source = Number(globalThis.source);
    const session = activeJobs.get(source);
    if (!session || session.jobId !== String(jobIdInput ?? '') || session.phase !== 'return')
        return;
    if (!allowEvent(source, 'finish', 1000))
        return;
    if (!playerNear(source, PublicWorksConfig.depot.position, PublicWorksConfig.depotValidationRadius))
        return;
    if (session.type === 'garbage') {
        const vehicle = getGarbageVehicle(session);
        if (!vehicle)
            return cleanupSession(source, 'The garbage truck no longer exists. The shift was cancelled with no payment.');
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
    session.phase = 'settling';
    void (async () => {
        let paid = false;
        try {
            paid = Boolean(await Promise.resolve(coreApi().AddMoney(source, 'card', pay, `publicworks:${session.type}`)));
        }
        catch (error) {
            console.error(`[publicworks] payout failed for ${source}`, error);
        }
        if (!paid) {
            session.phase = 'return';
            return message(source, 'The payment could not be processed. Try again at the dispatcher.', 'error');
        }
        activeJobs.delete(source);
        startCooldowns.set(source, Date.now());
        let gainedXp = 0;
        let level = session.level;
        try {
            const progress = await saveProgress(source, session.type, session.points.length, pay);
            gainedXp = progress.xp;
            level = progress.level;
        }
        catch (error) {
            console.error(`[publicworks] progress save failed for ${source}`, error);
            message(source, 'Payment was completed, but job progress could not be saved. Check the database.', 'error');
        }
        emitNet('publicworks:finished', source, { type: session.type, pay, gainedXp, level });
        message(source, `Shift completed: $${pay.toLocaleString()} to bank${gainedXp > 0 ? `, +${gainedXp} XP. Level ${level}.` : '.'}`, 'success');
    })().catch((error) => {
        console.error(`[publicworks] finish failed for ${source}`, error);
        if (activeJobs.get(source)?.jobId === session.jobId)
            session.phase = 'return';
        message(source, 'An error occurred while finishing the shift.', 'error');
    });
});
onNet('publicworks:cancelFromClient', () => {
    const source = Number(globalThis.source);
    if (!allowEvent(source, 'cancelFromClient', 1000))
        return;
    if (activeJobs.has(source))
        cleanupSession(source, 'The shift was cancelled because the client could not initialize the job.');
});
RegisterCommand('stopjob', (source) => {
    if (source === 0)
        return;
    if (!activeJobs.has(source))
        return message(source, 'You do not have an active Public Works shift.', 'info');
    cleanupSession(source, 'You stopped the shift. No payment was issued for the incomplete shift.');
}, false);
RegisterCommand('jobstats', (source) => {
    if (source === 0)
        return;
    const progress = getProgress(source);
    const garbageLevel = jobLevel(progress, 'garbage');
    const sweeperLevel = jobLevel(progress, 'sweeper');
    message(source, `Garbage: level ${garbageLevel}, ${progress.garbage.shifts} shifts, ${progress.garbage.tasks} stops, $${progress.garbage.earnings.toLocaleString()} earned.`, 'info');
    message(source, `Cleaning: level ${sweeperLevel}, ${progress.sweeper.shifts} shifts, ${progress.sweeper.tasks} points, $${progress.sweeper.earnings.toLocaleString()} earned.`, 'info');
}, false);
setInterval(() => {
    for (const [source, session] of activeJobs) {
        if (session.type !== 'garbage' || session.vehicleNetId <= 0)
            continue;
        if (!getGarbageVehicle(session))
            cleanupSession(source, 'The garbage truck disappeared or was deleted. The shift was cancelled and no payment will be issued.');
    }
}, 2000);
setInterval(() => {
    const now = Date.now();
    for (const [source, session] of activeJobs) {
        if (now - session.startedAt > PublicWorksConfig.maximumShiftMs) {
            cleanupSession(source, 'The shift expired after exceeding the maximum work time.');
        }
    }
}, 60000);
on('playerDropped', () => {
    const source = Number(globalThis.source);
    activeJobs.delete(source);
    startCooldowns.delete(source);
    for (const key of Array.from(eventCooldowns.keys()))
        if (key.startsWith(`${source}:`))
            eventCooldowns.delete(key);
});
on('rumble:server:playerUnloaded', (sourceInput) => {
    const source = Number(sourceInput);
    if (activeJobs.has(source))
        cleanupSession(source, 'The shift was stopped because you changed character.');
});
on('onResourceStart', (resourceName) => {
    if (resourceName !== PUBLICWORKS_RESOURCE)
        return;
    if (GetResourceState('runtime') === 'started') {
        try {
            globalThis.exports.runtime.RegisterModule('publicworks', '1.0.1', PUBLICWORKS_RESOURCE);
            globalThis.exports.runtime.ReportHealth('publicworks', 'healthy', { activeJobs: activeJobs.size });
        }
        catch { }
    }
    console.log('[publicworks] Advanced garbage + city cleaning jobs loaded.');
});
on('onResourceStop', (resourceName) => {
    if (resourceName !== PUBLICWORKS_RESOURCE)
        return;
    activeJobs.clear();
    eventCooldowns.clear();
});
exports('GetActiveJob', (sourceInput) => {
    const session = activeJobs.get(Number(sourceInput));
    return session ? { type: session.type, phase: session.phase, step: session.step, total: session.points.length, level: session.level } : null;
});
