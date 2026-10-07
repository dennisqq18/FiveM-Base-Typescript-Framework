local maps = {}
local gametypes = {}

AddEventHandler('onClientResourceStart', function(resource)
  local resourceType = GetResourceMetadata(resource, 'resource_type', 0)
  if resourceType == 'map' then maps[resource] = true end
  if resourceType == 'gametype' then gametypes[resource] = true end
  if maps[resource] then TriggerEvent('onClientMapStart', resource) end
  if gametypes[resource] then TriggerEvent('onClientGameTypeStart', resource) end
end)

AddEventHandler('onClientResourceStop', function(resource)
  if maps[resource] then TriggerEvent('onClientMapStop', resource) maps[resource] = nil end
  if gametypes[resource] then TriggerEvent('onClientGameTypeStop', resource) gametypes[resource] = nil end
end)
