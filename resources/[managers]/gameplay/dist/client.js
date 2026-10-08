"use strict";
const GameplayConfig = Object.freeze({
    actions: Object.freeze({
        monitorIntervalMs: 125,
        handsUp: Object.freeze({
            command: 'rumble_handsup',
            key: 'X',
            description: 'Hold X to keep your hands up',
            animDict: 'random@mugging3',
            animName: 'handsup_standing_base',
            blendInSpeed: 8.0,
            blendOutSpeed: -8.0,
            flags: 49,
            animCheckIntervalMs: 375
        }),
        pointing: Object.freeze({
            command: 'rumble_point_hold_v2',
            key: 'B',
            description: 'Hold B to point with your finger',
            animDict: 'anim@mp_point',
            taskName: 'task_mp_pointing',
            signalIntervalMs: 34,
            collisionProbeIntervalMs: 170
        })
    }),
    crouch: Object.freeze({
        leftCommand: 'rumble_crouch_left',
        rightCommand: 'rumble_crouch_right',
        leftKey: 'LCONTROL',
        rightKey: 'RCONTROL',
        description: 'Roleplay crouch (Left CTRL)',
        alternateDescription: 'Roleplay crouch (Right CTRL)',
        movementClipset: 'move_ped_crouched',
        strafeClipset: 'move_ped_crouched_strafing',
        blendInSpeed: 0.25,
        blendOutSpeed: 0.25
    }),
    combat: Object.freeze({
        sprintMeleeMinimumSpeed: 1.75
    }),
    cameraZoom: Object.freeze({
        enabled: true,
        zoomInCommand: 'rumble_camera_zoom_in',
        zoomOutCommand: 'rumble_camera_zoom_out',
        zoomInDescription: 'Zoom camera in while unarmed',
        zoomOutDescription: 'Zoom camera out while unarmed'
    }),
    world: Object.freeze({
        disableWantedSystem: true,
        disableAmbientPolice: true,
        passiveAmbientNpcs: true,
        firearmDamageTypes: Object.freeze([3, 4]),
        npcReactionCooldownMs: 350,
        npcFleeDistance: 120.0,
        npcFleeDurationMs: 15000,
        networkControlTimeoutMs: 120
    })
});
;
"use strict";
const PASSIVE_NPC_RELATIONSHIP_GROUPS = Object.freeze([
    'HATES_PLAYER',
    'AMBIENT_GANG_LOST',
    'AMBIENT_GANG_MEXICAN',
    'AMBIENT_GANG_FAMILY',
    'AMBIENT_GANG_BALLAS',
    'AMBIENT_GANG_MARABUNTE',
    'AMBIENT_GANG_CULT',
    'AMBIENT_GANG_SALVA',
    'AMBIENT_GANG_WEICHENG',
    'AMBIENT_GANG_HILLBILLY'
]);
const npcReactionTimes = new Map();
const gameplayDelay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
function applyPassiveNpcPolicy(player) {
    SetPlayerCanBeHassledByGangs(player, false);
    SetIgnoreLowPriorityShockingEvents(player, true);
    const playerGroup = GetHashKey('PLAYER');
    for (const groupName of PASSIVE_NPC_RELATIONSHIP_GROUPS) {
        const group = GetHashKey(groupName);
        SetRelationshipBetweenGroups(2, group, playerGroup);
        SetRelationshipBetweenGroups(2, playerGroup, group);
    }
}
function applyWorldPolicy() {
    const player = PlayerId();
    if (GameplayConfig.world.disableWantedSystem) {
        SetMaxWantedLevel(0);
        ClearPlayerWantedLevel(player);
        SetPlayerWantedLevel(player, 0, false);
        SetPlayerWantedLevelNow(player, false);
    }
    if (GameplayConfig.world.disableAmbientPolice) {
        SetPoliceIgnorePlayer(player, true);
        SetDispatchCopsForPlayer(player, false);
        SetCreateRandomCops(false);
        SetCreateRandomCopsNotOnScenarios(false);
        SetCreateRandomCopsOnScenarios(false);
        for (let service = 1; service <= 15; service++) {
            EnableDispatchService(service, false);
        }
    }
    if (GameplayConfig.world.passiveAmbientNpcs) {
        applyPassiveNpcPolicy(player);
    }
}
async function requestNpcControl(ped) {
    if (!NetworkGetEntityIsNetworked(ped) || NetworkHasControlOfEntity(ped))
        return;
    const deadline = Date.now() + GameplayConfig.world.networkControlTimeoutMs;
    NetworkRequestControlOfEntity(ped);
    while (!NetworkHasControlOfEntity(ped) && Date.now() < deadline) {
        await gameplayDelay(20);
        NetworkRequestControlOfEntity(ped);
    }
}
function canReactToNpcDamage(ped) {
    var _a;
    if (!ped || !DoesEntityExist(ped) || !IsEntityAPed(ped) || IsPedAPlayer(ped) || IsEntityDead(ped))
        return false;
    const now = Date.now();
    const last = (_a = npcReactionTimes.get(ped)) !== null && _a !== void 0 ? _a : 0;
    if (now - last < GameplayConfig.world.npcReactionCooldownMs)
        return false;
    npcReactionTimes.set(ped, now);
    if (npcReactionTimes.size > 256) {
        for (const [entity, timestamp] of npcReactionTimes) {
            if (!DoesEntityExist(entity) || now - timestamp > 30000)
                npcReactionTimes.delete(entity);
        }
    }
    return true;
}
async function reactToPlayerDamage(victim, weaponHash) {
    if (!canReactToNpcDamage(victim))
        return;
    const playerPed = PlayerPedId();
    await requestNpcControl(victim);
    if (!DoesEntityExist(victim) || IsEntityDead(victim))
        return;
    const damageType = GetWeaponDamageType(weaponHash);
    const wasShot = GameplayConfig.world.firearmDamageTypes.includes(damageType);
    ClearPedTasks(victim);
    if (wasShot) {
        SetBlockingOfNonTemporaryEvents(victim, false);
        TaskCombatPed(victim, playerPed, 0, 16);
        return;
    }
    SetBlockingOfNonTemporaryEvents(victim, true);
    TaskSmartFleePed(victim, playerPed, GameplayConfig.world.npcFleeDistance, GameplayConfig.world.npcFleeDurationMs, false, false);
    setTimeout(() => {
        if (DoesEntityExist(victim) && !IsEntityDead(victim)) {
            SetBlockingOfNonTemporaryEvents(victim, false);
        }
    }, GameplayConfig.world.npcFleeDurationMs);
}
on('entityDamaged', (victim, culprit, weapon) => {
    if (!GameplayConfig.world.passiveAmbientNpcs)
        return;
    if (culprit !== PlayerPedId())
        return;
    void reactToPlayerDamage(Number(victim), Number(weapon));
});
;
"use strict";
let handsUp = false;
let pointing = false;
let pointingStarting = false;
let crouched = false;
let sprintGuardHeld = false;
let sprintCombatActive = false;
let sprintProbeTimer = null;
let actionMonitorTimer = null;
let pointingSignalTimer = null;
let handsUpToken = 0;
let pointingToken = 0;
let crouchToken = 0;
let actionTick = null;
let pointingPed = 0;
let pointingStartedAt = 0;
let lastPointingShapeAt = 0;
let lastPointingBlocked = false;
let pointingShapeHandle = 0;
let lastHandsUpAnimCheckAt = 0;
let lastPerfSampleSentAt = 0;
const actionDelay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clampGameplayValue = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const unarmedWeaponHash = GetHashKey('WEAPON_UNARMED');
const localPlayerId = PlayerId();
const ACTION_COMBAT_CONTROLS = Object.freeze([24, 25, 140, 141, 142, 257]);
const SPRINT_MELEE_CONTROLS = Object.freeze([24, 140, 141, 142, 257]);
const gameplayPerf = {
    windowStartedAt: Date.now(),
    callbacks: 0,
    busyMs: 0,
    maxMs: 0,
    sampledCallbacks: 0,
};
const beginSampledGameplayWork = (sampleEvery = 64) => {
    gameplayPerf.callbacks++;
    gameplayPerf.sampledCallbacks++;
    return gameplayPerf.sampledCallbacks % sampleEvery === 0 ? Date.now() : -1;
};
const finishSampledGameplayWork = (startedAt, sampleEvery = 64) => {
    if (startedAt < 0)
        return;
    const duration = Math.max(0, Date.now() - startedAt);
    gameplayPerf.busyMs += duration * sampleEvery;
    gameplayPerf.maxMs = Math.max(gameplayPerf.maxMs, duration);
};
const recordGameplayCallback = () => {
    gameplayPerf.callbacks++;
};
const flushGameplayPerf = (force = false) => {
    const now = Date.now();
    if (gameplayPerf.callbacks <= 0)
        return;
    if (!force && now - lastPerfSampleSentAt < 5000)
        return;
    const windowMs = Math.max(1, now - gameplayPerf.windowStartedAt);
    emitNet('rumble:observability:clientResourceSample', {
        resource: GetCurrentResourceName(),
        windowMs,
        callbacks: gameplayPerf.callbacks,
        busyMs: Number(gameplayPerf.busyMs.toFixed(3)),
        maxCallbackMs: Number(gameplayPerf.maxMs.toFixed(3)),
        active: handsUp || pointing || crouched || sprintCombatActive,
    });
    gameplayPerf.windowStartedAt = now;
    gameplayPerf.callbacks = 0;
    gameplayPerf.busyMs = 0;
    gameplayPerf.maxMs = 0;
    lastPerfSampleSentAt = now;
};
const canUseUpperBodyAction = (ped) => !!ped &&
    DoesEntityExist(ped) &&
    !IsEntityDead(ped) &&
    !IsPedRagdoll(ped) &&
    !IsPedInAnyVehicle(ped, true) &&
    !IsPauseMenuActive();
