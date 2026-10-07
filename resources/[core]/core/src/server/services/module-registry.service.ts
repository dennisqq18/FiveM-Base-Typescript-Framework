interface CoreModuleState {
  name: string;
  version: string;
  status: 'healthy' | 'degraded';
  updatedAt: number;
}

const coreModules = new Map<string, CoreModuleState>();

function registerCoreModule(nameInput: unknown, versionInput: unknown): boolean {
  const name = String(nameInput ?? '').trim();
  if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(name)) return false;
  coreModules.set(name, { name, version: String(versionInput ?? 'unknown').slice(0, 32), status: 'healthy', updatedAt: Date.now() });
  return true;
}

function getCoreModules(): CoreModuleState[] {
  return Array.from(coreModules.values()).map((entry) => ({ ...entry }));
}
