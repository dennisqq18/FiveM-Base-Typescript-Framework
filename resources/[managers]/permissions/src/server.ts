const RESOURCE = GetCurrentResourceName();
const permissionsBySource = new Map<number, Set<string>>();

function normalizePermission(value: unknown): string | null {
  const permission = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9.*:_-]{1,96}$/.test(permission) ? permission : null;
}

function isCoreAdmin(source: number): boolean {
  if (source === 0) return true;
  if (GetResourceState('core') !== 'started') return false;
  try {
    return Boolean((globalThis as any).exports.core.IsAdmin(source));
  } catch {
    return false;
  }
}

function hasPermission(sourceInput: number, permissionInput: unknown): boolean {
  const source = Number(sourceInput);
  const permission = normalizePermission(permissionInput);
  if (!permission) return false;
  if (source === 0 || isCoreAdmin(source)) return true;
  const granted = permissionsBySource.get(source);
  if (!granted) return permission === 'player.basic';
  if (granted.has('*') || granted.has(permission)) return true;
  const parts = permission.split('.');
  while (parts.length > 1) {
    parts.pop();
    if (granted.has(`${parts.join('.')}.*`)) return true;
  }
  return permission === 'player.basic';
}

function grant(sourceInput: number, permissionInput: unknown): boolean {
  const source = Number(sourceInput);
  const permission = normalizePermission(permissionInput);
  if (!Number.isInteger(source) || source <= 0 || !permission) return false;
  const granted = permissionsBySource.get(source) ?? new Set<string>();
  granted.add(permission);
  permissionsBySource.set(source, granted);
  return true;
}

function revoke(sourceInput: number, permissionInput: unknown): boolean {
  const source = Number(sourceInput);
  const permission = normalizePermission(permissionInput);
  if (!permission) return false;
  const granted = permissionsBySource.get(source);
  if (!granted) return false;
  const changed = granted.delete(permission);
  if (granted.size === 0) permissionsBySource.delete(source);
  return changed;
}

on('playerDropped', () => {
  permissionsBySource.delete(Number((globalThis as any).source));
});

on('onResourceStart', (resourceName: string) => {
  if (resourceName !== RESOURCE) return;
  if (GetResourceState('runtime') === 'started') {
    try {
      (globalThis as any).exports.runtime.RegisterModule('permissions', '0.11.2', RESOURCE);
      (globalThis as any).exports.runtime.ReportHealth('permissions', 'healthy', {});
    } catch {}
  }
});

exports('HasPermission', hasPermission);
exports('GrantSessionPermission', grant);
exports('RevokeSessionPermission', revoke);
exports('GetSessionPermissions', (sourceInput: number) => Array.from(permissionsBySource.get(Number(sourceInput)) ?? []));
