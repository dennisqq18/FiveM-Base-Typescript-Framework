RegisterNetEvent('chat:init')
RegisterNetEvent('chat:addTemplate')
RegisterNetEvent('chat:addMessage')
RegisterNetEvent('chat:addSuggestion')
RegisterNetEvent('chat:removeSuggestion')
RegisterNetEvent('_chat:messageEntered')
RegisterNetEvent('chat:clear')

local function suggestionsFor(player)
  if not GetRegisteredCommands then return end
  local suggestions = {}
  for _, command in ipairs(GetRegisteredCommands()) do
    if IsPlayerAceAllowed(player, ('command.%s'):format(command.name)) then
      suggestions[#suggestions + 1] = { name = '/' .. command.name, help = '', params = {} }
    end
  end
  TriggerClientEvent('chat:addSuggestions', player, suggestions)
end

AddEventHandler('_chat:messageEntered', function(author, color, message)
  local src = source
  if type(message) ~= 'string' or message == '' then return end
  if type(author) ~= 'string' or author == '' then author = GetPlayerName(src) or ('Player ' .. tostring(src)) end
  TriggerEvent('chatMessage', src, author, message)
  if WasEventCanceled() then return end
  TriggerClientEvent('chat:addMessage', -1, {
    color = type(color) == 'table' and color or {255, 255, 255},
    multiline = true,
    args = {author, message}
  })
  print(('%s: %s'):format(author, message))
end)

AddEventHandler('__cfx_internal:commandFallback', function(command)
  local src = source
  local name = GetPlayerName(src) or ('Player ' .. tostring(src))
  TriggerEvent('chatMessage', src, name, '/' .. command)
  if not WasEventCanceled() then
    TriggerClientEvent('chat:addMessage', src, {
      color = {255, 90, 90},
      multiline = true,
      args = {'SYSTEM', 'Unknown command: /' .. command}
    })
  end
  CancelEvent()
end)

AddEventHandler('chat:init', function()
  suggestionsFor(source)
end)

AddEventHandler('onServerResourceStart', function()
  Wait(500)
  for _, player in ipairs(GetPlayers()) do
    suggestionsFor(tonumber(player))
  end
end)

RegisterCommand('say', function(source, args)
  local message = table.concat(args, ' ')
  if message == '' then return end
  local name = source == 0 and 'console' or (GetPlayerName(source) or tostring(source))
  TriggerClientEvent('chat:addMessage', -1, {
    color = {255, 255, 255},
    multiline = true,
    args = {name, message}
  })
end, false)
