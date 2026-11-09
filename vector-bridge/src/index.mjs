import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  loadEnvironment,
  savePairingCredentials,
  validateConfig,
  validatePairingConfig,
} from './config.mjs';
import { getLatestCursor, getRowsCreatedAfter } from './swish-client.mjs';
import { say, verifyRobot } from './wirepod-client.mjs';
import { loadState, newestCursor, saveState } from './state-store.mjs';
import { startBridgeServer } from './server.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const bridgeRoot = resolve(directory, '..');
const environmentPath = resolve(bridgeRoot, '.env');
let environment = await loadEnvironment(environmentPath);
const pairingConfig = validatePairingConfig(environment);
const statePath = resolve(bridgeRoot, '.swish-vector-state.json');
let state = await loadState(statePath);
let runtimeConfig = null;
let polling = false;
let pollInterval = null;

function log(message) {
  process.stdout.write(`[swish-vector] ${new Date().toISOString()} ${message}\n`);
}

async function initialiseCursor(config, table, stateKey) {
  if (state[stateKey]) return;
  state = { ...state, [stateKey]: await getLatestCursor(config, table) };
  await saveState(statePath, state);
  log(`Initialised ${table} cursor; historical records will not be announced.`);
}

async function pollTable(config, table, stateKey, enabled, phrase) {
  if (!enabled) return;
  await initialiseCursor(config, table, stateKey);
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
  const config = runtimeConfig;
  if (!config) return;
  if (polling) return;
  polling = true;
  try {
    await pollTable(config, 'orders', 'ordersCursor', config.announceNewOrders, count =>
      count === 1 ? 'Swish update. A new order has arrived.' : `Swish update. ${count} new orders have arrived.`,
    );
    await pollTable(config, 'items', 'itemsCursor', config.announceNewItems, count =>
      count === 1 ? 'Swish update. A new inventory item was added.' : `Swish update. ${count} inventory items were added.`,
    );
  } catch (error) {
    log(`Polling failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    polling = false;
  }
}

async function startRuntime(nextConfig, alreadyVerified = false) {
  if (!alreadyVerified) await verifyRobot(nextConfig);
  runtimeConfig = nextConfig;
  log(`WirePod reachable for Vector ${nextConfig.serial}. Reading only the configured SWISH workspace.`);
  if (pollInterval) return;
  await poll();
  pollInterval = setInterval(() => { void poll(); }, nextConfig.pollIntervalMs);
}

function hasValue(key) {
  return Boolean(String(environment[key] || '').trim());
}

let initialConfig = null;
if (hasValue('SWISH_ACCESS_TOKEN') || hasValue('SWISH_TENANT_ID')) {
  // If either credential has been supplied, validate both rather than quietly
  // treating a broken existing setup as an unpaired installation.
  initialConfig = validateConfig(environment);
}

const server = startBridgeServer(pairingConfig, {
  getRuntimeConfig: () => runtimeConfig,
  savePairing: async credentials => {
    const nextConfig = validateConfig({
      ...environment,
      SWISH_ACCESS_TOKEN: credentials.accessToken,
      SWISH_TENANT_ID: credentials.tenantId,
    });
    // Verify the robot first. A failed local pairing therefore never replaces
    // a working bridge configuration with unusable session data.
    await verifyRobot(nextConfig);
    await savePairingCredentials(environmentPath, credentials);
    environment = {
      ...environment,
      SWISH_ACCESS_TOKEN: credentials.accessToken,
      SWISH_TENANT_ID: credentials.tenantId,
    };
    await startRuntime(nextConfig, true);
  },
});

log(`Local bridge listening on http://${pairingConfig.bindHost}:${pairingConfig.bridgePort}.`);
if (initialConfig) {
  await startRuntime(initialConfig);
} else {
  log(`Waiting for a deliberate browser pairing from ${pairingConfig.pairingOrigin}.`);
}

function stop(signal) {
  if (pollInterval) clearInterval(pollInterval);
  server.close();
  log(`Stopped after ${signal}.`);
  process.exit(0);
}

process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));

