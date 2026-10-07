# Rumble Framework

Rumble is a standalone FiveM framework built with TypeScript and JavaScript. It is designed as a clean development foundation for developers who want to build custom FiveM servers without depending on ESX, QBCore, Qbox, or vRP.

Rumble Framework is developed and maintained by the **Rumble Studios** team.

Discord: https://discord.gg/Sy3eEXsxfS

## Why Rumble Exists

The FiveM ecosystem is heavily focused on Lua. Developers who prefer TypeScript or JavaScript often have fewer modern standalone foundations to choose from and may need to rebuild essential systems before they can start working on their actual server features.

Rumble provides those foundations so you can start with a working base and focus on building your own gameplay, systems, and resources.

## Main Features

- TypeScript-first core
- standalone architecture
- MySQL or MariaDB persistence through oxmysql
- player sessions and caching
- character creation and selection
- spawn management
- cash and card balances
- hunger and thirst
- persistent health and armor
- metadata
- inventory backend
- item registry
- owned vehicle backend
- money transaction history
- structured logging
- typed callbacks and RPC
- event validation and rate limiting
- database repositories and migrations
- autosave
- health checks
- admin and developer commands
- React-based NUI where an interface is needed
- compatibility with Lua resources through FiveM events and exports

## Requirements

You need:

- Windows
- XAMPP or another MySQL/MariaDB installation
- a Cfx.re account
- a valid Cfx server license key
- internet access during the first setup

Node.js is not required only to start the server because the TypeScript source is already compiled into the `dist` directory. Node.js is required if you want to edit the TypeScript source and rebuild it.

## Folder Structure

```text
rumble-server/
├── artifacts/
├── database/
│   ├── install.sql
│   └── migrations/
├── resources/
│   ├── [core]/
│   │   └── core/
│   ├── [managers]/
│   │   ├── mapmanager/
│   │   └── spawnmanager/
│   ├── [system]/
│   │   ├── chat/
│   │   ├── hardcap/
│   │   └── sessionmanager/
│   └── [standalone]/
├── templates/
├── tools/
├── server.cfg
├── server.cfg.example
├── start.bat
├── setup-dependencies.bat
├── update-artifacts.bat
└── verify-server.bat
```

## Installation

### 1. Extract the Server

Extract the entire archive into a normal folder, for example:

```text
C:\FiveM\Rumble
```

Do not run files directly from WinRAR or another temporary archive folder.

### 2. Start XAMPP

Open XAMPP Control Panel and start:

```text
Apache
MySQL
```

MySQL must stay running while the FiveM server is running. Apache is only needed if you use phpMyAdmin through XAMPP.

### 3. Install the Database

Open:

```text
http://localhost/phpmyadmin
```

Choose **Import** and import:

```text
database/install.sql
```

For a fresh installation, only `install.sql` needs to be imported manually.

The files inside:

```text
database/migrations/
```

represent incremental database changes between framework versions. Do not manually import every migration on a fresh installation.

### 4. Configure MySQL

Open:

```text
server.cfg
```

The default XAMPP configuration uses:

```cfg
set mysql_connection_string "mysql://root@127.0.0.1/rumble?charset=utf8mb4"
```

If your MySQL user has a password, include it in the connection string.

Example:

```cfg
set mysql_connection_string "mysql://root:YOUR_PASSWORD@127.0.0.1/rumble?charset=utf8mb4"
```

If MySQL uses another port, include the port as well.

### 5. Add Your Cfx License Key

In `server.cfg`, replace:

```cfg
sv_licenseKey "CHANGE_ME_CFX_LICENSE_KEY"
```

with your real Cfx server license key.

Do not publish your real license key in a public repository.

### 6. Configure the Administrator

Rumble currently uses one administrator identifier with full access.

Replace:

```cfg
set rumble_admin_identifier "license:CHANGE_ME_ADMIN_LICENSE"
```

with your FiveM `license:` identifier.

The server can start without this value being configured, but admin commands will not work until it is set.

### 7. Start the Server

Make sure MySQL is running, then run:

```text
start.bat
```

The startup system checks the server structure and can prepare external dependencies required by the server.

The server runs directly through FXServer and does not require txAdmin.

### 8. Connect Locally

Open FiveM, press `F8`, and run:

```text
connect 127.0.0.1:30120
```

On the first connection, the character registration interface should appear. Enter:

```text
First Name
Last Name
Date of Birth
```

The character data will be stored in MySQL.

## Database Persistence

Rumble persists important player and character information including:

- player identifier
- active character
- first name
- last name
- date of birth
- citizen ID
- cash
- card balance
- hunger
- thirst
- health
- armor
- position
- metadata
- inventory
- owned vehicles
- money transactions
- framework logs

Active player data is cached in memory and persisted through controlled saves instead of performing unnecessary database queries for every operation.

## Basic Commands

Player and development commands include:

```text
/money
/cash
/card
/stats
/inv
/use
/chars
/characters
/newchar
/switchchar
/respawn
```

Administrator and development commands include:

```text
/fly
/gotow
/tp
/bring
/goto
/coords
/heading
/pos
/vehicle
/dv
/freeze
/heal
/revive
/ara
/spectate
/entity
/vehinfo
/fullstats
/hunger
/water
/health
/armor
/setmoney
/giveitem
/addvehicle
/healthcheck
```

## TypeScript Development

The source code for the core is located in:

```text
resources/[core]/core/src/
```

To work on the TypeScript source:

```powershell
cd "resources/[core]/core"
npm install
npm run typecheck
npm run build
```

The compiled files are generated in:

```text
dist/server.js
dist/client.js
```

A resource can access the core through FiveM exports.

Example:

```ts
const player = exports['core'].GetPlayer(source);
```

Money example:

```ts
await exports['core'].AddMoney(source, 'cash', 500, 'reward');
```

Inventory example:

```ts
await exports['core'].AddItem(source, 'water', 1);
```

## Utility Files

`start.bat` starts the server.

`setup-dependencies.bat` checks or prepares external dependencies.

`update-artifacts.bat` updates the FXServer artifacts handled by the project setup.

`verify-server.bat` checks that required server resources and files exist.

`templates/` contains a starter structure for creating new TypeScript resources and is not required at runtime.

`tools/` contains scripts used by the startup and setup process and should be kept while using the included startup scripts.

## Daily Startup

After the initial installation, the normal startup flow is:

```text
Start XAMPP
Start MySQL
Run start.bat
Open FiveM
Connect to the server
```

You do not need to re-import the database on every startup.

## Project Philosophy

Rumble aims to remain:

- server-authoritative
- TypeScript-first
- modular
- standalone
- easy to extend
- security-focused
- efficient with database operations
- compatible with the wider FiveM ecosystem

The framework is intended to provide the foundation, not decide what your server becomes.

## Rumble Studios

Rumble Framework is developed by **Rumble Studios**.

Discord: https://discord.gg/Sy3eEXsxfS
