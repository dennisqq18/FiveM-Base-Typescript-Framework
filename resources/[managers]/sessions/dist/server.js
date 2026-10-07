"use strict";
const RESOURCE = GetCurrentResourceName();
const sessionsBySource = new Map();
const sourceByIdentifier = new Map();
function getIdentifiers(source) {
    const result = [];
    const count = GetNumPlayerIdentifiers(source);
    for (let index = 0; index < count; index++) {
        const identifier = GetPlayerIdentifier(source, index);
        if (identifier)
            result.push(identifier);
    }
    return result;
}
function primaryIdentifier(source) {
    const identifiers = getIdentifiers(source);
    return identifiers.find((value) => value.startsWith('license:')) ?? identifiers.find((value) => value.startsWith('fivem:')) ?? identifiers[0] ?? `source:${source}`;
}
function updatePhase(source, phase, playerId = null, characterId = null) {
    const current = sessionsBySource.get(source);
    const identifier = current?.identifier ?? primaryIdentifier(source);
    const record = {
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
        const playerFactory = globalThis.Player;
        const player = typeof playerFactory === 'function' ? playerFactory(source) : null;
        if (player?.state?.set)
            player.state.set('rumbleSessionPhase', phase, true);
    }
    catch { }
}
function removeSession(source) {
    const record = sessionsBySource.get(source);
    if (record && sourceByIdentifier.get(record.identifier) === source)
        sourceByIdentifier.delete(record.identifier);
    sessionsBySource.delete(source);
}
on('playerConnecting', (_name, setKickReason) => {
    const source = Number(globalThis.source);
    const identifier = primaryIdentifier(source);
    const existing = sourceByIdentifier.get(identifier);
    if (existing && existing !== source && GetPlayerName(existing)) {
        setKickReason('This account already has an active Rumble session.');
        CancelEvent();
        return;
    }
    updatePhase(source, 'connecting');
});
on('rumble:server:playerConnected', (sourceInput, player) => {
    const source = Number(sourceInput);
    updatePhase(source, 'authenticated', Number(player?.playerId ?? player?.id ?? 0) || null, null);
});
on('rumble:server:characterSelection', (sourceInput) => {
    updatePhase(Number(sourceInput), 'character_selection');
});
on('rumble:server:characterLoaded', (sourceInput, player) => {
    updatePhase(Number(sourceInput), 'character_loaded', Number(player?.playerId ?? player?.id ?? 0) || null, Number(player?.character?.id ?? 0) || null);
});
on('rumble:server:playerLoaded', (sourceInput, player) => {
    updatePhase(Number(sourceInput), 'spawned', Number(player?.playerId ?? player?.id ?? 0) || null, Number(player?.character?.id ?? 0) || null);
});
on('rumble:server:playerUnloaded', (sourceInput) => {
    removeSession(Number(sourceInput));
});
on('playerDropped', () => {
    removeSession(Number(globalThis.source));
});
on('onResourceStart', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    if (GetResourceState('runtime') === 'started') {
        try {
            globalThis.exports.runtime.RegisterModule('sessions', '0.11.3', RESOURCE);
            globalThis.exports.runtime.ReportHealth('sessions', 'healthy', { active: sessionsBySource.size });
        }
        catch { }
    }
});
on('onResourceStop', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    sessionsBySource.clear();
    sourceByIdentifier.clear();
});
exports('GetPhase', (sourceInput) => sessionsBySource.get(Number(sourceInput))?.phase ?? null);
exports('GetSession', (sourceInput) => {
    const record = sessionsBySource.get(Number(sourceInput));
    return record ? { ...record } : null;
});
exports('GetSessions', () => Array.from(sessionsBySource.values()).map((record) => ({ ...record })));
