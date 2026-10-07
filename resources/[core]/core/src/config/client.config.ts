const ClientConfig = Object.freeze({
  characterSceneCollisionTimeoutMs: 2000,
  spawnCollisionTimeoutMs: 2500,
  characterPreview: Object.freeze({
    model: 'mp_m_freemode_01',
    position: Object.freeze({ x: -1037.72, y: -2737.88, z: 20.17, heading: 329.0 }),
    cameraDistance: 2.25,
    cameraHeight: 0.72,
    cameraFov: 40.0,
  }),
  world: Object.freeze({
    disableWantedSystem: true,
    disableAmbientPolice: true,
    disableAmbientNpcHostility: true,
  }),
});
