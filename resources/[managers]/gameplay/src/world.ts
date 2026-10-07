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
  'AMBIENT_GANG_HILLBILLY'
]);

const npcReactionTimes = new Map<number, number>();

const gameplayDelay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function applyPassiveNpcPolicy(player: number): void {
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

  if (GameplayConfig.world.disableWantedSystem) {
    SetMaxWantedLevel(0);
    ClearPlayerWantedLevel(player);
    SetPlayerWantedLevel(player, 0, false);
    SetPlayerWantedLevelNow(player, false);
  }

  if (GameplayConfig.world.disableAmbientPolice) {
    SetPoliceIgnorePlayer(player, true);
    SetDispatchCopsForPlayer(player, false);
    SetCreateRandomCops(false);
    SetCreateRandomCopsNotOnScenarios(false);
    SetCreateRandomCopsOnScenarios(false);

    for (let service = 1; service <= 15; service++) {
      EnableDispatchService(service, false);
    }
  }

  if (GameplayConfig.world.passiveAmbientNpcs) {
    applyPassiveNpcPolicy(player);
  }
}

async function requestNpcControl(ped: number): Promise<void> {
  if (!NetworkGetEntityIsNetworked(ped) || NetworkHasControlOfEntity(ped)) return;

  const deadline = Date.now() + GameplayConfig.world.networkControlTimeoutMs;
  NetworkRequestControlOfEntity(ped);

  while (!NetworkHasControlOfEntity(ped) && Date.now() < deadline) {
    await gameplayDelay(20);
    NetworkRequestControlOfEntity(ped);
  }
}

function canReactToNpcDamage(ped: number): boolean {
  if (!ped || !DoesEntityExist(ped) || !IsEntityAPed(ped) || IsPedAPlayer(ped) || IsEntityDead(ped)) return false;

  const now = Date.now();
  const last = npcReactionTimes.get(ped) ?? 0;
  if (now - last < GameplayConfig.world.npcReactionCooldownMs) return false;
  npcReactionTimes.set(ped, now);

  if (npcReactionTimes.size > 256) {
    for (const [entity, timestamp] of npcReactionTimes) {
      if (!DoesEntityExist(entity) || now - timestamp > 30000) npcReactionTimes.delete(entity);
    }
  }

  return true;
}

async function reactToPlayerDamage(victim: number, weaponHash: number): Promise<void> {
  if (!canReactToNpcDamage(victim)) return;

  const playerPed = PlayerPedId();
  await requestNpcControl(victim);
  if (!DoesEntityExist(victim) || IsEntityDead(victim)) return;

  const damageType = GetWeaponDamageType(weaponHash);
  const wasShot = GameplayConfig.world.firearmDamageTypes.includes(damageType);

  ClearPedTasks(victim);

  if (wasShot) {
    SetBlockingOfNonTemporaryEvents(victim, false);
    TaskCombatPed(victim, playerPed, 0, 16);
    return;
  }

  SetBlockingOfNonTemporaryEvents(victim, true);
  TaskSmartFleePed(
    victim,
    playerPed,
    GameplayConfig.world.npcFleeDistance,
    GameplayConfig.world.npcFleeDurationMs,
    false,
    false
  );

  setTimeout(() => {
    if (DoesEntityExist(victim) && !IsEntityDead(victim)) {
      SetBlockingOfNonTemporaryEvents(victim, false);
    }
  }, GameplayConfig.world.npcFleeDurationMs);
}

on('entityDamaged', (victim: number, culprit: number, weapon: number) => {
  if (!GameplayConfig.world.passiveAmbientNpcs) return;
  if (culprit !== PlayerPedId()) return;
  void reactToPlayerDamage(Number(victim), Number(weapon));
});
