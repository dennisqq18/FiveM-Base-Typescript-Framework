AddEventHandler('playerConnecting', function(_, _, deferrals)
  local src = source
  local maxClients = GetConvarInt('sv_maxclients', 32)
  local count = #GetPlayers()
  if count < maxClients then return end
  deferrals.defer()
  Wait(0)
  deferrals.done(('Server plin (%d/%d).'):format(count, maxClients))
  CancelEvent()
end)
