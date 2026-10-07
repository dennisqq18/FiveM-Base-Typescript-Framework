local spawnPoints = {}
local autoSpawn = false
local autoSpawnCallback = nil
local spawnLock = false
local force = false
local diedAt = nil

local function normalize(spawn)
  local model = spawn.model
  if model and type(model) == 'string' then model = GetHashKey(model) end
  return {
    x = tonumber(spawn.x or spawn[1]) or -1037.6,
    y = tonumber(spawn.y or spawn[2]) or -2737.8,
    z = tonumber(spawn.z or spawn[3]) or 20.2,
    heading = tonumber(spawn.heading or spawn[4]) or 0.0,
    model = model,
    skipFade = spawn.skipFade == true
  }
end

function addSpawnPoint(spawn)
  local value = normalize(spawn)
  value.idx = #spawnPoints + 1
  spawnPoints[#spawnPoints + 1] = value
  return value.idx
end

function removeSpawnPoint(index)
  for i = #spawnPoints, 1, -1 do
    if spawnPoints[i].idx == index then table.remove(spawnPoints, i) return true end
  end
  return false
end

function loadSpawns(jsonData)
  local data = json.decode(jsonData)
  if type(data) ~= 'table' or type(data.spawns) ~= 'table' then return false end
  for _, spawn in ipairs(data.spawns) do addSpawnPoint(spawn) end
  return true
end

function setAutoSpawn(enabled)
  autoSpawn = enabled == true
end

function setAutoSpawnCallback(callback)
  autoSpawnCallback = callback
  autoSpawn = true
end

function spawnPlayer(index, callback)
  if spawnLock then return end
  spawnLock = true
  CreateThread(function()
    local selected
    if type(index) == 'table' then selected = normalize(index) elseif #spawnPoints > 0 then selected = spawnPoints[tonumber(index) or math.random(1, #spawnPoints)] else selected = normalize({}) end
    if not selected.skipFade then
      DoScreenFadeOut(300)
      while not IsScreenFadedOut() do Wait(0) end
    end
    if selected.model then
      RequestModel(selected.model)
      local timeout = GetGameTimer() + 5000
      while not HasModelLoaded(selected.model) and GetGameTimer() < timeout do Wait(0) end
      if HasModelLoaded(selected.model) then
        SetPlayerModel(PlayerId(), selected.model)
        SetModelAsNoLongerNeeded(selected.model)
      end
    end
    local ped = PlayerPedId()
    RequestCollisionAtCoord(selected.x, selected.y, selected.z)
    SetEntityCoordsNoOffset(ped, selected.x, selected.y, selected.z, false, false, false, true)
    NetworkResurrectLocalPlayer(selected.x, selected.y, selected.z, selected.heading, true, true, false)
    ClearPedTasksImmediately(ped)
    ClearPlayerWantedLevel(PlayerId())
    FreezeEntityPosition(ped, false)
    SetEntityVisible(ped, true, false)
    SetEntityInvincible(ped, false)
    if not selected.skipFade then DoScreenFadeIn(300) end
    TriggerEvent('playerSpawned', selected)
    if callback then callback(selected) end
    spawnLock = false
  end)
end

function forceRespawn()
  force = true
end

CreateThread(function()
  while true do
    Wait(250)
    if autoSpawn and NetworkIsPlayerActive(PlayerId()) then
      local ped = PlayerPedId()
      if IsEntityDead(ped) then
        if not diedAt then diedAt = GetGameTimer() end
      else
        diedAt = nil
      end
      if force or (diedAt and GetGameTimer() - diedAt > 2000) then
        force = false
        diedAt = nil
        if autoSpawnCallback then autoSpawnCallback() else spawnPlayer() end
      end
    end
  end
end)

exports('spawnPlayer', spawnPlayer)
exports('addSpawnPoint', addSpawnPoint)
exports('removeSpawnPoint', removeSpawnPoint)
exports('loadSpawns', loadSpawns)
exports('setAutoSpawn', setAutoSpawn)
exports('setAutoSpawnCallback', setAutoSpawnCallback)
exports('forceRespawn', forceRespawn)
