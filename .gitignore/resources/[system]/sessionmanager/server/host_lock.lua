AddEventHandler('playerConnecting', function()
  if GetConvar('onesync', 'off') == 'off' then
    local src = source
    if src and src > 0 then
      Player(src).state:set('sessionReady', true, true)
    end
  end
end)
