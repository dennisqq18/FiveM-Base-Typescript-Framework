# Rumble Public Works

Server-authoritative resource providing two civilian jobs: advanced garbage collection and city cleaning / street sweeping.

The resource is started through `ensure publicworks` in `server.cfg` and depends on `core` and OneSync.

At the Municipal Sanitation Center:

- `E` starts garbage collection.
- `G` starts city cleaning / street sweeping.

Commands:

- `/jobstats` shows persistent XP, level, completed shifts, tasks, and earnings.
- `/stopjob` cancels the active shift without paying an incomplete route.

Progress is stored through core metadata under `jobs.publicworks`. Payment is processed server-side through `core.AddMoney`. Important actions validate the player's OneSync position, route step, cooldown, and service vehicle before advancing the job.
