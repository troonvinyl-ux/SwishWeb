import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadConfig } from './config.mjs';
import { getLatestCursor, getRowsCreatedAfter } from './swish-client.mjs';
import { say, verifyRobot } from './wirepod-client.mjs';
import { loadState, newestCursor, saveState } from './state-store.mjs';
import { startCommandServer } from './server.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const bridgeRoot = resolve(directory, '..');
const config = await loadConfig(resolve(bridgeRoot, '.env'));
const statePath = resolve(bridgeRoot, '.swish-vector-state.json');
let state = await loadState(statePath);
let polling = false;

function log(message) {
  process.stdout.write(`[swish-vector] ${new Date().toISOString()} ${message}\n`);
}

async function initialiseCursor(table, stateKey) {
  if (state[stateKey]) return;
  state = { ...state, [stateKey]: await getLatestCursor(config, table) };
  await saveState(statePath, state);
  log(`Initialised ${table} cursor; historical records will not be announced.`);
}

async function pollTable(table, stateKey, enabled, phrase) {
  if (!enabled) return;
  await initialiseCursor(table, stateKey);
  const rows = await getRowsCreatedAfter(config, table, state[stateKey]);
  if (!rows.length) return;
  await say(config, phrase(rows.length));
  // Commit the cursor only after the announcement succeeds. A temporary
  // WirePod outage therefore retries the safe aggregate alert instead of
  // silently dropping it.
  state = { ...state, [stateKey]: newestCursor(state[stateKey], rows) };
  await saveState(statePath, state);
  log(`Announced ${rows.length} new ${table} row${rows.length === 1 ? '' : 's'}.`);
}

async function poll() {
  if (polling) return;
  polling = true;
  try {
    await pollTable('orders', 'ordersCursor', config.announceNewOrders, count =>
      count === 1 ? 'Swish update. A new order has arrived.' : `Swish update. ${count} new orders have arrived.`,
    );
    await pollTable('items', 'itemsCursor', config.announceNewItems, count =>
      count === 1 ? 'Swish update. A new inventory item was added.' : `Swish update. ${count} inventory items were added.`,
    );
  } catch (error) {
    log(`Polling failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    polling = false;
  }
}

await verifyRobot(config);
log(`WirePod reachable for Vector ${config.serial}. Reading only tenant ${config.tenantId}.`);
const server = startCommandServer(config);
if (server) log(`Local command endpoint listening on http://${config.bindHost}:${config.bridgePort}.`);
else log('Local command endpoint disabled until BRIDGE_SHARED_SECRET is configured.');

await poll();
const interval = setInterval(() => { void poll(); }, config.pollIntervalMs);

function stop(signal) {
  clearInterval(interval);
  server?.close();
  log(`Stopped after ${signal}.`);
  process.exit(0);
}

process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));
