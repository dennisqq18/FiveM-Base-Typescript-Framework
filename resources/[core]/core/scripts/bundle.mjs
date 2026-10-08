/** Bundle TypeScript's script-mode output in manifest order for FiveM.
 * Replaces the deprecated compilerOptions.outFile while retaining one JS entrypoint.
 * Usage: node scripts/bundle.mjs <tsconfig.json> <dist/client.js|dist/server.js>
 */
import fs from 'node:fs';
import path from 'node:path';

const [configArg, destinationArg] = process.argv.slice(2);
if (!configArg || !destinationArg) {
  console.error('Usage: node scripts/bundle.mjs <tsconfig> <destination>');
  process.exit(2);
}
const configFile = path.resolve(configArg);
const cwd = path.dirname(configFile);
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const options = config.compilerOptions ?? {};
const sourceRoot = path.resolve(cwd, options.rootDir ?? 'src');
const outputRoot = path.resolve(cwd, options.outDir ?? 'dist');
const sourceFiles = (config.files ?? []).filter(name => /\.tsx?$/.test(name) && !/\.d\.ts$/.test(name));
if (!sourceFiles.length) throw new Error(`No TypeScript source files in ${configFile}`);
const scripts = sourceFiles.map(name => {
  const sourcePath = path.resolve(cwd, name);
  const relativeSource = path.relative(sourceRoot, sourcePath);
  if (relativeSource.startsWith('..') || path.isAbsolute(relativeSource)) {
    throw new Error(`Source outside rootDir: ${name}`);
  }
  const outputPath = path.resolve(outputRoot, relativeSource.replace(/\.tsx?$/, '.js'));
  if (!fs.existsSync(outputPath)) throw new Error(`Compiled output missing: ${outputPath}`);
  return fs.readFileSync(outputPath, 'utf8').trimEnd();
});
const destination = path.resolve(cwd, destinationArg);
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, `${scripts.join('\n;\n')}\n`, 'utf8');
console.log(`[FiveM build] ${sourceFiles.length} source(s) -> ${destinationArg}`);
