"use strict";
const RESOURCE = GetCurrentResourceName();
const startedAt = Date.now();
const queryMetrics = { count: 0, failed: 0, slow: 0, totalMs: 0, maxMs: 0, lastSlow: [] };
let securityRejected = 0;
let rpcCalls = 0;
let rpcFailures = 0;
const heapSamples = [];
function isAdmin(source) {
    if (source === 0)
        return true;
    if (GetResourceState('core') !== 'started')
        return false;
    try {
        return Boolean(globalThis.exports.core.IsAdmin(source));
    }
    catch {
        return false;
    }
}
function snapshot() {
    const memory = typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : null;
    let core = null;
    let modules = [];
    try {
        if (GetResourceState('core') === 'started')
            core = globalThis.exports.core.GetDiagnostics();
    }
    catch { }
    try {
        if (GetResourceState('runtime') === 'started')
            modules = globalThis.exports.runtime.GetModules();
    }
    catch { }
    return {
        uptimeMs: Date.now() - startedAt,
        memory: memory ? { rss: memory.rss, heapUsed: memory.heapUsed, heapTotal: memory.heapTotal, external: memory.external } : null,
        queries: {
            ...queryMetrics,
            averageMs: queryMetrics.count > 0 ? Number((queryMetrics.totalMs / queryMetrics.count).toFixed(2)) : 0,
            lastSlow: queryMetrics.lastSlow.map((entry) => ({ ...entry })),
        },
        securityRejected,
        rpcCalls,
        rpcFailures,
        core,
        modules,
    };
}
function sampleMemory() {
    if (typeof process === 'undefined' || !process.memoryUsage)
        return;
    heapSamples.push(process.memoryUsage().heapUsed);
    if (heapSamples.length > 10)
        heapSamples.shift();
    if (heapSamples.length < 6 || GetResourceState('runtime') !== 'started')
        return;
    const growth = heapSamples[heapSamples.length - 1] - heapSamples[0];
    try {
        globalThis.exports.runtime.ReportHealth('observability', growth > 52428800 ? 'degraded' : 'healthy', { heapGrowthBytes: growth });
    }
    catch { }
}
on('rumble:observability:sample', () => {
    sampleMemory();
});
on('rumble:telemetry:query', (data) => {
    const durationMs = Number(data?.durationMs ?? 0);
    queryMetrics.count++;
    queryMetrics.totalMs += Number.isFinite(durationMs) ? durationMs : 0;
    queryMetrics.maxMs = Math.max(queryMetrics.maxMs, Number.isFinite(durationMs) ? durationMs : 0);
    if (data?.failed)
        queryMetrics.failed++;
    if (data?.slow) {
        queryMetrics.slow++;
        queryMetrics.lastSlow.unshift({ label: String(data?.label ?? 'query').slice(0, 96), durationMs, at: Date.now() });
        if (queryMetrics.lastSlow.length > 10)
            queryMetrics.lastSlow.length = 10;
    }
});
on('rumble:telemetry:securityRejected', () => {
    securityRejected++;
});
on('rumble:telemetry:rpc', (data) => {
    rpcCalls++;
    if (data?.failed)
        rpcFailures++;
});
RegisterCommand('corestats', (source) => {
    if (!isAdmin(source))
        return;
    const data = snapshot();
    const core = data.core ?? {};
    const queries = data.queries;
    const text = `Rumble | players ${core.activeSessions ?? 0} | pending ${core.dirtySessions ?? 0} | queries ${queries.count} | avg ${queries.averageMs}ms | slow ${queries.slow} | heap ${Math.round((data.memory?.heapUsed ?? 0) / 1048576)}MB`;
    if (source === 0) {
        console.log(text);
        return;
    }
    emitNet('chat:addMessage', source, { color: [255, 255, 255], multiline: false, args: ['^5Rumble', text] });
}, false);
on('onResourceStart', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    if (GetResourceState('runtime') === 'started') {
        try {
            globalThis.exports.runtime.RegisterModule('observability', '0.11.3', RESOURCE);
            globalThis.exports.runtime.ReportHealth('observability', 'healthy', {});
            globalThis.exports.runtime.ScheduleEvent('observability.memory', 60000, 'rumble:observability:sample', null);
        }
        catch { }
    }
});
exports('GetMetrics', snapshot);
