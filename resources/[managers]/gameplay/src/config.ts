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
  cameraZoom: Object.freeze({
    enabled: true,
    zoomInCommand: 'rumble_camera_zoom_in',
    zoomOutCommand: 'rumble_camera_zoom_out',
    zoomInDescription: 'Zoom camera in while unarmed',
    zoomOutDescription: 'Zoom camera out while unarmed',
    maxLevel: 4,
    fovStep: 8.0,
    minimumFov: 22.0,
    interpolationSpeed: 13.0
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
