import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadConfig } from './config.mjs';
import { executeCommand } from './commands.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const bridgeRoot = resolve(directory, '..');
const command = process.argv[2] || 'status';

try {
  const config = await loadConfig(resolve(bridgeRoot, '.env'));
  const result = await executeCommand(config, command);
  process.stdout.write(`[swish-vector] Completed ${result.command} command.\n`);
} catch (error) {
  process.stderr.write(`[swish-vector] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
