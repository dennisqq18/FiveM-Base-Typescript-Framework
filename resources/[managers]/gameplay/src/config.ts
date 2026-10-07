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
