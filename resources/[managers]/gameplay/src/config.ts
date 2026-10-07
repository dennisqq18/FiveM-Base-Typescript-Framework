const GameplayConfig = Object.freeze({
  actions: Object.freeze({
    handsUp: Object.freeze({
      command: 'rumble_handsup',
      key: 'X',
      description: 'Hold X to keep your hands up',
      animDict: 'random@mugging3',
      animName: 'handsup_standing_base',
      blendInSpeed: 8.0,
      blendOutSpeed: -8.0,
      flags: 49
    }),
    pointing: Object.freeze({
      command: 'rumble_point',
      key: 'B',
      description: 'Hold B to point',
      animDict: 'anim@mp_point',
      taskName: 'task_mp_pointing'
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
    zoomInDescription: 'Zoom in while unarmed',
    zoomOutDescription: 'Zoom out while unarmed',
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
