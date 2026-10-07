const DEFAULT_SPAWN: Position = {
  x: -1037.72,
  y: -2737.88,
  z: 20.17,
  heading: 329.0,
};

const SPAWNS = Object.freeze({
  last: { id: 'last', label: 'Last location' },
  airport: { id: 'airport', label: 'Airport', position: DEFAULT_SPAWN },
  legion: { id: 'legion', label: 'Legion Square', position: { x: 215.76, y: -810.12, z: 30.73, heading: 158.0 } },
  hospital: { id: 'hospital', label: 'Pillbox Hospital', position: { x: 298.18, y: -584.45, z: 43.26, heading: 70.0 } },
});

const ITEM_DEFINITIONS: Record<string, ItemDefinition> = Object.freeze({
  water: { name: 'water', label: 'Water', weight: 500, stackable: true, usable: true },
  sandwich: { name: 'sandwich', label: 'Sandwich', weight: 350, stackable: true, usable: true },
  medkit: { name: 'medkit', label: 'Medkit', weight: 900, stackable: true, usable: true },
  armor: { name: 'armor', label: 'Body armor', weight: 2500, stackable: true, usable: true },
});
