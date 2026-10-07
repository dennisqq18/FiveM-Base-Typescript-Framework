let handsUp = false;
let pointing = false;
let pointingTick: number | null = null;
let actionToken = 0;

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const canUseAction = (ped: number) => !IsEntityDead(ped) && !IsPedRagdoll(ped) && !IsPedInAnyVehicle(ped, false);

const loadAnimDict = async (animDict: string, token: number) => {
  RequestAnimDict(animDict);

  while (!HasAnimDictLoaded(animDict)) {
    if (token !== actionToken) return false;
    await wait(25);
  }

  return token === actionToken;
};

const stopHandsUp = () => {
  if (!handsUp) return;
  const ped = PlayerPedId();
  StopAnimTask(ped, ActionsConfig.handsUp.animDict, ActionsConfig.handsUp.animName, 2.0);
  handsUp = false;
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

const stopAllActions = () => {
  actionToken++;
  stopHandsUp();
  stopPointing();
};

const startHandsUp = async () => {
  const ped = PlayerPedId();
  if (!canUseAction(ped)) return;

  stopPointing();
  const token = ++actionToken;
  const loaded = await loadAnimDict(ActionsConfig.handsUp.animDict, token);
  if (!loaded) return;

  const currentPed = PlayerPedId();
  if (!canUseAction(currentPed)) return;

  TaskPlayAnim(currentPed, ActionsConfig.handsUp.animDict, ActionsConfig.handsUp.animName, 8.0, -8.0, -1, 49, 0.0, false, false, false);
  RemoveAnimDict(ActionsConfig.handsUp.animDict);
  handsUp = true;
};

const updatePointing = () => {
  if (!pointing) return;
  const ped = PlayerPedId();

  if (!canUseAction(ped)) {
    stopPointing();
    return;
  }

  const pitch = (clamp(GetGameplayCamRelativePitch(), -70.0, 42.0) + 70.0) / 112.0;
  const heading = (clamp(GetGameplayCamRelativeHeading(), -180.0, 180.0) + 180.0) / 360.0;

  SetTaskMoveNetworkSignalFloat(ped, 'Pitch', pitch);
  SetTaskMoveNetworkSignalFloat(ped, 'Heading', 1.0 - heading);
  SetTaskMoveNetworkSignalBool(ped, 'isBlocked', false);
  SetTaskMoveNetworkSignalBool(ped, 'isFirstPerson', false);
  DisableControlAction(0, 24, true);
  DisableControlAction(0, 25, true);
};

const startPointing = async () => {
  const ped = PlayerPedId();
  if (!canUseAction(ped)) return;

  stopHandsUp();
  const token = ++actionToken;
  const loaded = await loadAnimDict(ActionsConfig.pointing.animDict, token);
  if (!loaded) return;

  const currentPed = PlayerPedId();
  if (!canUseAction(currentPed)) return;

  SetPedCurrentWeaponVisible(currentPed, false, true, true, true);
  SetPedConfigFlag(currentPed, 36, true);
  TaskMoveNetworkByName(currentPed, ActionsConfig.pointing.taskName, 0.5, false, ActionsConfig.pointing.animDict, 24);
  RemoveAnimDict(ActionsConfig.pointing.animDict);
  pointing = true;
  pointingTick = setTick(updatePointing);
};

RegisterCommand(ActionsConfig.handsUp.command, () => {
  if (handsUp) {
    actionToken++;
    stopHandsUp();
    return;
  }

  void startHandsUp();
}, false);

RegisterCommand(ActionsConfig.pointing.command, () => {
  if (pointing) {
    actionToken++;
    stopPointing();
    return;
  }

  void startPointing();
}, false);

RegisterKeyMapping(ActionsConfig.handsUp.command, ActionsConfig.handsUp.description, 'keyboard', ActionsConfig.handsUp.key);
RegisterKeyMapping(ActionsConfig.pointing.command, ActionsConfig.pointing.description, 'keyboard', ActionsConfig.pointing.key);

on('playerSpawned', () => {
  stopAllActions();
});

on('onResourceStop', (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
  stopAllActions();
});
