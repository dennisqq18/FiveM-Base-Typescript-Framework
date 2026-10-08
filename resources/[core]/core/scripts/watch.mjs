/** Keep legacy watch:server/watch:client working after replacing outFile. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [configArg, destinationArg] = process.argv.slice(2);
if (!configArg || !destinationArg) {
  console.error('Usage: node scripts/watch.mjs <tsconfig> <destination>');
  process.exit(2);
}
const win = process.platform === 'win32';
const child = spawn(win ? 'cmd.exe' : 'tsc',
  win ? ['/d', '/s', '/c', 'tsc', '-p', configArg, '--watch', '--pretty', 'false']
      : ['-p', configArg, '--watch', '--pretty', 'false'],
  { stdio: ['inherit', 'pipe', 'inherit'] });
let output = '';
child.stdout.on('data', chunk => {
  const part = chunk.toString();
  process.stdout.write(part);
  output = (output + part).slice(-5000);
  if (/Found 0 errors\. Watching for file changes\./.test(output)) {
    output = '';
    const runner = spawn(process.execPath,
      [path.join('scripts', 'bundle.mjs'), configArg, destinationArg],
      { stdio: 'inherit' });
    runner.on('error', error => console.error('[FiveM build]', error.message));
  }
});
child.on('exit', code => process.exit(code ?? 0));
