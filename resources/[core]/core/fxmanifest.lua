fx_version 'cerulean'
game 'gta5'

author 'Rumble Studios'
description 'Rumble - standalone TypeScript framework foundation for FiveM'
version '0.10.6'

node_version '22'

dependency 'oxmysql'
dependency '/onesync'

server_script 'dist/server.js'
client_script 'dist/client.js'

ui_page 'nui/index.html'

files {
    'nui/index.html',
    'nui/style.css',
    'nui/app.js'
}
