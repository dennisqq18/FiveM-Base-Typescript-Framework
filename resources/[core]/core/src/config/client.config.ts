const ClientConfig = Object.freeze({
  spawnCollisionTimeoutMs: 4000,
  defaultPlayerModel: 'mp_m_freemode_01',
  modelLoadTimeoutMs: 10000,
  characterCinematic: Object.freeze({
    fov: 48.0,
    focusRefreshMs: 500,
    scenes: Object.freeze([
      Object.freeze({
        id: 'los-santos',
        shots: Object.freeze([
          Object.freeze({
            from: Object.freeze({ x: -760.0, y: -1150.0, z: 430.0 }),
            to: Object.freeze({ x: 520.0, y: -930.0, z: 320.0 }),
            lookAt: Object.freeze({ x: 80.0, y: -850.0, z: 70.0 }),
            durationMs: 12000,
          }),
          Object.freeze({
            from: Object.freeze({ x: 680.0, y: -180.0, z: 360.0 }),
            to: Object.freeze({ x: -520.0, y: 260.0, z: 315.0 }),
            lookAt: Object.freeze({ x: -40.0, y: 20.0, z: 85.0 }),
            durationMs: 11000,
          }),
        ]),
      }),
      Object.freeze({
        id: 'sandy-shores',
        shots: Object.freeze([
          Object.freeze({
            from: Object.freeze({ x: 1120.0, y: 2920.0, z: 300.0 }),
            to: Object.freeze({ x: 2050.0, y: 3560.0, z: 255.0 }),
            lookAt: Object.freeze({ x: 1700.0, y: 3600.0, z: 55.0 }),
            durationMs: 12000,
          }),
          Object.freeze({
            from: Object.freeze({ x: 2050.0, y: 3560.0, z: 255.0 }),
            to: Object.freeze({ x: 1350.0, y: 3950.0, z: 285.0 }),
            lookAt: Object.freeze({ x: 1650.0, y: 3650.0, z: 50.0 }),
            durationMs: 11000,
          }),
        ]),
      }),
      Object.freeze({
        id: 'paleto-bay',
        shots: Object.freeze([
          Object.freeze({
            from: Object.freeze({ x: -920.0, y: 6150.0, z: 300.0 }),
            to: Object.freeze({ x: 320.0, y: 6570.0, z: 250.0 }),
            lookAt: Object.freeze({ x: -80.0, y: 6420.0, z: 55.0 }),
            durationMs: 12000,
          }),
          Object.freeze({
            from: Object.freeze({ x: 260.0, y: 6570.0, z: 250.0 }),
            to: Object.freeze({ x: -720.0, y: 6350.0, z: 280.0 }),
            lookAt: Object.freeze({ x: -120.0, y: 6420.0, z: 50.0 }),
            durationMs: 11000,
          }),
        ]),
      }),
    ]),
  }),
});
