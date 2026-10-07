"use strict";
const RESOURCE = GetCurrentResourceName();
const modules = new Map();
const schedules = new Map();
let schedulerTimer = null;
let dependencyTimer = null;
const requiredResources = Object.freeze(['oxmysql', 'core', 'gameplay', 'sessions', 'permissions', 'observability', 'entities']);
function now() {
    return Date.now();
}
function validName(value) {
    const name = String(value ?? '').trim();
    return /^[a-zA-Z0-9_.:-]{1,64}$/.test(name) ? name : null;
}
function registerModule(nameInput, versionInput, resourceInput) {
    const name = validName(nameInput);
    if (!name)
        return false;
    const resource = String(resourceInput ?? GetInvokingResource() ?? name).trim().slice(0, 64) || name;
    modules.set(name, {
        name,
        version: String(versionInput ?? 'unknown').trim().slice(0, 32) || 'unknown',
        resource,
        state: 'starting',
        details: {},
        updatedAt: now(),
    });
    return true;
}
function reportHealth(nameInput, stateInput, detailsInput) {
    const name = validName(nameInput);
    if (!name)
        return false;
    const state = String(stateInput ?? '');
    if (!['starting', 'healthy', 'degraded', 'stopped'].includes(state))
        return false;
    const current = modules.get(name) ?? {
        name,
        version: 'unknown',
        resource: String(GetInvokingResource() ?? name),
        state: 'starting',
        details: {},
        updatedAt: now(),
    };
    current.state = state;
    current.details = detailsInput && typeof detailsInput === 'object' ? { ...detailsInput } : {};
    current.updatedAt = now();
    modules.set(name, current);
    emit('rumble:runtime:health', { ...current, details: { ...current.details } });
    return true;
}
function scheduleNext() {
    if (schedulerTimer)
        clearTimeout(schedulerTimer);
    schedulerTimer = null;
    if (schedules.size === 0)
        return;
    const current = now();
    let nearest = current + 60000;
    for (const task of schedules.values())
        nearest = Math.min(nearest, task.nextRun);
    schedulerTimer = setTimeout(runDueSchedules, Math.max(10, nearest - current));
}
function runDueSchedules() {
    schedulerTimer = null;
    const current = now();
    for (const task of schedules.values()) {
        if (task.nextRun > current)
            continue;
        task.nextRun = current + task.intervalMs;
        emit(task.eventName, task.payload);
    }
    scheduleNext();
}
function scheduleEvent(nameInput, intervalInput, eventInput, payload) {
    const name = validName(nameInput);
    const eventName = String(eventInput ?? '').trim();
    const intervalMs = Math.floor(Number(intervalInput));
    if (!name || !/^[a-zA-Z0-9_.:-]{1,96}$/.test(eventName) || !Number.isFinite(intervalMs) || intervalMs < 1000)
        return false;
    schedules.set(name, { name, eventName, intervalMs, nextRun: now() + intervalMs, payload: payload ?? null });
    scheduleNext();
    return true;
}
function cancelSchedule(nameInput) {
    const name = validName(nameInput);
    if (!name)
        return false;
    const removed = schedules.delete(name);
    scheduleNext();
    return removed;
}
function getModules() {
    return Array.from(modules.values()).map((entry) => ({ ...entry, details: { ...entry.details } }));
}
function getDependencyState() {
    const state = {};
    for (const resource of requiredResources)
        state[resource] = GetResourceState(resource);
    return state;
}
function checkDependencies() {
    const states = getDependencyState();
    const degraded = Object.entries(states).filter(([name, state]) => name !== RESOURCE && state !== 'started');
    reportHealth('runtime', degraded.length === 0 ? 'healthy' : 'degraded', { resources: states });
    dependencyTimer = setTimeout(checkDependencies, 30000);
}
function publish(nameInput, payload) {
    const name = validName(nameInput);
    if (!name)
        return false;
    emit(`rumble:event:${name}`, payload ?? null);
    return true;
}
on('onResourceStart', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    registerModule('runtime', '0.11.3', RESOURCE);
    reportHealth('runtime', 'starting', { resources: getDependencyState() });
    checkDependencies();
});
on('onResourceStop', (resourceName) => {
    for (const [name, module] of modules) {
        if (module.resource === resourceName)
            modules.delete(name);
    }
    if (resourceName !== RESOURCE)
        return;
    if (schedulerTimer)
        clearTimeout(schedulerTimer);
    if (dependencyTimer)
        clearTimeout(dependencyTimer);
    schedulerTimer = null;
    dependencyTimer = null;
    schedules.clear();
    modules.clear();
});
on('rumble:runtime:register', (name, version, resource) => {
    registerModule(name, version, resource);
});
on('rumble:runtime:reportHealth', (name, state, details) => {
    reportHealth(name, state, details);
});
exports('RegisterModule', registerModule);
exports('ReportHealth', reportHealth);
exports('GetModules', getModules);
exports('GetDependencyState', getDependencyState);
exports('ScheduleEvent', scheduleEvent);
exports('CancelSchedule', cancelSchedule);
exports('Publish', publish);
