on('onClientResourceStart', (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
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

on('onResourceStop', (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
  stopAllGameplayActions();
});
