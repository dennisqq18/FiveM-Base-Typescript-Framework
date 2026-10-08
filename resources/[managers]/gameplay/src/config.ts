const GameplayConfig = Object.freeze({
  actions: Object.freeze({
    monitorIntervalMs: 125,
    handsUp: Object.freeze({
      command: 'rumble_handsup',
      key: 'X',
      description: 'Hold X to keep your hands up',
      animDict: 'random@mugging3',
      animName: 'handsup_standing_base',
      blendInSpeed: 8.0,
      blendOutSpeed: -8.0,
      flags: 49,
      animCheckIntervalMs: 375
    }),
    pointing: Object.freeze({
      // New command id intentionally gives existing FiveM profiles a fresh default B bind.
      command: 'rumble_point_hold_v2',
      key: 'B',
      description: 'Hold B to point with your finger',
      animDict: 'anim@mp_point',
      taskName: 'task_mp_pointing',
      signalIntervalMs: 34,
      collisionProbeIntervalMs: 170
    })
  }),
  crouch: Object.freeze({
    leftCommand: 'rumble_crouch_left',
    rightCommand: 'rumble_crouch_right',
    leftKey: 'LCONTROL',
    rightKey: 'RCONTROL',
    description: 'Roleplay crouch (Left CTRL)',
    alternateDescription: 'Roleplay crouch (Right CTRL)',
    movementClipset: 'move_ped_crouched',
    strafeClipset: 'move_ped_crouched_strafing',
    blendInSpeed: 0.25,
    blendOutSpeed: 0.25
  }),
  combat: Object.freeze({
    sprintMeleeMinimumSpeed: 1.75
  }),
  cameraZoom: Object.freeze({
    enabled: true,
    zoomInCommand: 'rumble_camera_zoom_in',
    zoomOutCommand: 'rumble_camera_zoom_out',
    zoomInDescription: 'Zoom camera in while unarmed',
    zoomOutDescription: 'Zoom camera out while unarmed'
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
