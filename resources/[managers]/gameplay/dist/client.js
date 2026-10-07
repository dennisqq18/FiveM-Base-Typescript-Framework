"use strict";
const GameplayConfig = Object.freeze({
    actions: Object.freeze({
        handsUp: Object.freeze({
            command: 'rumble_handsup',
            key: 'X',
            description: 'Hold X to keep your hands up',
            animDict: 'random@mugging3',
            animName: 'handsup_standing_base',
            blendInSpeed: 8.0,
            blendOutSpeed: -8.0,
            flags: 49
        }),
        pointing: Object.freeze({
            command: 'rumble_point',
            key: 'B',
            description: 'Hold B to point',
            animDict: 'anim@mp_point',
            taskName: 'task_mp_pointing'
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
        zoomInDescription: 'Zoom in while unarmed',
        zoomOutDescription: 'Zoom out while unarmed',
        maxLevel: 4,
        fovStep: 8.0,
        minimumFov: 22.0,
        interpolationSpeed: 13.0
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
let handsUp = false;
let pointing = false;
let crouched = false;
let handsUpToken = 0;
let pointingToken = 0;
let crouchToken = 0;
const actionDelay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clampGameplayValue = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const unarmedWeaponHash = GetHashKey('WEAPON_UNARMED');
const COMBAT_CONTROLS = Object.freeze([24, 25, 37, 44, 140, 141, 142, 143, 257, 263, 264]);
const SPRINT_MELEE_CONTROLS = Object.freeze([24, 140, 141, 142, 257, 263, 264]);
const canUseUpperBodyAction = (ped) => !!ped &&
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
const suppressCombat = (ped, controls) => {
    DisablePlayerFiring(PlayerId(), true);
    for (const control of controls)
        DisableControlAction(0, control, true);
    if (GetSelectedPedWeapon(ped) === unarmedWeaponHash) {
        DisableControlAction(0, 24, true);
    }
};
const stopHandsUp = () => {
    if (!handsUp)
        return;
    const ped = PlayerPedId();
    StopAnimTask(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, 2.5);
    RemoveAnimDict(GameplayConfig.actions.handsUp.animDict);
    handsUp = false;
};
const stopPointing = () => {
    if (!pointing)
        return;
    const ped = PlayerPedId();
    RequestTaskMoveNetworkStateTransition(ped, 'Stop');
    ClearPedSecondaryTask(ped);
    SetPedConfigFlag(ped, 36, false);
    SetPedCurrentWeaponVisible(ped, true, true, true, true);
    RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
    pointing = false;
};
const stopCrouch = () => {
    if (!crouched)
        return;
    const ped = PlayerPedId();
    ResetPedMovementClipset(ped, GameplayConfig.crouch.blendOutSpeed);
    ResetPedStrafeClipset(ped);
    RemoveAnimSet(GameplayConfig.crouch.movementClipset);
    RemoveAnimSet(GameplayConfig.crouch.strafeClipset);
    crouched = false;
};
const stopAllGameplayActions = () => {
    handsUpToken++;
    pointingToken++;
    crouchToken++;
    stopHandsUp();
    stopPointing();
    stopCrouch();
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
    handsUp = true;
};
const stopHandsUpFromInput = () => {
    handsUpToken++;
    stopHandsUp();
};
const updatePointingSignals = (ped) => {
    const pitch = (clampGameplayValue(GetGameplayCamRelativePitch(), -70.0, 42.0) + 70.0) / 112.0;
    const heading = (clampGameplayValue(GetGameplayCamRelativeHeading(), -180.0, 180.0) + 180.0) / 360.0;
    const [x, y, z] = GetOffsetFromEntityInWorldCoords(ped, -0.2, 0.4, 0.3);
    const shapeTest = StartShapeTestCapsule(x, y, z - 0.2, x, y, z + 0.2, 0.4, 95, ped, 7);
    const [, blocked] = GetShapeTestResult(shapeTest);
    SetTaskMoveNetworkSignalFloat(ped, 'Pitch', pitch);
    SetTaskMoveNetworkSignalFloat(ped, 'Heading', 1.0 - heading);
    SetTaskMoveNetworkSignalBool(ped, 'isBlocked', blocked);
    SetTaskMoveNetworkSignalBool(ped, 'isFirstPerson', GetFollowPedCamViewMode() === 4);
};
const startPointing = async () => {
    if (pointing)
        return;
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
    TaskMoveNetworkByName(currentPed, GameplayConfig.actions.pointing.taskName, 0.5, false, GameplayConfig.actions.pointing.animDict, 24);
    pointing = true;
};
const stopPointingFromInput = () => {
    pointingToken++;
    stopPointing();
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
    SetPedMovementClipset(currentPed, GameplayConfig.crouch.movementClipset, GameplayConfig.crouch.blendInSpeed);
    SetPedStrafeClipset(currentPed, GameplayConfig.crouch.strafeClipset);
    crouched = true;
};
const toggleCrouch = () => {
    if (crouched) {
        crouchToken++;
        stopCrouch();
        return;
    }
    void startCrouch();
};
const updateGameplayControls = () => {
    DisableControlAction(0, 36, true);
    const ped = PlayerPedId();
    if (!ped || IsEntityDead(ped)) {
        if (handsUp || pointing || crouched)
            stopAllGameplayActions();
        return;
    }
    if (handsUp) {
        if (!canUseUpperBodyAction(ped)) {
            stopHandsUpFromInput();
        }
        else {
            suppressCombat(ped, COMBAT_CONTROLS);
            if (!IsEntityPlayingAnim(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, 3)) {
                TaskPlayAnim(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, GameplayConfig.actions.handsUp.blendInSpeed, GameplayConfig.actions.handsUp.blendOutSpeed, -1, GameplayConfig.actions.handsUp.flags, 0.0, false, false, false);
            }
        }
    }
    if (pointing) {
        if (!canUseUpperBodyAction(ped)) {
            stopPointingFromInput();
        }
        else {
            suppressCombat(ped, COMBAT_CONTROLS);
            updatePointingSignals(ped);
        }
    }
    if (crouched) {
        if (!canUseCrouch(ped)) {
            crouchToken++;
            stopCrouch();
        }
        else {
            DisableControlAction(0, 21, true);
            DisableControlAction(0, 22, true);
        }
    }
    const sprintHeld = IsControlPressed(0, 21);
    const movingFast = IsPedSprinting(ped) || IsPedRunning(ped) || GetEntitySpeed(ped) >= GameplayConfig.combat.sprintMeleeMinimumSpeed;
    if (sprintHeld && movingFast && GetSelectedPedWeapon(ped) === unarmedWeaponHash) {
        suppressCombat(ped, SPRINT_MELEE_CONTROLS);
    }
};
RegisterCommand(`+${GameplayConfig.actions.handsUp.command}`, () => {
    void startHandsUp();
}, false);
RegisterCommand(`-${GameplayConfig.actions.handsUp.command}`, () => {
    stopHandsUpFromInput();
}, false);
RegisterCommand(`+${GameplayConfig.actions.pointing.command}`, () => {
    void startPointing();
}, false);
RegisterCommand(`-${GameplayConfig.actions.pointing.command}`, () => {
    stopPointingFromInput();
}, false);
RegisterCommand(GameplayConfig.crouch.leftCommand, () => toggleCrouch(), false);
RegisterCommand(GameplayConfig.crouch.rightCommand, () => toggleCrouch(), false);
RegisterKeyMapping(`+${GameplayConfig.actions.handsUp.command}`, GameplayConfig.actions.handsUp.description, 'keyboard', GameplayConfig.actions.handsUp.key);
RegisterKeyMapping(`+${GameplayConfig.actions.pointing.command}`, GameplayConfig.actions.pointing.description, 'keyboard', GameplayConfig.actions.pointing.key);
RegisterKeyMapping(GameplayConfig.crouch.leftCommand, GameplayConfig.crouch.description, 'keyboard', GameplayConfig.crouch.leftKey);
RegisterKeyMapping(GameplayConfig.crouch.rightCommand, GameplayConfig.crouch.alternateDescription, 'keyboard', GameplayConfig.crouch.rightKey);
setTick(updateGameplayControls);
let cameraZoomHandle = null;
let cameraZoomTick = null;
let cameraZoomLevel = 0;
let cameraZoomBaseFov = 0.0;
let cameraZoomCurrentFov = 0.0;
let cameraZoomTargetFov = 0.0;
const cameraZoomUnarmedHash = GetHashKey('WEAPON_UNARMED');
const canUseCameraZoom = () => {
    const ped = PlayerPedId();
    if (!ped || IsEntityDead(ped) || IsPedRagdoll(ped) || IsPedInAnyVehicle(ped, true) || IsPauseMenuActive())
        return false;
    return GetSelectedPedWeapon(ped) === cameraZoomUnarmedHash;
};
const destroyCameraZoom = () => {
    if (cameraZoomTick !== null) {
        clearTick(cameraZoomTick);
        cameraZoomTick = null;
    }
    if (cameraZoomHandle !== null && DoesCamExist(cameraZoomHandle)) {
        RenderScriptCams(false, false, 0, true, true);
        DestroyCam(cameraZoomHandle, false);
    }
    cameraZoomHandle = null;
    cameraZoomLevel = 0;
    cameraZoomBaseFov = 0.0;
    cameraZoomCurrentFov = 0.0;
    cameraZoomTargetFov = 0.0;
};
const updateCameraZoom = () => {
    if (cameraZoomHandle === null || !DoesCamExist(cameraZoomHandle) || !canUseCameraZoom()) {
        destroyCameraZoom();
        return;
    }
    const [x, y, z] = GetGameplayCamCoord();
    const [rotX, rotY, rotZ] = GetGameplayCamRot(2);
    SetCamCoord(cameraZoomHandle, x, y, z);
    SetCamRot(cameraZoomHandle, rotX, rotY, rotZ, 2);
    const frameTime = Math.min(GetFrameTime(), 0.05);
    const blend = 1.0 - Math.exp(-GameplayConfig.cameraZoom.interpolationSpeed * frameTime);
    cameraZoomCurrentFov += (cameraZoomTargetFov - cameraZoomCurrentFov) * blend;
    SetCamFov(cameraZoomHandle, cameraZoomCurrentFov);
    DisableControlAction(0, 14, true);
    DisableControlAction(0, 15, true);
    DisableControlAction(0, 16, true);
    DisableControlAction(0, 17, true);
    if (cameraZoomLevel === 0 && Math.abs(cameraZoomCurrentFov - cameraZoomBaseFov) <= 0.15) {
        destroyCameraZoom();
    }
};
const createCameraZoom = () => {
    if (cameraZoomHandle !== null && DoesCamExist(cameraZoomHandle))
        return true;
    if (!canUseCameraZoom())
        return false;
    const [x, y, z] = GetGameplayCamCoord();
    const [rotX, rotY, rotZ] = GetGameplayCamRot(2);
    const renderedFov = GetFinalRenderedCamFov();
    cameraZoomBaseFov = renderedFov >= 10.0 && renderedFov <= 130.0 ? renderedFov : 50.0;
    cameraZoomCurrentFov = cameraZoomBaseFov;
    cameraZoomTargetFov = cameraZoomBaseFov;
    cameraZoomHandle = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', x, y, z, rotX, rotY, rotZ, cameraZoomBaseFov, true, 2);
    if (!cameraZoomHandle || !DoesCamExist(cameraZoomHandle)) {
        destroyCameraZoom();
        return false;
    }
    RenderScriptCams(true, false, 0, true, true);
    cameraZoomTick = setTick(updateCameraZoom);
    return true;
};
const setCameraZoomLevel = (level) => {
    if (!GameplayConfig.cameraZoom.enabled)
        return;
    const nextLevel = Math.max(0, Math.min(GameplayConfig.cameraZoom.maxLevel, level));
    if (nextLevel > 0 && !createCameraZoom())
        return;
    if (cameraZoomHandle === null)
        return;
    cameraZoomLevel = nextLevel;
    cameraZoomTargetFov = cameraZoomLevel === 0
        ? cameraZoomBaseFov
        : Math.max(GameplayConfig.cameraZoom.minimumFov, cameraZoomBaseFov - GameplayConfig.cameraZoom.fovStep * cameraZoomLevel);
};
const reserveZoomWheel = () => {
    DisableControlAction(0, 14, true);
    DisableControlAction(0, 15, true);
    DisableControlAction(0, 16, true);
    DisableControlAction(0, 17, true);
    const ped = PlayerPedId();
    if (!ped)
        return;
    SetCurrentPedWeapon(ped, cameraZoomUnarmedHash, true);
    setTimeout(() => {
        const currentPed = PlayerPedId();
        if (currentPed && canUseCameraZoom())
            SetCurrentPedWeapon(currentPed, cameraZoomUnarmedHash, true);
    }, 0);
};
RegisterCommand(GameplayConfig.cameraZoom.zoomInCommand, () => {
    if (!canUseCameraZoom())
        return;
    reserveZoomWheel();
    setCameraZoomLevel(cameraZoomLevel + 1);
}, false);
RegisterCommand(GameplayConfig.cameraZoom.zoomOutCommand, () => {
    if (cameraZoomLevel === 0)
        return;
    reserveZoomWheel();
    setCameraZoomLevel(cameraZoomLevel - 1);
}, false);
RegisterKeyMapping(GameplayConfig.cameraZoom.zoomInCommand, GameplayConfig.cameraZoom.zoomInDescription, 'MOUSE_WHEEL', 'IOM_WHEEL_UP');
RegisterKeyMapping(GameplayConfig.cameraZoom.zoomOutCommand, GameplayConfig.cameraZoom.zoomOutDescription, 'MOUSE_WHEEL', 'IOM_WHEEL_DOWN');
on('onClientResourceStart', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    applyWorldPolicy();
    stopAllGameplayActions();
    destroyCameraZoom();
});
on('playerSpawned', () => {
    applyWorldPolicy();
    stopAllGameplayActions();
    destroyCameraZoom();
});
on('rumble:client:playerLoaded', () => {
    applyWorldPolicy();
    destroyCameraZoom();
});
on('onResourceStop', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    stopAllGameplayActions();
    destroyCameraZoom();
});
