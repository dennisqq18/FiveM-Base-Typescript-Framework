"use strict";
const GameplayConfig = Object.freeze({
    actions: Object.freeze({
        handsUp: Object.freeze({
            command: 'rumble_handsup',
            key: 'X',
            description: 'Raise or lower your hands',
            animDict: 'random@mugging3',
            animName: 'handsup_standing_base',
            vehicleCheckIntervalMs: 120
        }),
        pointing: Object.freeze({
            command: 'rumble_point',
            key: 'B',
            description: 'Point with your finger',
            animDict: 'anim@mp_point',
            taskName: 'task_mp_pointing'
        })
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
let pointingTick = null;
let handsUpVehicleCheck = null;
let actionToken = 0;
const actionDelay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clampGameplayValue = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const canUseGameplayAction = (ped) => !IsEntityDead(ped) && !IsPedRagdoll(ped) && !IsPedInAnyVehicle(ped, true);
const loadGameplayAnimDict = async (animDict, token) => {
    RequestAnimDict(animDict);
    while (!HasAnimDictLoaded(animDict)) {
        if (token !== actionToken)
            return false;
        await actionDelay(25);
    }
    return token === actionToken;
};
const stopHandsUpVehicleCheck = () => {
    if (handsUpVehicleCheck === null)
        return;
    clearInterval(handsUpVehicleCheck);
    handsUpVehicleCheck = null;
};
const stopHandsUp = () => {
    stopHandsUpVehicleCheck();
    if (!handsUp)
        return;
    const ped = PlayerPedId();
    StopAnimTask(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, 2.0);
    handsUp = false;
};
const startHandsUpVehicleCheck = () => {
    stopHandsUpVehicleCheck();
    handsUpVehicleCheck = setInterval(() => {
        if (!handsUp) {
            stopHandsUpVehicleCheck();
            return;
        }
        const ped = PlayerPedId();
        if (canUseGameplayAction(ped))
            return;
        actionToken++;
        stopHandsUp();
    }, GameplayConfig.actions.handsUp.vehicleCheckIntervalMs);
};
const stopPointing = () => {
    if (!pointing)
        return;
    const ped = PlayerPedId();
    RequestTaskMoveNetworkStateTransition(ped, 'Stop');
    ClearPedSecondaryTask(ped);
    SetPedConfigFlag(ped, 36, false);
    SetPedCurrentWeaponVisible(ped, true, true, true, true);
    pointing = false;
    if (pointingTick !== null) {
        clearTick(pointingTick);
        pointingTick = null;
    }
};
const stopAllGameplayActions = () => {
    actionToken++;
    stopHandsUp();
    stopPointing();
};
const startHandsUp = async () => {
    const ped = PlayerPedId();
    if (!canUseGameplayAction(ped))
        return;
    stopPointing();
    const token = ++actionToken;
    const loaded = await loadGameplayAnimDict(GameplayConfig.actions.handsUp.animDict, token);
    if (!loaded)
        return;
    const currentPed = PlayerPedId();
    if (!canUseGameplayAction(currentPed))
        return;
    TaskPlayAnim(currentPed, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, 8.0, -8.0, -1, 49, 0.0, false, false, false);
    RemoveAnimDict(GameplayConfig.actions.handsUp.animDict);
    handsUp = true;
    startHandsUpVehicleCheck();
};
const updatePointing = () => {
    if (!pointing)
        return;
    const ped = PlayerPedId();
    if (!canUseGameplayAction(ped)) {
        stopPointing();
        return;
    }
    const pitch = (clampGameplayValue(GetGameplayCamRelativePitch(), -70.0, 42.0) + 70.0) / 112.0;
    const heading = (clampGameplayValue(GetGameplayCamRelativeHeading(), -180.0, 180.0) + 180.0) / 360.0;
    SetTaskMoveNetworkSignalFloat(ped, 'Pitch', pitch);
    SetTaskMoveNetworkSignalFloat(ped, 'Heading', 1.0 - heading);
    SetTaskMoveNetworkSignalBool(ped, 'isBlocked', false);
    SetTaskMoveNetworkSignalBool(ped, 'isFirstPerson', false);
    DisableControlAction(0, 24, true);
    DisableControlAction(0, 25, true);
};
const startPointing = async () => {
    const ped = PlayerPedId();
    if (!canUseGameplayAction(ped))
        return;
    stopHandsUp();
    const token = ++actionToken;
    const loaded = await loadGameplayAnimDict(GameplayConfig.actions.pointing.animDict, token);
    if (!loaded)
        return;
    const currentPed = PlayerPedId();
    if (!canUseGameplayAction(currentPed))
        return;
    SetPedCurrentWeaponVisible(currentPed, false, true, true, true);
    SetPedConfigFlag(currentPed, 36, true);
    TaskMoveNetworkByName(currentPed, GameplayConfig.actions.pointing.taskName, 0.5, false, GameplayConfig.actions.pointing.animDict, 24);
    RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
    pointing = true;
    pointingTick = setTick(updatePointing);
};
RegisterCommand(GameplayConfig.actions.handsUp.command, () => {
    if (handsUp) {
        actionToken++;
        stopHandsUp();
        return;
    }
    void startHandsUp();
}, false);
RegisterCommand(GameplayConfig.actions.pointing.command, () => {
    if (pointing) {
        actionToken++;
        stopPointing();
        return;
    }
    void startPointing();
}, false);
RegisterKeyMapping(GameplayConfig.actions.handsUp.command, GameplayConfig.actions.handsUp.description, 'keyboard', GameplayConfig.actions.handsUp.key);
RegisterKeyMapping(GameplayConfig.actions.pointing.command, GameplayConfig.actions.pointing.description, 'keyboard', GameplayConfig.actions.pointing.key);
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
