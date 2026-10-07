const ActionsConfig = Object.freeze({
  handsUp: Object.freeze({
    command: 'rumble_handsup',
    key: 'X',
    description: 'Raise or lower your hands',
    animDict: 'random@mugging3',
    animName: 'handsup_standing_base'
  }),
  pointing: Object.freeze({
    command: 'rumble_point',
    key: 'B',
    description: 'Point with your finger',
    animDict: 'anim@mp_point',
    taskName: 'task_mp_pointing'
  })
});
