import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const required = ['dist/server.js', 'dist/client.js', 'sdk/rumble.d.ts', 'src/server/services/event-bus.service.ts', 'src/server/services/idempotency.service.ts'];
for (const file of required) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing ${file}`);
}
const server = readFileSync(resolve(root, 'dist/server.js'), 'utf8');
for (const token of ['GetApiVersion', 'GetDiagnostics', 'CHARACTER_WRITE_CONFLICT', 'rumble:telemetry:query']) {
  if (!server.includes(token)) throw new Error(`Missing runtime token ${token}`);
}
console.log('architecture smoke test passed');
