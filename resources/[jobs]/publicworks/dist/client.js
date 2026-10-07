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
const PUBLICWORKS_CLIENT_RESOURCE = GetCurrentResourceName();
const CONTROL_INTERACT = 38;
const CONTROL_SECONDARY = 47;
let activeJob = null;
let depotBlip = 0;
let interactionTimer = null;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function chat(text, kind = 'info') {
    const prefix = kind === 'error' ? '^1Public Works' : kind === 'success' ? '^2Public Works' : '^3Public Works';
    emit('chat:addMessage', {
        color: [255, 255, 255],
        multiline: false,
        args: [prefix, text],
    });
}
function distanceTo(position) {
    const [x, y, z] = GetEntityCoords(PlayerPedId(), false);
    return Math.hypot(x - position.x, y - position.y, z - position.z);
}
function drawPrompt(text, y = 0.88) {
    SetTextFont(4);
    SetTextScale(0.0, 0.42);
    SetTextColour(255, 255, 255, 235);
    SetTextCentre(true);
    SetTextOutline();
    BeginTextCommandDisplayText('STRING');
    AddTextComponentSubstringPlayerName(text);
    EndTextCommandDisplayText(0.5, y);
}
function drawWorkMarker(position, scale = 0.75) {
    DrawMarker(2, position.x, position.y, position.z + 0.25, 0, 0, 0, 0, 180, 0, scale, scale, scale, 80, 180, 255, 170, false, true, 2, false, null, null, false);
}
function createNamedBlip(position, name, sprite, color, route = false) {
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
function removeBlipSafe(blip) {
    if (blip && DoesBlipExist(blip))
        RemoveBlip(blip);
}
async function loadModel(modelName, timeoutMs = 10000) {
    const hash = GetHashKey(modelName);
    if (!IsModelInCdimage(hash))
        throw new Error(`Model invalid: ${modelName}`);
    RequestModel(hash);
    const started = Date.now();
    while (!HasModelLoaded(hash)) {
        if (Date.now() - started > timeoutMs)
            throw new Error(`Model timeout: ${modelName}`);
        await delay(25);
    }
    return hash;
}
async function loadAnimDict(dict, timeoutMs = 5000) {
    RequestAnimDict(dict);
    const started = Date.now();
    while (!HasAnimDictLoaded(dict)) {
        if (Date.now() - started > timeoutMs)
            return false;
        await delay(25);
    }
    return true;
}
async function requestControl(entity, timeoutMs = 1200) {
    if (!entity || !DoesEntityExist(entity))
        return false;
    const started = Date.now();
    while (!NetworkHasControlOfEntity(entity) && Date.now() - started < timeoutMs) {
        NetworkRequestControlOfEntity(entity);
        await delay(25);
    }
    return NetworkHasControlOfEntity(entity);
}
function updateRouteBlip() {
    const job = activeJob;
    if (!job)
        return;
    removeBlipSafe(job.routeBlip);
    job.routeBlip = 0;
    if (job.phase === 'return') {
        job.routeBlip = createNamedBlip(PublicWorksConfig.depot.position, 'Return to Public Works', 1, 5, true);
        return;
    }
    if (job.phase === 'carry')
        return;
    const point = job.points[job.step];
    if (!point)
        return;
    job.routeBlip = createNamedBlip(point.position, point.label, job.type === 'garbage' ? 318 : 280, job.type === 'garbage' ? 2 : 25, true);
}
async function spawnGarbageTruck(job) {
    var _a;
    const model = await loadModel(PublicWorksConfig.garbage.vehicleModel);
    const spawn = PublicWorksConfig.depot.vehicleSpawn;
    const vehicle = CreateVehicle(model, spawn.x, spawn.y, spawn.z, Number((_a = spawn.heading) !== null && _a !== void 0 ? _a : 0), true, true);
    SetModelAsNoLongerNeeded(model);
    if (!vehicle || !DoesEntityExist(vehicle))
        throw new Error('The garbage truck could not be created.');
    SetEntityAsMissionEntity(vehicle, true, true);
    SetVehicleOnGroundProperly(vehicle);
    SetVehicleNumberPlateText(vehicle, `PW${String(Date.now()).slice(-6)}`);
    const netId = NetworkGetNetworkIdFromEntity(vehicle);
    if (!netId)
        throw new Error('The garbage truck did not receive a network ID.');
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
async function spawnGarbageRouteProps(job) {
    const hash = await loadModel('prop_cs_rub_binbag_01');
    for (const point of job.points) {
        if ((activeJob === null || activeJob === void 0 ? void 0 : activeJob.jobId) !== job.jobId)
            break;
        const object = CreateObject(hash, point.position.x, point.position.y, point.position.z + 0.12, false, false, false);
        if (!object || !DoesEntityExist(object))
            continue;
        PlaceObjectOnGroundProperly(object);
        FreezeEntityPosition(object, true);
        SetEntityCollision(object, true, true);
        job.garbageObjects.set(point.id, object);
    }
    SetModelAsNoLongerNeeded(hash);
}
async function spawnLitter(job) {
    const models = PublicWorksConfig.sweeper.litterModels;
    const hashes = new Map();
    for (const modelName of models)
        hashes.set(modelName, await loadModel(modelName));
    for (let index = 0; index < job.points.length; index++) {
        if ((activeJob === null || activeJob === void 0 ? void 0 : activeJob.jobId) !== job.jobId)
            break;
        const point = job.points[index];
        const modelName = models[index % models.length];
        const hash = hashes.get(modelName);
        const object = CreateObject(hash, point.position.x, point.position.y, point.position.z + 0.15, false, false, false);
        if (!object || !DoesEntityExist(object))
            continue;
        PlaceObjectOnGroundProperly(object);
        FreezeEntityPosition(object, true);
        SetEntityCollision(object, true, true);
        job.litterObjects.set(point.id, object);
    }
    for (const hash of hashes.values())
        SetModelAsNoLongerNeeded(hash);
}
async function createGarbageBag(job) {
    if (job.bagObject && DoesEntityExist(job.bagObject))
        DeleteEntity(job.bagObject);
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
function clearGarbageBag(job) {
    ClearPedTasks(PlayerPedId());
    if (job.bagObject && DoesEntityExist(job.bagObject))
        DeleteEntity(job.bagObject);
    job.bagObject = 0;
    RemoveAnimDict('missfbi4prepp1');
}
function deleteGarbagePoint(job, pointId) {
    const object = job.garbageObjects.get(pointId);
    if (object && DoesEntityExist(object))
        DeleteEntity(object);
    job.garbageObjects.delete(pointId);
}
function deleteLitterPoint(job, pointId) {
    const object = job.litterObjects.get(pointId);
    if (object && DoesEntityExist(object))
        DeleteEntity(object);
    job.litterObjects.delete(pointId);
}
async function runSweepAnimation(job) {
    if (job.busy || job.phase !== 'work')
        return;
    const point = job.points[job.step];
    if (!point || distanceTo(point.position) > PublicWorksConfig.interactionRadius + 0.8)
        return;
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
    if (!activeJob || activeJob.jobId !== jobId || activeJob.step !== step || activeJob.phase !== 'work')
        return;
    activeJob.pendingSince = Date.now();
    emitNet('publicworks:sweeper:clean', jobId, step);
}
async function cleanupClientJob(deleteVehicle = true) {
    const job = activeJob;
    activeJob = null;
    if (!job)
        return;
    removeBlipSafe(job.routeBlip);
    removeBlipSafe(job.truckBlip);
    clearGarbageBag(job);
    for (const object of job.garbageObjects.values())
        if (object && DoesEntityExist(object))
            DeleteEntity(object);
    job.garbageObjects.clear();
    for (const object of job.litterObjects.values())
        if (object && DoesEntityExist(object))
            DeleteEntity(object);
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
onNet('publicworks:jobStarted', (payload) => {
    void (async () => {
        var _a, _b, _c, _d;
        await cleanupClientJob(true);
        const type = String((_a = payload === null || payload === void 0 ? void 0 : payload.type) !== null && _a !== void 0 ? _a : '');
        const points = Array.isArray(payload === null || payload === void 0 ? void 0 : payload.points) ? payload.points : [];
        if ((type !== 'garbage' && type !== 'sweeper') || points.length === 0)
            return;
        const job = {
            jobId: String((_b = payload.jobId) !== null && _b !== void 0 ? _b : ''),
            type,
            points,
            step: 0,
            phase: type === 'garbage' ? 'pickup' : 'work',
            level: Math.max(1, Number((_c = payload === null || payload === void 0 ? void 0 : payload.level) !== null && _c !== void 0 ? _c : 1)),
            truck: 0,
            routeBlip: 0,
            truckBlip: 0,
            bagObject: 0,
            garbageObjects: new Map(),
            litterObjects: new Map(),
            busy: false,
            pendingSince: 0,
            cleanDurationMs: Math.max(1000, Number((_d = payload === null || payload === void 0 ? void 0 : payload.cleanDurationMs) !== null && _d !== void 0 ? _d : PublicWorksConfig.sweeper.cleanDurationMs)),
        };
        activeJob = job;
        if (type === 'garbage') {
            await Promise.all([spawnGarbageTruck(job), spawnGarbageRouteProps(job)]);
        }
        else {
            await spawnLitter(job);
        }
        if ((activeJob === null || activeJob === void 0 ? void 0 : activeJob.jobId) === job.jobId)
            updateRouteBlip();
    })().catch((error) => {
        console.error('[publicworks] Failed to initialize job', error);
        chat('The shift could not be initialized and was cancelled.', 'error');
        emitNet('publicworks:cancelFromClient');
        void cleanupClientJob(true);
    });
});
onNet('publicworks:garbage:carry', (payload) => {
    var _a, _b;
    const job = activeJob;
    if (!job || job.type !== 'garbage' || job.step !== Number(payload === null || payload === void 0 ? void 0 : payload.step))
        return;
    job.phase = 'carry';
    deleteGarbagePoint(job, (_b = (_a = job.points[job.step]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : '');
    job.busy = false;
    job.pendingSince = 0;
    removeBlipSafe(job.routeBlip);
    job.routeBlip = 0;
    void createGarbageBag(job).catch((error) => console.error('[publicworks] bag animation failed', error));
    chat('You picked up the bag. Take it to the rear of the garbage truck.', 'info');
});
onNet('publicworks:stepAdvanced', (payload) => {
    var _a, _b;
    const job = activeJob;
    if (!job)
        return;
    const nextStep = Number(payload === null || payload === void 0 ? void 0 : payload.step);
    if (!Number.isInteger(nextStep) || nextStep < 0 || nextStep > job.points.length)
        return;
    if (job.type === 'garbage')
        clearGarbageBag(job);
    if (job.type === 'sweeper' && nextStep > 0)
        deleteLitterPoint(job, (_b = (_a = job.points[nextStep - 1]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : '');
    job.step = nextStep;
    job.phase = job.type === 'garbage' ? 'pickup' : 'work';
    job.busy = false;
    job.pendingSince = 0;
    updateRouteBlip();
    chat(`Progress: ${Math.min(nextStep, job.points.length)}/${job.points.length}. The next point is on your GPS.`, 'success');
});
onNet('publicworks:returnToDepot', () => {
    const job = activeJob;
    if (!job)
        return;
    if (job.type === 'garbage')
        clearGarbageBag(job);
    if (job.type === 'sweeper') {
        for (const object of job.litterObjects.values())
            if (object && DoesEntityExist(object))
                DeleteEntity(object);
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
onNet('publicworks:finished', (payload) => {
    var _a, _b, _c;
    const pay = Number((_a = payload === null || payload === void 0 ? void 0 : payload.pay) !== null && _a !== void 0 ? _a : 0);
    const gainedXp = Number((_b = payload === null || payload === void 0 ? void 0 : payload.gainedXp) !== null && _b !== void 0 ? _b : 0);
    const level = Number((_c = payload === null || payload === void 0 ? void 0 : payload.level) !== null && _c !== void 0 ? _c : 1);
    chat(`Payment received: $${pay.toLocaleString()} | +${gainedXp} XP | level ${level}.`, 'success');
    void cleanupClientJob(true);
});
onNet('publicworks:cancelled', (reason) => {
    chat(String(reason !== null && reason !== void 0 ? reason : 'The shift was stopped.'), 'error');
    void cleanupClientJob(true);
});
function handleInteraction() {
    const ped = PlayerPedId();
    if (!ped || !DoesEntityExist(ped))
        return 1000;
    const job = activeJob;
    if (!job) {
        const depotDistance = distanceTo(PublicWorksConfig.depot.position);
        if (depotDistance > 70.0)
            return 1000;
        if (depotDistance < 35.0)
            drawWorkMarker(PublicWorksConfig.depot.position, 0.9);
        if (depotDistance <= PublicWorksConfig.interactionRadius) {
            drawPrompt('~g~[E]~s~ Advanced garbage collection   ~b~[G]~s~ Street sweeping');
            if (IsControlJustPressed(0, CONTROL_INTERACT))
                emitNet('publicworks:requestStart', 'garbage');
            else if (IsControlJustPressed(0, CONTROL_SECONDARY))
                emitNet('publicworks:requestStart', 'sweeper');
        }
        return depotDistance < 45.0 ? 0 : 350;
    }
    if (job.pendingSince && Date.now() - job.pendingSince > 5000) {
        job.busy = false;
        job.pendingSince = 0;
    }
    if (job.phase === 'return') {
        const depotDistance = distanceTo(PublicWorksConfig.depot.position);
        if (depotDistance < 35.0)
            drawWorkMarker(PublicWorksConfig.depot.position, 1.0);
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
        if (rearDistance < 25.0)
            drawWorkMarker(rear, 0.65);
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
    if (!point)
        return 500;
    const pointDistance = distanceTo(point.position);
    if (pointDistance < 35.0)
        drawWorkMarker(point.position, 0.7);
    if (pointDistance <= PublicWorksConfig.interactionRadius + 0.4) {
        if (job.type === 'garbage') {
            drawPrompt(`~g~[E]~s~ Pick up the bag (${job.step + 1}/${job.points.length})`);
            if (IsControlJustPressed(0, CONTROL_INTERACT) && !job.busy) {
                job.busy = true;
                job.pendingSince = Date.now();
                emitNet('publicworks:garbage:pickup', job.jobId, job.step);
            }
        }
        else {
            drawPrompt(`~g~[E]~s~ Sweep the litter (${job.step + 1}/${job.points.length})`);
            if (IsControlJustPressed(0, CONTROL_INTERACT) && !job.busy)
                void runSweepAnimation(job);
        }
    }
    return pointDistance < 45.0 ? 0 : 300;
}
function scheduleInteractionLoop(delayMs = 0) {
    if (interactionTimer)
        clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => {
        interactionTimer = null;
        let next = 1000;
        try {
            next = handleInteraction();
        }
        catch (error) {
            console.error('[publicworks] interaction loop', error);
            next = 1000;
        }
        scheduleInteractionLoop(next);
    }, Math.max(0, delayMs));
}
on('onClientResourceStart', (resourceName) => {
    if (resourceName !== PUBLICWORKS_CLIENT_RESOURCE)
        return;
    if (!depotBlip || !DoesBlipExist(depotBlip)) {
        depotBlip = createNamedBlip(PublicWorksConfig.depot.position, PublicWorksConfig.depot.label, 318, 5, false);
    }
    emit('chat:addSuggestion', '/stopjob', 'Stop the active Public Works shift.');
    emit('chat:addSuggestion', '/jobstats', 'Show your Public Works progress and job levels.');
    scheduleInteractionLoop(250);
});
on('onClientResourceStop', (resourceName) => {
    if (resourceName !== PUBLICWORKS_CLIENT_RESOURCE)
        return;
    if (interactionTimer)
        clearTimeout(interactionTimer);
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
