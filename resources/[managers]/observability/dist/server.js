"use strict";
const RESOURCE = GetCurrentResourceName();
const VERSION = '0.13.1';
const SAMPLE_TTL_MS = 90_000;
const ALERT_COOLDOWN_MS = 60_000;
const MAX_SLOW_QUERIES = 30;
const ALLOWED_CLIENT_RESOURCES = new Set(['gameplay', 'publicworks']);
const startedAt = Date.now();
const queryTotals = { count: 0, failed: 0, slow: 0, totalMs: 0, maxMs: 0 };
const queryByLabel = new Map();
const slowQueries = [];
const clientSamples = new Map();
const alerts = [];
const alertCooldowns = new Map();
const lastClientSampleAt = new Map();
const heapSamples = [];
let securityRejected = 0;
let rpcCalls = 0;
let rpcFailures = 0;
let alertSequence = 0;
function isAdmin(playerSource) {
    if (playerSource === 0)
        return true;
    if (GetResourceState('core') !== 'started')
        return false;
    try {
        return Boolean(globalThis.exports.core.IsAdmin(playerSource));
    }
    catch {
        return false;
    }
}
function round(value, digits = 2) {
    if (!Number.isFinite(value))
        return 0;
    const power = 10 ** digits;
    return Math.round(value * power) / power;
}
function clampNumber(value, minimum, maximum) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return minimum;
    return Math.max(minimum, Math.min(maximum, parsed));
}
function cleanLabel(value) {
    return String(value ?? 'query').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 96) || 'query';
}
function getPlayersDiagnostics() {
    if (GetResourceState('core') !== 'started')
        return [];
    try {
        const value = globalThis.exports.core.GetPlayerDiagnostics();
        return Array.isArray(value) ? value : [];
    }
    catch {
        return [];
    }
}
function getCoreDiagnostics() {
    if (GetResourceState('core') !== 'started')
        return null;
    try {
        return globalThis.exports.core.GetDiagnostics();
    }
    catch {
        return null;
    }
}
function getRuntimeModules() {
    if (GetResourceState('runtime') !== 'started')
        return [];
    try {
        const modules = globalThis.exports.runtime.GetModules();
        return Array.isArray(modules) ? modules : [];
    }
    catch {
        return [];
    }
}
function resourceStates() {
    const result = [];
    const count = Math.max(0, Number(GetNumResources()));
    for (let index = 0; index < count; index++) {
        const name = GetResourceByFindIndex(index);
        if (!name)
            continue;
        result.push({ name, state: GetResourceState(name) });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
}
function cleanupSamples(now = Date.now()) {
    for (const [key, sample] of clientSamples) {
        if (now - sample.at > SAMPLE_TTL_MS)
            clientSamples.delete(key);
    }
}
function aggregateResourceSamples(now = Date.now()) {
    cleanupSamples(now);
    const grouped = new Map();
    for (const sample of clientSamples.values()) {
        const list = grouped.get(sample.resource) ?? [];
        list.push(sample);
        grouped.set(sample.resource, list);
    }
    return Array.from(grouped.entries()).map(([resource, samples]) => {
        const totalBusy = samples.reduce((sum, sample) => sum + sample.busyMs, 0);
        const totalWindow = samples.reduce((sum, sample) => sum + sample.windowMs, 0);
        const totalCallbacks = samples.reduce((sum, sample) => sum + sample.callbacks, 0);
        const maxCallbackMs = samples.reduce((max, sample) => Math.max(max, sample.maxCallbackMs), 0);
        const callbackWeighted = totalCallbacks > 0
            ? samples.reduce((sum, sample) => sum + sample.busyMs, 0) / totalCallbacks
            : 0;
        const workloadPct = totalWindow > 0 ? (totalBusy / totalWindow) * 100 : 0;
        return {
            resource,
            clients: samples.length,
            activeClients: samples.filter((sample) => sample.active).length,
            callbacks: totalCallbacks,
            callbacksPerSecond: round(samples.reduce((sum, sample) => sum + (sample.callbacks / Math.max(1, sample.windowMs)) * 1000, 0) / Math.max(1, samples.length), 2),
            averageCallbackMs: round(callbackWeighted, 3),
            maxCallbackMs: round(maxCallbackMs, 3),
            workloadPct: round(workloadPct, 3),
            lastSeen: Math.max(...samples.map((sample) => sample.at)),
            metricKind: 'instrumented-client-workload',
        };
    }).sort((a, b) => Number(b.workloadPct) - Number(a.workloadPct));
}
function pushAlert(kind, message, resource, value, cooldownKey) {
    const now = Date.now();
    const key = cooldownKey ?? `${kind}:${resource ?? 'global'}`;
    const last = alertCooldowns.get(key) ?? 0;
    if (now - last < ALERT_COOLDOWN_MS)
        return;
    alertCooldowns.set(key, now);
    const entry = { id: ++alertSequence, kind, message, resource, value, at: now };
    alerts.unshift(entry);
    if (alerts.length > 40)
        alerts.length = 40;
    for (const diagnostic of getPlayersDiagnostics()) {
        const playerSource = Number(diagnostic?.source ?? 0);
        if (playerSource > 0 && isAdmin(playerSource)) {
            emitNet('rumble:observability:alert', playerSource, entry);
        }
    }
    console.warn(`[RUMBLE][OBSERVABILITY][${kind.toUpperCase()}] ${message}`);
}
function inspectResourceSample(sample) {
    const workloadPct = sample.windowMs > 0 ? (sample.busyMs / sample.windowMs) * 100 : 0;
    const averageCallbackMs = sample.callbacks > 0 ? sample.busyMs / sample.callbacks : 0;
    if (sample.maxCallbackMs >= 5 || averageCallbackMs >= 0.55 || workloadPct >= 2.5) {
        pushAlert('resource-load', `${sample.resource}: avg ${round(averageCallbackMs, 3)}ms, max ${round(sample.maxCallbackMs, 3)}ms, workload ${round(workloadPct, 3)}%`, sample.resource, round(sample.maxCallbackMs, 3), `resource-load:${sample.resource}`);
    }
}
function querySnapshot() {
    const labels = Array.from(queryByLabel.entries()).map(([label, value]) => ({
        label,
        count: value.count,
        failed: value.failed,
        slow: value.slow,
        averageMs: value.count > 0 ? round(value.totalMs / value.count, 2) : 0,
        maxMs: round(value.maxMs, 2),
        totalMs: round(value.totalMs, 2),
    })).sort((a, b) => b.totalMs - a.totalMs).slice(0, 40);
    return {
        count: queryTotals.count,
        failed: queryTotals.failed,
        slow: queryTotals.slow,
        averageMs: queryTotals.count > 0 ? round(queryTotals.totalMs / queryTotals.count, 2) : 0,
        maxMs: round(queryTotals.maxMs, 2),
        totalMs: round(queryTotals.totalMs, 2),
        byLabel: labels,
        slowQueries: slowQueries.map((entry) => ({ ...entry })),
    };
}
function snapshot() {
    const memory = typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : null;
    const instrumentedResources = aggregateResourceSamples();
    const states = resourceStates();
    const samplesByName = new Map(instrumentedResources.map((entry) => [String(entry.resource), entry]));
    return {
        generatedAt: Date.now(),
        uptimeMs: Date.now() - startedAt,
        memory: memory ? {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external,
        } : null,
        queries: querySnapshot(),
        securityRejected,
        rpcCalls,
        rpcFailures,
        core: getCoreDiagnostics(),
        modules: getRuntimeModules(),
        players: getPlayersDiagnostics(),
        resources: states.map((entry) => ({ ...entry, instrumented: samplesByName.get(entry.name) ?? null })),
        instrumentedResources,
        alerts: alerts.map((entry) => ({ ...entry })),
        notes: {
            resourceMetric: 'Instrumented Rumble callback workload. FiveM resmon/profiler remains the authoritative per-resource CPU measurement.',
            sampleTtlMs: SAMPLE_TTL_MS,
        },
    };
}
function sampleMemory() {
    if (typeof process === 'undefined' || !process.memoryUsage)
        return;
    heapSamples.push(process.memoryUsage().heapUsed);
    if (heapSamples.length > 10)
        heapSamples.shift();
    if (heapSamples.length < 6)
        return;
    const growth = heapSamples[heapSamples.length - 1] - heapSamples[0];
    if (growth > 52_428_800)
        pushAlert('memory-growth', `Heap grew by ${Math.round(growth / 1_048_576)}MB across recent samples.`, RESOURCE, growth, 'heap-growth');
    if (GetResourceState('runtime') === 'started') {
        try {
            globalThis.exports.runtime.ReportHealth('observability', growth > 52_428_800 ? 'degraded' : 'healthy', { heapGrowthBytes: growth });
        }
        catch { }
    }
}
on('rumble:observability:sample', sampleMemory);
on('rumble:telemetry:query', (data) => {
    const durationMs = clampNumber(data?.durationMs, 0, 3_600_000);
    const failed = Boolean(data?.failed);
    const slow = Boolean(data?.slow);
    const label = cleanLabel(data?.label);
    queryTotals.count++;
    queryTotals.totalMs += durationMs;
    queryTotals.maxMs = Math.max(queryTotals.maxMs, durationMs);
    if (failed)
        queryTotals.failed++;
    if (slow)
        queryTotals.slow++;
    const aggregate = queryByLabel.get(label) ?? { count: 0, failed: 0, slow: 0, totalMs: 0, maxMs: 0 };
    aggregate.count++;
    aggregate.totalMs += durationMs;
    aggregate.maxMs = Math.max(aggregate.maxMs, durationMs);
    if (failed)
        aggregate.failed++;
    if (slow)
        aggregate.slow++;
    queryByLabel.set(label, aggregate);
    if (slow || failed) {
        slowQueries.unshift({ label, durationMs: round(durationMs, 2), failed, at: Date.now() });
        if (slowQueries.length > MAX_SLOW_QUERIES)
            slowQueries.length = MAX_SLOW_QUERIES;
    }
    if (durationMs >= 1000)
        pushAlert('slow-query', `${label} took ${round(durationMs, 1)}ms${failed ? ' and failed' : ''}.`, 'database', durationMs, `slow-query:${label}`);
});
on('rumble:telemetry:securityRejected', () => { securityRejected++; });
on('rumble:telemetry:rpc', (data) => { rpcCalls++; if (data?.failed)
    rpcFailures++; });
on('rumble:runtime:health', (module) => {
    if (String(module?.state ?? '') !== 'degraded')
        return;
    const name = String(module?.name ?? module?.resource ?? 'module').slice(0, 64);
    pushAlert('module-health', `${name} reported degraded health.`, String(module?.resource ?? name), undefined, `module-health:${name}`);
});
onNet('rumble:observability:clientResourceSample', (raw) => {
    const playerSource = Number(globalThis.source ?? 0);
    if (!Number.isInteger(playerSource) || playerSource <= 0)
        return;
    const resource = String(raw?.resource ?? '').trim().toLowerCase();
    if (!ALLOWED_CLIENT_RESOURCES.has(resource))
        return;
    const now = Date.now();
    const previousSampleAt = lastClientSampleAt.get(playerSource) ?? 0;
    if (now - previousSampleAt < 5000)
        return;
    lastClientSampleAt.set(playerSource, now);
    const windowMs = clampNumber(raw?.windowMs, 1000, 120_000);
    const callbacks = Math.floor(clampNumber(raw?.callbacks, 0, 5_000_000));
    const busyMs = clampNumber(raw?.busyMs, 0, windowMs);
    const maxCallbackMs = clampNumber(raw?.maxCallbackMs, 0, 1000);
    const sample = {
        source: playerSource,
        resource,
        windowMs,
        callbacks,
        busyMs,
        maxCallbackMs,
        active: Boolean(raw?.active),
        at: now,
    };
    clientSamples.set(`${playerSource}:${resource}`, sample);
    inspectResourceSample(sample);
});
onNet('rumble:observability:requestSnapshot', () => {
    const playerSource = Number(globalThis.source ?? 0);
    if (!isAdmin(playerSource))
        return;
    emitNet('rumble:observability:snapshot', playerSource, snapshot());
});
RegisterCommand('corestats', (playerSource) => {
    if (!isAdmin(playerSource))
        return;
    const data = snapshot();
    const core = data.core ?? {};
    const queries = data.queries;
    const text = `Rumble | players ${core.activeSessions ?? 0} | dirty ${core.dirtySessions ?? 0} | queries ${queries.count} | avg ${queries.averageMs}ms | slow ${queries.slow} | heap ${Math.round((data.memory?.heapUsed ?? 0) / 1_048_576)}MB`;
    if (playerSource === 0)
        console.log(text);
    else
        emitNet('chat:addMessage', playerSource, { color: [190, 130, 255], args: ['Rumble', text] });
}, false);
RegisterCommand('perf', (playerSource) => {
    if (!isAdmin(playerSource))
        return;
    if (playerSource === 0) {
        console.log(JSON.stringify(snapshot(), null, 2));
        return;
    }
    emitNet('rumble:observability:open', playerSource, snapshot());
}, false);
RegisterCommand('slowqueries', (playerSource) => {
    if (!isAdmin(playerSource))
        return;
    const entries = slowQueries.slice(0, 10);
    if (playerSource === 0) {
        if (entries.length === 0)
            console.log('[RUMBLE][OBSERVABILITY] No slow queries recorded.');
        for (const entry of entries)
            console.log(`[RUMBLE][SLOW QUERY] ${entry.label} ${entry.durationMs}ms${entry.failed ? ' FAILED' : ''}`);
        return;
    }
    emitNet('chat:addMessage', playerSource, {
        color: [255, 190, 80],
        multiline: true,
        args: ['Rumble', entries.length ? entries.map((entry) => `${entry.label}: ${entry.durationMs}ms${entry.failed ? ' FAILED' : ''}`).join('\n') : 'No slow queries recorded.'],
    });
}, false);
RegisterCommand('playerdiag', (playerSource, args) => {
    if (!isAdmin(playerSource))
        return;
    const target = Number(args?.[0] ?? playerSource);
    const diagnostic = getPlayersDiagnostics().find((entry) => Number(entry?.source) === target || Number(entry?.playerId) === target) ?? null;
    const text = diagnostic ? JSON.stringify(diagnostic) : `No diagnostics for ${target}.`;
    if (playerSource === 0)
        console.log(text);
    else
        emitNet('chat:addMessage', playerSource, { color: [160, 215, 255], multiline: true, args: ['Rumble Diagnostics', text] });
}, false);
on('playerDropped', () => {
    const playerSource = Number(globalThis.source ?? 0);
    for (const key of Array.from(clientSamples.keys())) {
        if (key.startsWith(`${playerSource}:`))
            clientSamples.delete(key);
    }
    lastClientSampleAt.delete(playerSource);
});
on('onResourceStart', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    if (GetResourceState('runtime') === 'started') {
        try {
            globalThis.exports.runtime.RegisterModule('observability', VERSION, RESOURCE);
            globalThis.exports.runtime.ReportHealth('observability', 'healthy', {});
            globalThis.exports.runtime.ScheduleEvent('observability.memory', 60_000, 'rumble:observability:sample', null);
        }
        catch { }
    }
});
on('onResourceStop', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    clientSamples.clear();
    queryByLabel.clear();
    alertCooldowns.clear();
    lastClientSampleAt.clear();
});
exports('GetMetrics', snapshot);
