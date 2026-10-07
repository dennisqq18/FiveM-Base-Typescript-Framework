let handsUp = false;
let pointing = false;
let crouched = false;
let handsUpToken = 0;
let pointingToken = 0;
let crouchToken = 0;

const actionDelay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const clampGameplayValue = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const unarmedWeaponHash = GetHashKey('WEAPON_UNARMED');

const COMBAT_CONTROLS = Object.freeze([24, 25, 37, 44, 140, 141, 142, 143, 257, 263, 264]);
const SPRINT_MELEE_CONTROLS = Object.freeze([24, 140, 141, 142, 257, 263, 264]);

const canUseUpperBodyAction = (ped: number) =>
  !!ped &&
  !IsEntityDead(ped) &&
  !IsPedRagdoll(ped) &&
  !IsPedInAnyVehicle(ped, true) &&
  !IsPauseMenuActive();

const canUseCrouch = (ped: number) =>
  canUseUpperBodyAction(ped) &&
  !IsPedFalling(ped) &&
  !IsPedJumping(ped) &&
  !IsPedClimbing(ped) &&
  !IsPedSwimming(ped) &&
  !IsPedSwimmingUnderWater(ped);

const loadGameplayAnimDict = async (animDict: string, isCurrent: () => boolean) => {
  RequestAnimDict(animDict);

  while (!HasAnimDictLoaded(animDict)) {
    if (!isCurrent()) return false;
    await actionDelay(25);
  }

  return isCurrent();
};

const loadGameplayAnimSet = async (animSet: string, token: number) => {
  RequestAnimSet(animSet);

  while (!HasAnimSetLoaded(animSet)) {
    if (token !== crouchToken) return false;
    await actionDelay(25);
  }

  return token === crouchToken;
};

const suppressCombat = (ped: number, controls: readonly number[]) => {
  DisablePlayerFiring(PlayerId(), true);
  for (const control of controls) DisableControlAction(0, control, true);

  // Keeps accidental melee tasks from being queued while an RP action owns the upper body.
  if (GetSelectedPedWeapon(ped) === unarmedWeaponHash) {
    DisableControlAction(0, 24, true);
  }
};

const stopHandsUp = () => {
  if (!handsUp) return;
  const ped = PlayerPedId();
  StopAnimTask(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, 2.5);
  RemoveAnimDict(GameplayConfig.actions.handsUp.animDict);
  handsUp = false;
};

const stopPointing = () => {
  if (!pointing) return;
  const ped = PlayerPedId();
  RequestTaskMoveNetworkStateTransition(ped, 'Stop');
  ClearPedSecondaryTask(ped);
  SetPedConfigFlag(ped, 36, false);
  SetPedCurrentWeaponVisible(ped, true, true, true, true);
  RemoveAnimDict(GameplayConfig.actions.pointing.animDict);
  pointing = false;
};

const stopCrouch = () => {
  if (!crouched) return;
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
  if (handsUp) return;

  const ped = PlayerPedId();
  if (!canUseUpperBodyAction(ped)) return;

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

  TaskPlayAnim(
    currentPed,
    GameplayConfig.actions.handsUp.animDict,
    GameplayConfig.actions.handsUp.animName,
    GameplayConfig.actions.handsUp.blendInSpeed,
    GameplayConfig.actions.handsUp.blendOutSpeed,
    -1,
    GameplayConfig.actions.handsUp.flags,
    0.0,
    false,
    false,
    false
  );
  handsUp = true;
};

const stopHandsUpFromInput = () => {
  handsUpToken++;
  stopHandsUp();
};

const updatePointingSignals = (ped: number) => {
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
  if (pointing) return;

  const ped = PlayerPedId();
  if (!canUseUpperBodyAction(ped)) return;

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
  if (crouched) return;
  const ped = PlayerPedId();
  if (!canUseCrouch(ped)) return;

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
  // Disable GTA's native stealth toggle so CTRL is reserved for the RP crouch system.
  DisableControlAction(0, 36, true);

  const ped = PlayerPedId();
  if (!ped || IsEntityDead(ped)) {
    if (handsUp || pointing || crouched) stopAllGameplayActions();
    return;
  }

  if (handsUp) {
    if (!canUseUpperBodyAction(ped)) {
      stopHandsUpFromInput();
    } else {
      suppressCombat(ped, COMBAT_CONTROLS);
      if (!IsEntityPlayingAnim(ped, GameplayConfig.actions.handsUp.animDict, GameplayConfig.actions.handsUp.animName, 3)) {
        TaskPlayAnim(
          ped,
          GameplayConfig.actions.handsUp.animDict,
          GameplayConfig.actions.handsUp.animName,
          GameplayConfig.actions.handsUp.blendInSpeed,
          GameplayConfig.actions.handsUp.blendOutSpeed,
          -1,
          GameplayConfig.actions.handsUp.flags,
          0.0,
          false,
          false,
          false
        );
      }
    }
  }

  if (pointing) {
    if (!canUseUpperBodyAction(ped)) {
      stopPointingFromInput();
    } else {
      suppressCombat(ped, COMBAT_CONTROLS);
      updatePointingSignals(ped);
    }
  }

  if (crouched) {
    if (!canUseCrouch(ped)) {
      crouchToken++;
      stopCrouch();
    } else {
      DisableControlAction(0, 21, true); // sprint
      DisableControlAction(0, 22, true); // jump
    }
  }

  // Anti sprint-punch / melee lunge abuse. Normal standing melee stays untouched.
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

RegisterKeyMapping(
  `+${GameplayConfig.actions.handsUp.command}`,
  GameplayConfig.actions.handsUp.description,
  'keyboard',
  GameplayConfig.actions.handsUp.key
);
RegisterKeyMapping(
  `+${GameplayConfig.actions.pointing.command}`,
  GameplayConfig.actions.pointing.description,
  'keyboard',
  GameplayConfig.actions.pointing.key
);
RegisterKeyMapping(
  GameplayConfig.crouch.leftCommand,
  GameplayConfig.crouch.description,
  'keyboard',
  GameplayConfig.crouch.leftKey
);
RegisterKeyMapping(
  GameplayConfig.crouch.rightCommand,
  GameplayConfig.crouch.alternateDescription,
  'keyboard',
  GameplayConfig.crouch.rightKey
);

// One tiny client-only control tick. It does not send server events or touch the database.
setTick(updateGameplayControls);
