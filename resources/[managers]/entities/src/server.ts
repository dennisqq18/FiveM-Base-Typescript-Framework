const RESOURCE = GetCurrentResourceName();

function describeEntity(entityInput: number): Record<string, any> | null {
  const entity = Number(entityInput);
  if (!Number.isInteger(entity) || entity <= 0 || !DoesEntityExist(entity)) return null;
  return {
    entity,
    type: GetEntityType(entity),
    owner: NetworkGetEntityOwner(entity),
  };
}

function deleteEntitySafe(entityInput: number): boolean {
  const entity = Number(entityInput);
  if (!Number.isInteger(entity) || entity <= 0 || !DoesEntityExist(entity)) return false;
  DeleteEntity(entity);
  return !DoesEntityExist(entity);
}

on('onResourceStart', (resourceName: string) => {
  if (resourceName !== RESOURCE) return;
  if (GetResourceState('runtime') === 'started') {
    try {
      (globalThis as any).exports.runtime.RegisterModule('entities', '0.11.2', RESOURCE);
      (globalThis as any).exports.runtime.ReportHealth('entities', 'healthy', {});
    } catch {}
  }
});

exports('Exists', (entity: number) => DoesEntityExist(Number(entity)));
exports('GetOwner', (entity: number) => DoesEntityExist(Number(entity)) ? NetworkGetEntityOwner(Number(entity)) : 0);
exports('Describe', describeEntity);
exports('Delete', deleteEntitySafe);
