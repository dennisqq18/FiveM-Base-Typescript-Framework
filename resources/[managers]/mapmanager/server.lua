local currentMap = nil
local currentGameType = nil

local function startResourceSafe(name)
  if type(name) ~= 'string' or name == '' then return false end
  local state = GetResourceState(name)
  if state == 'missing' or state == 'unknown' then return false end
  StartResource(name)
  return true
end

RegisterCommand('gametype', function(source, args)
  if source ~= 0 then return end
  local name = args[1]
  if currentGameType and currentGameType ~= name then StopResource(currentGameType) end
  if startResourceSafe(name) then currentGameType = name end
end, true)

RegisterCommand('map', function(source, args)
  if source ~= 0 then return end
  local name = args[1]
  if currentMap and currentMap ~= name then StopResource(currentMap) end
  if startResourceSafe(name) then currentMap = name end
end, true)

exports('getCurrentMap', function() return currentMap end)
exports('getCurrentGameType', function() return currentGameType end)
