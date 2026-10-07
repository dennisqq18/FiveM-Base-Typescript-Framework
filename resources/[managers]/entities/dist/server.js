"use strict";
const RESOURCE = GetCurrentResourceName();
function describeEntity(entityInput) {
    const entity = Number(entityInput);
    if (!Number.isInteger(entity) || entity <= 0 || !DoesEntityExist(entity))
        return null;
    return {
        entity,
        type: GetEntityType(entity),
        owner: NetworkGetEntityOwner(entity),
    };
}
function deleteEntitySafe(entityInput) {
    const entity = Number(entityInput);
    if (!Number.isInteger(entity) || entity <= 0 || !DoesEntityExist(entity))
        return false;
    DeleteEntity(entity);
    return !DoesEntityExist(entity);
}
on('onResourceStart', (resourceName) => {
    if (resourceName !== RESOURCE)
        return;
    if (GetResourceState('runtime') === 'started') {
        try {
            globalThis.exports.runtime.RegisterModule('entities', '0.11.2', RESOURCE);
            globalThis.exports.runtime.ReportHealth('entities', 'healthy', {});
        }
        catch { }
    }
});
exports('Exists', (entity) => DoesEntityExist(Number(entity)));
exports('GetOwner', (entity) => DoesEntityExist(Number(entity)) ? NetworkGetEntityOwner(Number(entity)) : 0);
exports('Describe', describeEntity);
exports('Delete', deleteEntitySafe);
