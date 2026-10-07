const PASSIVE_NPC_RELATIONSHIP_GROUPS = Object.freeze([
  'HATES_PLAYER',
  'AMBIENT_GANG_LOST',
  'AMBIENT_GANG_MEXICAN',
  'AMBIENT_GANG_FAMILY',
  'AMBIENT_GANG_BALLAS',
  'AMBIENT_GANG_MARABUNTE',
  'AMBIENT_GANG_CULT',
  'AMBIENT_GANG_SALVA',
  'AMBIENT_GANG_WEICHENG',
  'AMBIENT_GANG_HILLBILLY',
]);

function applyPassiveNpcPolicy(player: number): void {
  SetEveryoneIgnorePlayer(player, true);
  SetPlayerCanBeHassledByGangs(player, false);
  SetIgnoreLowPriorityShockingEvents(player, true);

  const playerGroup = GetHashKey('PLAYER');
  for (const groupName of PASSIVE_NPC_RELATIONSHIP_GROUPS) {
    const group = GetHashKey(groupName);
    SetRelationshipBetweenGroups(2, group, playerGroup);
    SetRelationshipBetweenGroups(2, playerGroup, group);
  }
}

function applyWorldPolicy(): void {
  const player = PlayerId();

  if (ClientConfig.world.disableWantedSystem) {
    SetMaxWantedLevel(0);
    ClearPlayerWantedLevel(player);
    SetPlayerWantedLevel(player, 0, false);
    SetPlayerWantedLevelNow(player, false);
  }

  if (ClientConfig.world.disableAmbientPolice) {
    SetPoliceIgnorePlayer(player, true);
    SetDispatchCopsForPlayer(player, false);
    SetCreateRandomCops(false);
    SetCreateRandomCopsNotOnScenarios(false);
    SetCreateRandomCopsOnScenarios(false);

    for (let service = 1; service <= 15; service++) {
      EnableDispatchService(service, false);
    }
  }

  if (ClientConfig.world.disableAmbientNpcHostility) {
    applyPassiveNpcPolicy(player);
  }
}
