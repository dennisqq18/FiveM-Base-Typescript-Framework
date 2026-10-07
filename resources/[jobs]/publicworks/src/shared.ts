type PublicWorksJobType = 'garbage' | 'sweeper';
type PublicWorksPhase = 'pickup' | 'carry' | 'work' | 'return' | 'settling';

interface PublicWorksPosition {
  x: number;
  y: number;
  z: number;
  heading?: number;
}

interface PublicWorksPoint {
  id: string;
  label: string;
  position: PublicWorksPosition;
}

interface PublicWorksZone {
  id: string;
  label: string;
  points: readonly PublicWorksPoint[];
}

const PublicWorksConfig = Object.freeze({
  depot: Object.freeze({
    label: 'Municipal Sanitation Center',
    position: Object.freeze({ x: -321.75, y: -1545.94, z: 31.02 }),
    vehicleSpawn: Object.freeze({ x: -334.28, y: -1529.04, z: 27.57, heading: 270.0 }),
    vehicleReturn: Object.freeze({ x: -334.28, y: -1529.04, z: 27.57 }),
  }),
  interactionRadius: 2.2,
  serverValidationRadius: 6.5,
  depotValidationRadius: 12.0,
  actionCooldownMs: 650,
  restartCooldownMs: 8000,
  maximumShiftMs: 90 * 60 * 1000,
  garbage: Object.freeze({
    vehicleModel: 'trash2',
    routeStopCount: 7,
    basePay: 240,
    payPerStop: 95,
    returnBonus: 325,
    minimumCarryMs: 900,
    stops: Object.freeze([
      Object.freeze({ id: 'strawberry-1', label: 'Strawberry Ave', position: Object.freeze({ x: 115.08, y: -1462.14, z: 29.29 }) }),
      Object.freeze({ id: 'grove-1', label: 'Grove Street', position: Object.freeze({ x: -7.44, y: -1565.86, z: 29.21 }) }),
      Object.freeze({ id: 'forum-1', label: 'Forum Drive', position: Object.freeze({ x: -146.72, y: -1726.87, z: 30.36 }) }),
      Object.freeze({ id: 'davis-1', label: 'Davis Avenue', position: Object.freeze({ x: 157.56, y: -1818.78, z: 27.99 }) }),
      Object.freeze({ id: 'rancho-1', label: 'Rancho', position: Object.freeze({ x: 359.14, y: -1810.38, z: 28.97 }) }),
      Object.freeze({ id: 'el-rancho-1', label: 'El Rancho Blvd', position: Object.freeze({ x: 481.08, y: -1278.62, z: 29.61 }) }),
      Object.freeze({ id: 'legion-1', label: 'Legion Square', position: Object.freeze({ x: 255.86, y: -984.26, z: 29.30 }) }),
      Object.freeze({ id: 'mission-row-1', label: 'Mission Row', position: Object.freeze({ x: 127.18, y: -1054.16, z: 29.19 }) }),
      Object.freeze({ id: 'vespucci-1', label: 'Vespucci Blvd', position: Object.freeze({ x: -141.12, y: -1377.26, z: 29.29 }) }),
      Object.freeze({ id: 'little-seoul-1', label: 'Little Seoul', position: Object.freeze({ x: -706.03, y: -915.36, z: 19.21 }) }),
      Object.freeze({ id: 'del-perro-1', label: 'Del Perro', position: Object.freeze({ x: -1223.76, y: -906.18, z: 12.33 }) }),
      Object.freeze({ id: 'morningwood-1', label: 'Morningwood', position: Object.freeze({ x: -1482.02, y: -379.56, z: 40.16 }) }),
      Object.freeze({ id: 'vespucci-beach-1', label: 'Vespucci Beach', position: Object.freeze({ x: -1185.72, y: -1490.43, z: 4.38 }) }),
      Object.freeze({ id: 'la-puerta-1', label: 'La Puerta', position: Object.freeze({ x: -1036.72, y: -1594.87, z: 5.00 }) }),
    ] as const),
  }),
  sweeper: Object.freeze({
    routeZoneCount: 2,
    basePay: 190,
    payPerPoint: 48,
    returnBonus: 260,
    cleanDurationMs: 5200,
    minimumServerCleanMs: 4200,
    litterModels: Object.freeze(['prop_rub_pile_03', 'prop_rub_pile_04', 'prop_cs_rub_binbag_01']),
    zones: Object.freeze([
      Object.freeze({
        id: 'legion-square',
        label: 'Legion Square',
        points: Object.freeze([
          Object.freeze({ id: 'legion-a', label: 'North path', position: Object.freeze({ x: 205.50, y: -927.72, z: 30.69 }) }),
          Object.freeze({ id: 'legion-b', label: 'West path', position: Object.freeze({ x: 190.21, y: -939.46, z: 30.69 }) }),
          Object.freeze({ id: 'legion-c', label: 'Fountain', position: Object.freeze({ x: 211.30, y: -948.08, z: 30.69 }) }),
          Object.freeze({ id: 'legion-d', label: 'South path', position: Object.freeze({ x: 225.17, y: -940.48, z: 30.69 }) }),
          Object.freeze({ id: 'legion-e', label: 'East corner', position: Object.freeze({ x: 228.82, y: -921.81, z: 30.69 }) }),
        ] as const),
      }),
      Object.freeze({
        id: 'vespucci-promenade',
        label: 'Vespucci Promenade',
        points: Object.freeze([
          Object.freeze({ id: 'vesp-a', label: 'Promenade 1', position: Object.freeze({ x: -1206.73, y: -1542.06, z: 4.38 }) }),
          Object.freeze({ id: 'vesp-b', label: 'Promenade 2', position: Object.freeze({ x: -1220.34, y: -1532.79, z: 4.37 }) }),
          Object.freeze({ id: 'vesp-c', label: 'Promenade 3', position: Object.freeze({ x: -1232.46, y: -1522.64, z: 4.35 }) }),
          Object.freeze({ id: 'vesp-d', label: 'Promenade 4', position: Object.freeze({ x: -1246.07, y: -1513.64, z: 4.35 }) }),
          Object.freeze({ id: 'vesp-e', label: 'Promenade 5', position: Object.freeze({ x: -1260.31, y: -1503.42, z: 4.34 }) }),
        ] as const),
      }),
      Object.freeze({
        id: 'mirror-park',
        label: 'Mirror Park',
        points: Object.freeze([
          Object.freeze({ id: 'mirror-a', label: 'Park 1', position: Object.freeze({ x: 1070.44, y: -650.16, z: 56.82 }) }),
          Object.freeze({ id: 'mirror-b', label: 'Park 2', position: Object.freeze({ x: 1083.23, y: -650.02, z: 56.77 }) }),
          Object.freeze({ id: 'mirror-c', label: 'Park 3', position: Object.freeze({ x: 1093.84, y: -639.50, z: 56.73 }) }),
          Object.freeze({ id: 'mirror-d', label: 'Park 4', position: Object.freeze({ x: 1086.77, y: -626.28, z: 56.72 }) }),
          Object.freeze({ id: 'mirror-e', label: 'Park 5', position: Object.freeze({ x: 1072.38, y: -629.92, z: 56.78 }) }),
        ] as const),
      }),
      Object.freeze({
        id: 'del-perro-walk',
        label: 'Del Perro Promenade',
        points: Object.freeze([
          Object.freeze({ id: 'del-a', label: 'Sidewalk 1', position: Object.freeze({ x: -1350.50, y: -1212.10, z: 4.71 }) }),
          Object.freeze({ id: 'del-b', label: 'Sidewalk 2', position: Object.freeze({ x: -1363.72, y: -1222.32, z: 4.70 }) }),
          Object.freeze({ id: 'del-c', label: 'Sidewalk 3', position: Object.freeze({ x: -1377.18, y: -1231.39, z: 4.70 }) }),
          Object.freeze({ id: 'del-d', label: 'Sidewalk 4', position: Object.freeze({ x: -1390.02, y: -1240.73, z: 4.68 }) }),
          Object.freeze({ id: 'del-e', label: 'Sidewalk 5', position: Object.freeze({ x: -1402.58, y: -1249.90, z: 4.67 }) }),
        ] as const),
      }),
    ] as const),
  }),
});
