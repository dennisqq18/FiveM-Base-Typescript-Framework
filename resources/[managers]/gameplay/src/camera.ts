let cameraZoomHandle: number | null = null;
let cameraZoomTick: number | null = null;
let cameraZoomLevel = 0;
let cameraZoomBaseFov = 0.0;
let cameraZoomCurrentFov = 0.0;
let cameraZoomTargetFov = 0.0;

const cameraZoomUnarmedHash = GetHashKey('WEAPON_UNARMED');

const canUseCameraZoom = () => {
  const ped = PlayerPedId();
  if (!ped || IsEntityDead(ped) || IsPedRagdoll(ped) || IsPedInAnyVehicle(ped, true) || IsPauseMenuActive()) return false;
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
  if (cameraZoomHandle !== null && DoesCamExist(cameraZoomHandle)) return true;
  if (!canUseCameraZoom()) return false;

  const [x, y, z] = GetGameplayCamCoord();
  const [rotX, rotY, rotZ] = GetGameplayCamRot(2);
  const renderedFov = GetFinalRenderedCamFov();
  cameraZoomBaseFov = renderedFov >= 10.0 && renderedFov <= 130.0 ? renderedFov : 50.0;
  cameraZoomCurrentFov = cameraZoomBaseFov;
  cameraZoomTargetFov = cameraZoomBaseFov;
  cameraZoomHandle = CreateCamWithParams(
    'DEFAULT_SCRIPTED_CAMERA',
    x,
    y,
    z,
    rotX,
    rotY,
    rotZ,
    cameraZoomBaseFov,
    true,
    2
  );

  if (!cameraZoomHandle || !DoesCamExist(cameraZoomHandle)) {
    destroyCameraZoom();
    return false;
  }

  RenderScriptCams(true, false, 0, true, true);
  cameraZoomTick = setTick(updateCameraZoom);
  return true;
};

const setCameraZoomLevel = (level: number) => {
  if (!GameplayConfig.cameraZoom.enabled) return;
  const nextLevel = Math.max(0, Math.min(GameplayConfig.cameraZoom.maxLevel, level));

  if (nextLevel > 0 && !createCameraZoom()) return;
  if (cameraZoomHandle === null) return;

  cameraZoomLevel = nextLevel;
  cameraZoomTargetFov = cameraZoomLevel === 0
    ? cameraZoomBaseFov
    : Math.max(
        GameplayConfig.cameraZoom.minimumFov,
        cameraZoomBaseFov - GameplayConfig.cameraZoom.fovStep * cameraZoomLevel
      );
};

const reserveZoomWheel = () => {
  DisableControlAction(0, 14, true);
  DisableControlAction(0, 15, true);
  DisableControlAction(0, 16, true);
  DisableControlAction(0, 17, true);
  const ped = PlayerPedId();
  if (!ped) return;
  SetCurrentPedWeapon(ped, cameraZoomUnarmedHash, true);
  setTimeout(() => {
    const currentPed = PlayerPedId();
    if (currentPed && canUseCameraZoom()) SetCurrentPedWeapon(currentPed, cameraZoomUnarmedHash, true);
  }, 0);
};

RegisterCommand(GameplayConfig.cameraZoom.zoomInCommand, () => {
  if (!canUseCameraZoom()) return;
  reserveZoomWheel();
  setCameraZoomLevel(cameraZoomLevel + 1);
}, false);

RegisterCommand(GameplayConfig.cameraZoom.zoomOutCommand, () => {
  if (cameraZoomLevel === 0) return;
  reserveZoomWheel();
  setCameraZoomLevel(cameraZoomLevel - 1);
}, false);

RegisterKeyMapping(
  GameplayConfig.cameraZoom.zoomInCommand,
  GameplayConfig.cameraZoom.zoomInDescription,
  'MOUSE_WHEEL',
  'IOM_WHEEL_UP'
);
RegisterKeyMapping(
  GameplayConfig.cameraZoom.zoomOutCommand,
  GameplayConfig.cameraZoom.zoomOutDescription,
  'MOUSE_WHEEL',
  'IOM_WHEEL_DOWN'
);
