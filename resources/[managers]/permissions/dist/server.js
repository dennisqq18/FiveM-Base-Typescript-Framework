"use strict";
const RESOURCE = GetCurrentResourceName();
const permissionsBySource = new Map();
function normalizePermission(value) {
    const permission = String(value ?? '').trim().toLowerCase();
    return /^[a-z0-9.*:_-]{1,96}$/.test(permission) ? permission : null;
}
function isCoreAdmin(source) {
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
function hasPermission(sourceInput, permissionInput) {
    const source = Number(sourceInput);
    const permission = normalizePermission(permissionInput);
    if (!permission)
        return false;
    if (source === 0 || isCoreAdmin(source))
        return true;
    const granted = permissionsBySource.get(source);
    if (!granted)
        return permission === 'player.basic';
    if (granted.has('*') || granted.has(permission))
        return true;
    const parts = permission.split('.');
    while (parts.length > 1) {
        parts.pop();
        if (granted.has(`${parts.join('.')}.*`))
            return true;
    }
    return permission === 'player.basic';
}
function grant(sourceInput, permissionInput) {
    const source = Number(sourceInput);
    const permission = normalizePermission(permissionInput);
    if (!Number.isInteger(source) || source <= 0 || !permission)
        return false;
    const granted = permissionsBySource.get(source) ?? new Set();
    granted.add(permission);
    permissionsBySource.set(source, granted);
    return true;
}
function revoke(sourceInput, permissionInput) {
    const source = Number(sourceInput);
    const permission = normalizePermission(permissionInput);
    if (!permission)
        return false;
    const granted = permissionsBySource.get(source);
    if (!granted)
        return false;
    const changed = granted.delete(permission);
    if (granted.size === 0)
        permissionsBySource.delete(source);
    return changed;
}
on('playerDropped', () => {
    permissionsBySource.delete(Number(globalThis.source));
});
on('onResourceStart', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    if (GetResourceState('runtime') === 'started') {
        try {
            globalThis.exports.runtime.RegisterModule('permissions', '0.11.2', RESOURCE);
            globalThis.exports.runtime.ReportHealth('permissions', 'healthy', {});
        }
        catch { }
    }
});
exports('HasPermission', hasPermission);
exports('GrantSessionPermission', grant);
exports('RevokeSessionPermission', revoke);
exports('GetSessionPermissions', (sourceInput) => Array.from(permissionsBySource.get(Number(sourceInput)) ?? []));