const canUseCrouch = (ped) => canUseUpperBodyAction(ped) &&
    !IsPedFalling(ped) &&
    !IsPedJumping(ped) &&
    !IsPedClimbing(ped) &&
    !IsPedSwimming(ped) &&
    !IsPedSwimmingUnderWater(ped);
const loadGameplayAnimDict = async (animDict, isCurrent) => {
    RequestAnimDict(animDict);
    while (!HasAnimDictLoaded(animDict)) {
        if (!isCurrent())
            return false;
        await actionDelay(25);
    }
    return isCurrent();
};
const loadGameplayAnimSet = async (animSet, token) => {
    RequestAnimSet(animSet);
    while (!HasAnimSetLoaded(animSet)) {
        if (token !== crouchToken)
            return false;
        await actionDelay(25);
    }
    return token === crouchToken;
};
const shouldRunActionTick = () => handsUp || pointing || crouched || sprintCombatActive;
const shouldRunActionMonitor = () => handsUp || pointing || crouched || sprintCombatActive;
const suppressCombatFrame = (controls) => {
    DisablePlayerFiring(localPlayerId, true);
    for (const control of controls)
        DisableControlAction(0, control, true);
};
const updateFrameControls = () => {
    const perfStarted = beginSampledGameplayWork(64);
    try {
        if (handsUp || pointing) {
            suppressCombatFrame(ACTION_COMBAT_CONTROLS);
        }
        else if (sprintCombatActive) {
            suppressCombatFrame(SPRINT_MELEE_CONTROLS);
        }
        if (crouched) {
            DisableControlAction(0, 21, true);
            DisableControlAction(0, 22, true);
        }
    }
    finally {
        finishSampledGameplayWork(perfStarted, 64);
    }
};
const ensureActionTick = () => {
    if (actionTick !== null || !shouldRunActionTick())
        return;
    actionTick = setTick(updateFrameControls);
};
const stopActionTickIfIdle = () => {
    if (actionTick !== null && !shouldRunActionTick()) {
        clearTick(actionTick);
        actionTick = null;
    }
};
const stopHandsUp = () => {
    if (!handsUp)
        return;
    const ped = PlayerPedId();
    if (ped && DoesEntityExist(ped)) {
        StopAnimTask(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, 2.5);
    }
    RemoveAnimDict(GameplayConfig.actions.handsUp.animDict);
    handsUp = false;
};
const stopPointing = () => {
    if (!pointing && !pointingPed)
        return;
    const ped = pointingPed || PlayerPedId();
    if (pointingSignalTimer)
        clearTimeout(pointingSignalTimer);
    pointingSignalTimer = null;
    pointingShapeHandle = 0;
    if (ped && DoesEntityExist(ped)) {
        if (IsTaskMoveNetworkActive(ped))
            Citizen.invokeNative('0xD01015C7316AE176', ped, 'Stop');
        ClearPedSecondaryTask(ped);
        SetPedConfigFlag(ped, 36, false);
        if (!IsPedInAnyVehicle(ped, true))
            SetPedCurrentWeaponVisible(ped, true, true, true, true);
    }
    RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
    pointing = false;
    pointingPed = 0;
    pointingStartedAt = 0;
    lastPointingShapeAt = 0;
    lastPointingBlocked = false;
};
const stopCrouch = () => {
    if (!crouched)
        return;
    const ped = PlayerPedId();
    if (ped && DoesEntityExist(ped)) {
        ResetPedMovementClipset(ped, GameplayConfig.crouch.blendOutSpeed);
        ResetPedStrafeClipset(ped);
        SetPedStealthMovement(ped, false, 'DEFAULT_ACTION');
    }
    RemoveAnimSet(GameplayConfig.crouch.movementClipset);
    RemoveAnimSet(GameplayConfig.crouch.strafeClipset);
    crouched = false;
};
const sprintGuardNeedsFrameSuppression = (ped) => {
    if (!sprintGuardHeld || !ped || !DoesEntityExist(ped) || IsEntityDead(ped))
        return false;
    if (GetSelectedPedWeapon(ped) !== unarmedWeaponHash)
        return false;
    return IsPedSprinting(ped) || IsPedRunning(ped) || GetEntitySpeed(ped) >= GameplayConfig.combat.sprintMeleeMinimumSpeed;
};
const scheduleSprintProbe = (delayMs = 55) => {
    if (!sprintGuardHeld || sprintCombatActive || sprintProbeTimer)
        return;
    sprintProbeTimer = setTimeout(() => {
        sprintProbeTimer = null;
        if (!sprintGuardHeld || sprintCombatActive)
            return;
        recordGameplayCallback();
        const ped = PlayerPedId();
        if (sprintGuardNeedsFrameSuppression(ped)) {
            sprintCombatActive = true;
            ensureActionTick();
            ensureActionMonitor();
            return;
        }
        scheduleSprintProbe(55);
    }, Math.max(25, delayMs));
};
const pollPointingShapeResult = () => {
    if (!pointingShapeHandle)
        return;
    const [state, blocked] = GetShapeTestResult(pointingShapeHandle);
    if (state === 2) {
        lastPointingBlocked = blocked;
        pointingShapeHandle = 0;
    }
    else if (state === 0) {
        pointingShapeHandle = 0;
    }
};
const startPointingShapeProbe = (ped, relativeHeading, now) => {
    if (pointingShapeHandle || now - lastPointingShapeAt < GameplayConfig.actions.pointing.collisionProbeIntervalMs)
        return;
    lastPointingShapeAt = now;
    const radians = relativeHeading * (Math.PI / 180.0);
    const cosHeading = Math.cos(radians);
    const sinHeading = Math.sin(radians);
    const normalizedHeading = (clampGameplayValue(relativeHeading, -180.0, 180.0) + 180.0) / 360.0;
    const side = 0.4 * normalizedHeading + 0.3;
    const [x, y, z] = GetOffsetFromEntityInWorldCoords(ped, (cosHeading * -0.2) - (sinHeading * side), (sinHeading * -0.2) + (cosHeading * side), 0.6);
    pointingShapeHandle = StartShapeTestCapsule(x, y, z - 0.2, x, y, z + 0.2, 0.4, 95, ped, 7);
};
const updatePointingSignals = () => {
    pointingSignalTimer = null;
    if (!pointing || !pointingPed)
        return;
    recordGameplayCallback();
    const ped = pointingPed;
    if (!DoesEntityExist(ped) || !IsTaskMoveNetworkActive(ped)) {
        schedulePointingSignals(GameplayConfig.actions.pointing.signalIntervalMs);
        return;
    }
    const now = Date.now();
    const rawPitch = clampGameplayValue(GetGameplayCamRelativePitch(), -70.0, 42.0);
    const rawHeading = clampGameplayValue(GetGameplayCamRelativeHeading(), -180.0, 180.0);
    const pitch = (rawPitch + 70.0) / 112.0;
    const heading = (rawHeading + 180.0) / 360.0;
    pollPointingShapeResult();
    startPointingShapeProbe(ped, rawHeading, now);
    SetTaskMoveNetworkSignalFloat(ped, 'Pitch', pitch);
    SetTaskMoveNetworkSignalFloat(ped, 'Heading', 1.0 - heading);
    SetTaskMoveNetworkSignalBool(ped, 'isBlocked', lastPointingBlocked);
    SetTaskMoveNetworkSignalBool(ped, 'isFirstPerson', GetFollowPedCamViewMode() === 4);
    schedulePointingSignals(GameplayConfig.actions.pointing.signalIntervalMs);
};
function schedulePointingSignals(delayMs = GameplayConfig.actions.pointing.signalIntervalMs) {
    if (!pointing || pointingSignalTimer)
        return;
    pointingSignalTimer = setTimeout(updatePointingSignals, Math.max(25, delayMs));
}
const monitorGameplayState = () => {
    actionMonitorTimer = null;
    recordGameplayCallback();
    const ped = PlayerPedId();
    const now = Date.now();
    if (handsUp) {
        if (!canUseUpperBodyAction(ped)) {
            handsUpToken++;
            stopHandsUp();
        }
        else if (now - lastHandsUpAnimCheckAt >= GameplayConfig.actions.handsUp.animCheckIntervalMs) {
            lastHandsUpAnimCheckAt = now;
            if (!IsEntityPlayingAnim(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, 3)) {
                TaskPlayAnim(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, GameplayConfig.actions.handsUp.blendInSpeed, GameplayConfig.actions.handsUp.blendOutSpeed, -1, GameplayConfig.actions.handsUp.flags, 0.0, false, false, false);
            }
        }
    }
    if (pointing) {
        const wrongPed = pointingPed !== ped;
        const taskMissing = now - pointingStartedAt > 250 && !IsTaskMoveNetworkActive(pointingPed);
        if (wrongPed || !canUseUpperBodyAction(ped) || taskMissing) {
            pointingToken++;
            stopPointing();
        }
    }
    if (crouched && !canUseCrouch(ped)) {
        crouchToken++;
        stopCrouch();
    }
    if (sprintCombatActive && !sprintGuardNeedsFrameSuppression(ped)) {
        sprintCombatActive = false;
        scheduleSprintProbe(55);
    }
    stopActionTickIfIdle();
    if (shouldRunActionMonitor()) {
        ensureActionMonitor();
    }
    else {
        flushGameplayPerf();
    }
};
function ensureActionMonitor() {
    if (actionMonitorTimer || !shouldRunActionMonitor())
        return;
    actionMonitorTimer = setTimeout(monitorGameplayState, GameplayConfig.actions.monitorIntervalMs);
}
const stopAllGameplayActions = () => {
    handsUpToken++;
    pointingToken++;
    crouchToken++;
    stopHandsUp();
    stopPointing();
    stopCrouch();
    sprintGuardHeld = false;
    sprintCombatActive = false;
    if (sprintProbeTimer)
        clearTimeout(sprintProbeTimer);
    if (actionMonitorTimer)
        clearTimeout(actionMonitorTimer);
    if (pointingSignalTimer)
        clearTimeout(pointingSignalTimer);
    sprintProbeTimer = null;
    actionMonitorTimer = null;
    pointingSignalTimer = null;
    stopActionTickIfIdle();
    flushGameplayPerf(true);
};
const stopHandsUpFromInput = () => {
    handsUpToken++;
    stopHandsUp();
    stopActionTickIfIdle();
    if (!shouldRunActionMonitor() && actionMonitorTimer) {
        clearTimeout(actionMonitorTimer);
        actionMonitorTimer = null;
    }
    flushGameplayPerf();
};
const stopPointingFromInput = () => {
    pointingToken++;
    stopPointing();
    stopActionTickIfIdle();
    if (!shouldRunActionMonitor() && actionMonitorTimer) {
        clearTimeout(actionMonitorTimer);
        actionMonitorTimer = null;
    }
    flushGameplayPerf();
};
const startHandsUp = async () => {
    if (handsUp)
        return;
    const ped = PlayerPedId();
    if (!canUseUpperBodyAction(ped))
        return;
    pointingToken++;
    stopPointing();
    crouchToken++;
    stopCrouch();
    const token = ++handsUpToken;
    const loaded = await loadGameplayAnimDict(GameplayConfig.actions.handsUp.animDict, () => token === handsUpToken);
    if (!loaded) {
        RemoveAnimDict(GameplayConfig.actions.handsUp.animDict);
        return;
    }
    const currentPed = PlayerPedId();
    if (!canUseUpperBodyAction(currentPed) || token !== handsUpToken) {
        RemoveAnimDict(GameplayConfig.actions.handsUp.animDict);
        return;
    }
    TaskPlayAnim(currentPed, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, GameplayConfig.actions.handsUp.blendInSpeed, GameplayConfig.actions.handsUp.blendOutSpeed, -1, GameplayConfig.actions.handsUp.flags, 0.0, false, false, false);
    lastHandsUpAnimCheckAt = Date.now();
    handsUp = true;
    recordGameplayCallback();
    ensureActionTick();
    ensureActionMonitor();
};
const startPointing = async () => {
    if (pointing || pointingStarting)
        return;
    pointingStarting = true;
    try {
        const ped = PlayerPedId();
        if (!canUseUpperBodyAction(ped))
            return;
        handsUpToken++;
        stopHandsUp();
        crouchToken++;
        stopCrouch();
        const token = ++pointingToken;
        const loaded = await loadGameplayAnimDict(GameplayConfig.actions.pointing.animDict, () => token === pointingToken);
        if (!loaded) {
            RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
            return;
        }
        const currentPed = PlayerPedId();
        if (!canUseUpperBodyAction(currentPed) || token !== pointingToken) {
            RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
            return;
        }
        SetPedCurrentWeaponVisible(currentPed, false, true, true, true);
        SetPedConfigFlag(currentPed, 36, true);
        Citizen.invokeNative('0x2D537BA194896636', currentPed, GameplayConfig.actions.pointing.taskName, 0.5, false, GameplayConfig.actions.pointing.animDict, 24);
        pointing = true;
        pointingPed = currentPed;
        pointingStartedAt = Date.now();
        lastPointingShapeAt = 0;
        lastPointingBlocked = false;
        pointingShapeHandle = 0;
        recordGameplayCallback();
        RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
        await actionDelay(40);
        if (token !== pointingToken || !pointing || pointingPed !== PlayerPedId())
            return;
        if (!IsTaskMoveNetworkActive(pointingPed)) {
            RequestAnimDict(GameplayConfig.actions.pointing.animDict);
            let attempts = 0;
            while (!HasAnimDictLoaded(GameplayConfig.actions.pointing.animDict) && attempts < 8 && token === pointingToken) {
                attempts++;
                await actionDelay(25);
            }
            if (token !== pointingToken || !pointing)
                return;
            Citizen.invokeNative('0x2D537BA194896636', pointingPed, GameplayConfig.actions.pointing.taskName, 0.5, false, GameplayConfig.actions.pointing.animDict, 24);
            RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
            await actionDelay(40);
            if (token !== pointingToken || !pointing)
                return;
            if (!IsTaskMoveNetworkActive(pointingPed)) {
                RequestAnimDict(GameplayConfig.actions.pointing.animDict);
                let fallbackAttempts = 0;
                while (!HasAnimDictLoaded(GameplayConfig.actions.pointing.animDict) && fallbackAttempts < 8 && token === pointingToken) {
                    fallbackAttempts++;
                    await actionDelay(25);
                }
                if (token !== pointingToken || !pointing)
                    return;
                TaskMoveNetworkByName(pointingPed, GameplayConfig.actions.pointing.taskName, 0.5, false, GameplayConfig.actions.pointing.animDict, 24);
                RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
            }
        }
        pointingStartedAt = Date.now();
        schedulePointingSignals(0);
        ensureActionTick();
        ensureActionMonitor();
    }
    finally {
        pointingStarting = false;
    }
};
const startCrouch = async () => {
    if (crouched)
        return;
    const ped = PlayerPedId();
    if (!canUseCrouch(ped))
        return;
    handsUpToken++;
    pointingToken++;
    stopHandsUp();
    stopPointing();
    SetPedStealthMovement(ped, false, 'DEFAULT_ACTION');
    const token = ++crouchToken;
    const movementLoaded = await loadGameplayAnimSet(GameplayConfig.crouch.movementClipset, token);
    if (!movementLoaded) {
        RemoveAnimSet(GameplayConfig.crouch.movementClipset);
        return;
    }
    const strafeLoaded = await loadGameplayAnimSet(GameplayConfig.crouch.strafeClipset, token);
    if (!strafeLoaded) {
        RemoveAnimSet(GameplayConfig.crouch.movementClipset);
        RemoveAnimSet(GameplayConfig.crouch.strafeClipset);
        return;
    }
    const currentPed = PlayerPedId();
    if (!canUseCrouch(currentPed) || token !== crouchToken) {
        RemoveAnimSet(GameplayConfig.crouch.movementClipset);
        RemoveAnimSet(GameplayConfig.crouch.strafeClipset);
        return;
    }
    SetPedStealthMovement(currentPed, false, 'DEFAULT_ACTION');
    SetPedMovementClipset(currentPed, GameplayConfig.crouch.movementClipset, GameplayConfig.crouch.blendInSpeed);
    SetPedStrafeClipset(currentPed, GameplayConfig.crouch.strafeClipset);
    crouched = true;
    recordGameplayCallback();
    ensureActionTick();
    ensureActionMonitor();
};
const toggleCrouch = () => {
    const ped = PlayerPedId();
    if (ped) {
        SetPedStealthMovement(ped, false, 'DEFAULT_ACTION');
        setTimeout(() => {
            const currentPed = PlayerPedId();
            if (currentPed)
                SetPedStealthMovement(currentPed, false, 'DEFAULT_ACTION');
        }, 0);
    }
    if (crouched) {
        crouchToken++;
        stopCrouch();
        stopActionTickIfIdle();
        if (!shouldRunActionMonitor() && actionMonitorTimer) {
            clearTimeout(actionMonitorTimer);
            actionMonitorTimer = null;
        }
        flushGameplayPerf();
        return;
    }
    void startCrouch();
};
RegisterCommand(`+${GameplayConfig.actions.handsUp.command}`, () => void startHandsUp(), false);
RegisterCommand(`-${GameplayConfig.actions.handsUp.command}`, () => stopHandsUpFromInput(), false);
RegisterCommand(`+${GameplayConfig.actions.pointing.command}`, () => void startPointing(), false);
RegisterCommand(`-${GameplayConfig.actions.pointing.command}`, () => stopPointingFromInput(), false);
RegisterCommand('+rumble_point', () => void startPointing(), false);
RegisterCommand('-rumble_point', () => stopPointingFromInput(), false);
RegisterCommand(GameplayConfig.crouch.leftCommand, () => toggleCrouch(), false);
RegisterCommand(GameplayConfig.crouch.rightCommand, () => toggleCrouch(), false);
RegisterCommand('+rumble_sprint_guard', () => {
    sprintGuardHeld = true;
    const ped = PlayerPedId();
    if (sprintGuardNeedsFrameSuppression(ped)) {
        sprintCombatActive = true;
        recordGameplayCallback();
        ensureActionTick();
        ensureActionMonitor();
    }
    else {
        scheduleSprintProbe(55);
    }
}, false);
RegisterCommand('-rumble_sprint_guard', () => {
    sprintGuardHeld = false;
    sprintCombatActive = false;
    if (sprintProbeTimer)
        clearTimeout(sprintProbeTimer);
    sprintProbeTimer = null;
    stopActionTickIfIdle();
    if (!shouldRunActionMonitor() && actionMonitorTimer) {
        clearTimeout(actionMonitorTimer);
        actionMonitorTimer = null;
    }
    flushGameplayPerf();
}, false);
RegisterKeyMapping(`+${GameplayConfig.actions.handsUp.command}`, GameplayConfig.actions.handsUp.description, 'keyboard', GameplayConfig.actions.handsUp.key);
RegisterKeyMapping(`+${GameplayConfig.actions.pointing.command}`, GameplayConfig.actions.pointing.description, 'keyboard', GameplayConfig.actions.pointing.key);
RegisterKeyMapping(GameplayConfig.crouch.leftCommand, GameplayConfig.crouch.description, 'keyboard', GameplayConfig.crouch.leftKey);
RegisterKeyMapping(GameplayConfig.crouch.rightCommand, GameplayConfig.crouch.alternateDescription, 'keyboard', GameplayConfig.crouch.rightKey);
RegisterKeyMapping('+rumble_sprint_guard', 'Rumble anti sprint-melee guard', 'keyboard', 'LSHIFT');
;
"use strict";
const cameraZoomUnarmedHash = GetHashKey('WEAPON_UNARMED');
const CAMERA_VIEW_CLOSE = 0;
const CAMERA_VIEW_FAR = 2;
const canUseCameraZoom = () => {
    const ped = PlayerPedId();
    return Boolean(ped &&
        DoesEntityExist(ped) &&
        !IsEntityDead(ped) &&
        !IsPedRagdoll(ped) &&
        !IsPedInAnyVehicle(ped, true) &&
        !IsPauseMenuActive() &&
        GetSelectedPedWeapon(ped) === cameraZoomUnarmedHash);
};
const changeCameraZoom = (direction) => {
    if (!GameplayConfig.cameraZoom.enabled || !canUseCameraZoom())
        return;
    const current = GetFollowPedCamViewMode();
    if (current < CAMERA_VIEW_CLOSE || current > CAMERA_VIEW_FAR)
        return;
    const next = Math.max(CAMERA_VIEW_CLOSE, Math.min(CAMERA_VIEW_FAR, current + direction));
    if (next !== current)
        SetFollowPedCamViewMode(next);
};
RegisterCommand(GameplayConfig.cameraZoom.zoomInCommand, () => changeCameraZoom(-1), false);
RegisterCommand(GameplayConfig.cameraZoom.zoomOutCommand, () => changeCameraZoom(1), false);
RegisterKeyMapping(GameplayConfig.cameraZoom.zoomInCommand, GameplayConfig.cameraZoom.zoomInDescription, 'MOUSE_WHEEL', 'IOM_WHEEL_UP');
RegisterKeyMapping(GameplayConfig.cameraZoom.zoomOutCommand, GameplayConfig.cameraZoom.zoomOutDescription, 'MOUSE_WHEEL', 'IOM_WHEEL_DOWN');
;
"use strict";
on('onClientResourceStart', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    applyWorldPolicy();
    stopAllGameplayActions();
});
on('playerSpawned', () => {
    applyWorldPolicy();
    stopAllGameplayActions();
});
on('rumble:client:playerLoaded', () => {
    applyWorldPolicy();
});
on('onResourceStop', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    stopAllGameplayActions();
});
