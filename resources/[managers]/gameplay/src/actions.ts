let handsUp = false;
let pointing = false;
let pointingTick: number | null = null;
let handsUpVehicleCheck: number | null = null;
let actionToken = 0;

const actionDelay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const clampGameplayValue = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const canUseGameplayAction = (ped: number) => !IsEntityDead(ped) && !IsPedRagdoll(ped) && !IsPedInAnyVehicle(ped, true);

const loadGameplayAnimDict = async (animDict: string, token: number) => {
  RequestAnimDict(animDict);

  while (!HasAnimDictLoaded(animDict)) {
    if (token !== actionToken) return false;
    await actionDelay(25);
  }

  return token === actionToken;
};

const stopHandsUpVehicleCheck = () => {
  if (handsUpVehicleCheck === null) return;
  clearInterval(handsUpVehicleCheck);
  handsUpVehicleCheck = null;
};

const stopHandsUp = () => {
  stopHandsUpVehicleCheck();
  if (!handsUp) return;
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
    if (canUseGameplayAction(ped)) return;
    actionToken++;
    stopHandsUp();
  }, GameplayConfig.actions.handsUp.vehicleCheckIntervalMs) as unknown as number;
};

const stopPointing = () => {
  if (!pointing) return;
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
  if (!canUseGameplayAction(ped)) return;

  stopPointing();
  const token = ++actionToken;
  const loaded = await loadGameplayAnimDict(GameplayConfig.actions.handsUp.animDict, token);
  if (!loaded) return;

  const currentPed = PlayerPedId();
  if (!canUseGameplayAction(currentPed)) return;

  TaskPlayAnim(
    currentPed,
    GameplayConfig.actions.handsUp.animDict,
    GameplayConfig.actions.handsUp.animName,
    8.0,
    -8.0,
    -1,
    49,
    0.0,
    false,
    false,
    false
  );
  RemoveAnimDict(GameplayConfig.actions.handsUp.animDict);
  handsUp = true;
  startHandsUpVehicleCheck();
};

const updatePointing = () => {
  if (!pointing) return;
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
  if (!canUseGameplayAction(ped)) return;

  stopHandsUp();
  const token = ++actionToken;
  const loaded = await loadGameplayAnimDict(GameplayConfig.actions.pointing.animDict, token);
  if (!loaded) return;

  const currentPed = PlayerPedId();
  if (!canUseGameplayAction(currentPed)) return;

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

RegisterKeyMapping(
  GameplayConfig.actions.handsUp.command,
  GameplayConfig.actions.handsUp.description,
  'keyboard',
  GameplayConfig.actions.handsUp.key
);
RegisterKeyMapping(
  GameplayConfig.actions.pointing.command,
  GameplayConfig.actions.pointing.description,
  'keyboard',
  GameplayConfig.actions.pointing.key
);
