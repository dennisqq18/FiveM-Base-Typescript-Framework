on('onClientResourceStart', (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
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

on('onResourceStop', (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
  stopAllGameplayActions();
  destroyCameraZoom();
});
