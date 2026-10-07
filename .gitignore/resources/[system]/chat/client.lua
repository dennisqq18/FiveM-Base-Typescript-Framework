local open = false
local loaded = false

local function setOpen(state)
  open = state == true
  SetNuiFocus(open, open)
  SendNUIMessage({ type = open and 'open' or 'close' })
end

local function addMessage(message)
  if type(message) ~= 'table' then return end
  SendNUIMessage({ type = 'message', message = message })
end

RegisterNetEvent('chat:addMessage')
AddEventHandler('chat:addMessage', addMessage)

RegisterNetEvent('chat:addSuggestion')
AddEventHandler('chat:addSuggestion', function(name, help, params)
  SendNUIMessage({
    type = 'suggestion:add',
    suggestion = { name = name, help = help or '', params = params or {} }
  })
end)

RegisterNetEvent('chat:addSuggestions')
AddEventHandler('chat:addSuggestions', function(suggestions)
  if type(suggestions) ~= 'table' then return end
  for _, suggestion in ipairs(suggestions) do
    SendNUIMessage({ type = 'suggestion:add', suggestion = suggestion })
  end
end)

RegisterNetEvent('chat:removeSuggestion')
AddEventHandler('chat:removeSuggestion', function(name)
  SendNUIMessage({ type = 'suggestion:remove', name = name })
end)

RegisterNetEvent('chat:clear')
AddEventHandler('chat:clear', function()
  SendNUIMessage({ type = 'clear' })
end)

RegisterNetEvent('chat:addTemplate')
AddEventHandler('chat:addTemplate', function(id, html)
  SendNUIMessage({ type = 'template', id = id, html = html })
end)

RegisterNUICallback('ready', function(_, cb)
  loaded = true
  TriggerServerEvent('chat:init')
  cb({ ok = true })
end)

RegisterNUICallback('submit', function(data, cb)
  local text = type(data) == 'table' and tostring(data.text or '') or ''
  text = text:gsub('^%s+', ''):gsub('%s+$', '')
  setOpen(false)
  if text ~= '' then
    if text:sub(1, 1) == '/' then
      ExecuteCommand(text:sub(2))
    else
      TriggerServerEvent('_chat:messageEntered', GetPlayerName(PlayerId()), {255, 255, 255}, text)
    end
  end
  cb({ ok = true })
end)

RegisterNUICallback('close', function(_, cb)
  setOpen(false)
  cb({ ok = true })
end)

CreateThread(function()
  SetTextChatEnabled(false)
  while true do
    if open then
      Wait(0)
      DisableControlAction(0, 245, true)
      if IsControlJustPressed(0, 200) then
        setOpen(false)
      end
    else
      Wait(0)
      if loaded and IsControlJustPressed(0, 245) and not IsPauseMenuActive() then
        setOpen(true)
      end
    end
  end
end)
