const RESOURCE = GetCurrentResourceName();

type SessionPhase = 'connecting' | 'authenticated' | 'character_selection' | 'character_loaded' | 'spawned';

interface SessionRecord {
  source: number;
  identifier: string;
  phase: SessionPhase;
  playerId: number | null;
  characterId: number | null;
  connectedAt: number;
  updatedAt: number;
}

const sessionsBySource = new Map<number, SessionRecord>();
const sourceByIdentifier = new Map<string, number>();

function getIdentifiers(source: number): string[] {
  const result: string[] = [];
  const count = GetNumPlayerIdentifiers(source);
  for (let index = 0; index < count; index++) {
    const identifier = GetPlayerIdentifier(source, index);
    if (identifier) result.push(identifier);
  }
  return result;
}

function primaryIdentifier(source: number): string {
  const identifiers = getIdentifiers(source);
  return identifiers.find((value) => value.startsWith('license:')) ?? identifiers.find((value) => value.startsWith('fivem:')) ?? identifiers[0] ?? `source:${source}`;
}

function updatePhase(source: number, phase: SessionPhase, playerId: number | null = null, characterId: number | null = null): void {
  const current = sessionsBySource.get(source);
  const identifier = current?.identifier ?? primaryIdentifier(source);
  const record: SessionRecord = {
    source,
    identifier,
    phase,
    playerId: playerId ?? current?.playerId ?? null,
    characterId: characterId ?? current?.characterId ?? null,
    connectedAt: current?.connectedAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  sessionsBySource.set(source, record);
  sourceByIdentifier.set(identifier, source);
  try {
    const playerFactory = (globalThis as any).Player;
    const player = typeof playerFactory === 'function' ? playerFactory(source) : null;
    if (player?.state?.set) player.state.set('rumbleSessionPhase', phase, true);
  } catch {}
}

function removeSession(source: number): void {
  const record = sessionsBySource.get(source);
  if (record && sourceByIdentifier.get(record.identifier) === source) sourceByIdentifier.delete(record.identifier);
  sessionsBySource.delete(source);
}

on('playerConnecting', (_name: string, setKickReason: (reason: string) => void) => {
  const source = Number((globalThis as any).source);
  const identifier = primaryIdentifier(source);
  const existing = sourceByIdentifier.get(identifier);
  if (existing && existing !== source && GetPlayerName(existing)) {
    setKickReason('This account already has an active Rumble session.');
    CancelEvent();
    return;
  }
  updatePhase(source, 'connecting');
});

on('rumble:server:playerConnected', (sourceInput: number, player: any) => {
  const source = Number(sourceInput);
  updatePhase(source, 'authenticated', Number(player?.playerId ?? player?.id ?? 0) || null, null);
});

on('rumble:server:characterSelection', (sourceInput: number) => {
  updatePhase(Number(sourceInput), 'character_selection');
});

on('rumble:server:characterLoaded', (sourceInput: number, player: any) => {
  updatePhase(Number(sourceInput), 'character_loaded', Number(player?.playerId ?? player?.id ?? 0) || null, Number(player?.character?.id ?? 0) || null);
});

on('rumble:server:playerLoaded', (sourceInput: number, player: any) => {
  updatePhase(Number(sourceInput), 'spawned', Number(player?.playerId ?? player?.id ?? 0) || null, Number(player?.character?.id ?? 0) || null);
});

on('rumble:server:playerUnloaded', (sourceInput: number) => {
  removeSession(Number(sourceInput));
});

on('playerDropped', () => {
  removeSession(Number((globalThis as any).source));
});

on('onResourceStart', (resourceName: string) => {
  if (resourceName !== RESOURCE) return;
  if (GetResourceState('runtime') === 'started') {
    try {
      (globalThis as any).exports.runtime.RegisterModule('sessions', '0.11.3', RESOURCE);
      (globalThis as any).exports.runtime.ReportHealth('sessions', 'healthy', { active: sessionsBySource.size });
    } catch {}
  }
});

on('onResourceStop', (resourceName: string) => {
  if (resourceName !== RESOURCE) return;
  sessionsBySource.clear();
  sourceByIdentifier.clear();
});

exports('GetPhase', (sourceInput: number) => sessionsBySource.get(Number(sourceInput))?.phase ?? null);
exports('GetSession', (sourceInput: number) => {
  const record = sessionsBySource.get(Number(sourceInput));
  return record ? { ...record } : null;
});
exports('GetSessions', () => Array.from(sessionsBySource.values()).map((record) => ({ ...record })));
