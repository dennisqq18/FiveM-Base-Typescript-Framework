const RESOURCE = GetCurrentResourceName();

type ModuleState = 'starting' | 'healthy' | 'degraded' | 'stopped';

interface RuntimeModule {
  name: string;
  version: string;
  resource: string;
  state: ModuleState;
  details: Record<string, any>;
  updatedAt: number;
}

interface ScheduledEvent {
  name: string;
  eventName: string;
  intervalMs: number;
  nextRun: number;
  payload: any;
}

const modules = new Map<string, RuntimeModule>();
const schedules = new Map<string, ScheduledEvent>();
let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let dependencyTimer: ReturnType<typeof setTimeout> | null = null;

const requiredResources = Object.freeze(['oxmysql', 'core', 'gameplay', 'sessions', 'permissions', 'observability', 'entities']);

function now(): number {
  return Date.now();
}

function validName(value: unknown): string | null {
  const name = String(value ?? '').trim();
  return /^[a-zA-Z0-9_.:-]{1,64}$/.test(name) ? name : null;
}

function registerModule(nameInput: unknown, versionInput: unknown, resourceInput?: unknown): boolean {
  const name = validName(nameInput);
  if (!name) return false;
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

function reportHealth(nameInput: unknown, stateInput: unknown, detailsInput?: unknown): boolean {
  const name = validName(nameInput);
  if (!name) return false;
  const state = String(stateInput ?? '') as ModuleState;
  if (!['starting', 'healthy', 'degraded', 'stopped'].includes(state)) return false;
  const current = modules.get(name) ?? {
    name,
    version: 'unknown',
    resource: String(GetInvokingResource() ?? name),
    state: 'starting' as ModuleState,
    details: {},
    updatedAt: now(),
  };
  current.state = state;
  current.details = detailsInput && typeof detailsInput === 'object' ? { ...(detailsInput as Record<string, any>) } : {};
  current.updatedAt = now();
  modules.set(name, current);
  emit('rumble:runtime:health', { ...current, details: { ...current.details } });
  return true;
}

function scheduleNext(): void {
  if (schedulerTimer) clearTimeout(schedulerTimer);
  schedulerTimer = null;
  if (schedules.size === 0) return;
  const current = now();
  let nearest = current + 60000;
  for (const task of schedules.values()) nearest = Math.min(nearest, task.nextRun);
  schedulerTimer = setTimeout(runDueSchedules, Math.max(10, nearest - current));
}

function runDueSchedules(): void {
  schedulerTimer = null;
  const current = now();
  for (const task of schedules.values()) {
    if (task.nextRun > current) continue;
    task.nextRun = current + task.intervalMs;
    emit(task.eventName, task.payload);
  }
  scheduleNext();
}

function scheduleEvent(nameInput: unknown, intervalInput: unknown, eventInput: unknown, payload?: any): boolean {
  const name = validName(nameInput);
  const eventName = String(eventInput ?? '').trim();
  const intervalMs = Math.floor(Number(intervalInput));
  if (!name || !/^[a-zA-Z0-9_.:-]{1,96}$/.test(eventName) || !Number.isFinite(intervalMs) || intervalMs < 1000) return false;
  schedules.set(name, { name, eventName, intervalMs, nextRun: now() + intervalMs, payload: payload ?? null });
  scheduleNext();
  return true;
}

function cancelSchedule(nameInput: unknown): boolean {
  const name = validName(nameInput);
  if (!name) return false;
  const removed = schedules.delete(name);
  scheduleNext();
  return removed;
}

function getModules(): RuntimeModule[] {
  return Array.from(modules.values()).map((entry) => ({ ...entry, details: { ...entry.details } }));
}

function getDependencyState(): Record<string, string> {
  const state: Record<string, string> = {};
  for (const resource of requiredResources) state[resource] = GetResourceState(resource);
  return state;
}

function checkDependencies(): void {
  const states = getDependencyState();
  const degraded = Object.entries(states).filter(([name, state]) => name !== RESOURCE && state !== 'started');
  reportHealth('runtime', degraded.length === 0 ? 'healthy' : 'degraded', { resources: states });
  dependencyTimer = setTimeout(checkDependencies, 30000);
}

function publish(nameInput: unknown, payload?: any): boolean {
  const name = validName(nameInput);
  if (!name) return false;
  emit(`rumble:event:${name}`, payload ?? null);
  return true;
}

on('onResourceStart', (resourceName: string) => {
  if (resourceName !== RESOURCE) return;
  registerModule('runtime', '0.11.3', RESOURCE);
  reportHealth('runtime', 'starting', { resources: getDependencyState() });
  checkDependencies();
});

on('onResourceStop', (resourceName: string) => {
  for (const [name, module] of modules) {
    if (module.resource === resourceName) modules.delete(name);
  }
  if (resourceName !== RESOURCE) return;
  if (schedulerTimer) clearTimeout(schedulerTimer);
  if (dependencyTimer) clearTimeout(dependencyTimer);
  schedulerTimer = null;
  dependencyTimer = null;
  schedules.clear();
  modules.clear();
});

on('rumble:runtime:register', (name: string, version: string, resource?: string) => {
  registerModule(name, version, resource);
});

on('rumble:runtime:reportHealth', (name: string, state: ModuleState, details?: Record<string, any>) => {
  reportHealth(name, state, details);
});

exports('RegisterModule', registerModule);
exports('ReportHealth', reportHealth);
exports('GetModules', getModules);
exports('GetDependencyState', getDependencyState);
exports('ScheduleEvent', scheduleEvent);
exports('CancelSchedule', cancelSchedule);
exports('Publish', publish);
