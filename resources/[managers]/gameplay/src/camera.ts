// GTA's follow-ped camera owns movement, mouse look, collision avoidance,
// and transitions. A separate scripted camera freezes the GTA gameplay camera
// as soon as RenderScriptCams(true) is called; copying that camera's position
// back to our scripted camera every frame therefore locks the view in place.
// Use GTA's built-in near/mid/far zoom presets instead: no camera override,
// no native per-frame loop, no forced weapon switch and no telemetry tick.
const cameraZoomUnarmedHash = GetHashKey('WEAPON_UNARMED');
const CAMERA_VIEW_CLOSE = 0;
const CAMERA_VIEW_FAR = 2;

const canUseCameraZoom = () => {
  const ped = PlayerPedId();
  return Boolean(
    ped &&
    DoesEntityExist(ped) &&
    !IsEntityDead(ped) &&
    !IsPedRagdoll(ped) &&
    !IsPedInAnyVehicle(ped, true) &&
    !IsPauseMenuActive() &&
    GetSelectedPedWeapon(ped) === cameraZoomUnarmedHash
  );
};

const changeCameraZoom = (direction: -1 | 1) => {
  if (!GameplayConfig.cameraZoom.enabled || !canUseCameraZoom()) return;
  const current = GetFollowPedCamViewMode();
  // Leave cinematic/first-person and any unknown modes under GTA's control.
  if (current < CAMERA_VIEW_CLOSE || current > CAMERA_VIEW_FAR) return;
  const next = Math.max(CAMERA_VIEW_CLOSE, Math.min(CAMERA_VIEW_FAR, current + direction));
  if (next !== current) SetFollowPedCamViewMode(next);
};

RegisterCommand(GameplayConfig.cameraZoom.zoomInCommand, () => changeCameraZoom(-1), false);
RegisterCommand(GameplayConfig.cameraZoom.zoomOutCommand, () => changeCameraZoom(1), false);

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
