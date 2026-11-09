import assert from 'node:assert/strict';
import test from 'node:test';
import { isLocalWirePodUrl, parseDotEnv, validateConfig } from '../src/config.mjs';
import { parseCommand, executeCommand } from '../src/commands.mjs';
import { privacySafeSpeech } from '../src/wirepod-client.mjs';
import { getRowsCreatedAfter, statusPhrase } from '../src/swish-client.mjs';

const userJwt = `header.${Buffer.from(JSON.stringify({ role: 'authenticated' })).toString('base64url')}.signature`;
const serviceJwt = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;

function env(overrides = {}) {
  return {
    SWISH_BACKEND_URL: 'https://swish.example.test',
    SWISH_ANON_KEY: 'public-anon-key',
    SWISH_ACCESS_TOKEN: userJwt,
    SWISH_TENANT_ID: 'tenant-12345678',
    WIREPOD_URL: 'http://escapepod.local:8080',
    VECTOR_SERIAL: 'VECTOR-X5P1',
    BRIDGE_SHARED_SECRET: 'a-long-local-secret-that-is-at-least-32-characters',
    ...overrides,
  };
}

test('only accepts local WirePod endpoints', () => {
  assert.equal(isLocalWirePodUrl('http://escapepod.local:8080'), true);
  assert.equal(isLocalWirePodUrl('http://192.168.1.22:8080'), true);
  assert.equal(isLocalWirePodUrl('https://wirepod.example.com'), false);
});

test('rejects elevated and remote bridge configuration', () => {
  assert.throws(() => validateConfig(env({ SWISH_ACCESS_TOKEN: serviceJwt })), /service-role token/);
  assert.throws(() => validateConfig(env({ WIREPOD_URL: 'https://wirepod.example.com' })), /private-network/);
});

test('parses a conservative local bridge configuration', () => {
  const config = validateConfig(env());
  assert.equal(config.pollIntervalMs, 60_000);
  assert.equal(config.announceNewOrders, true);
  assert.equal(config.bindHost, '127.0.0.1');
});

test('parses quoted dotenv values without executing them', () => {
  assert.deepEqual(parseDotEnv('A="hello"\n# ignored\nB=world\n'), { A: 'hello', B: 'world' });
});

test('only exposes privacy-safe companion commands', () => {
  assert.equal(parseCommand('STATUS'), 'status');
  assert.throws(() => parseCommand('move_wheels'), /Unsupported/);
  assert.equal(privacySafeSpeech(' Hello\nCustomer #42! '), 'Hello Customer 42!');
  assert.equal(statusPhrase({ inventory: 1, liveListings: 2, orders: 0 }), 'Swish status. 1 inventory item, 2 live listings, and 0 orders.');
});

test('status command speaks aggregate counts only', async () => {
  const spoken = [];
  const result = await executeCommand({}, 'status', {
    getCompanionStatus: async () => ({ inventory: 5, liveListings: 1, orders: 2 }),
    say: async (_config, phrase) => { spoken.push(phrase); },
  });
  assert.equal(result.command, 'status');
  assert.deepEqual(spoken, ['Swish status. 5 inventory items, 1 live listing, and 2 orders.']);
});

test('polling requests include the explicit tenant scope and the user bearer token', async () => {
  const requests = [];
  const config = validateConfig(env());
  await getRowsCreatedAfter(config, 'orders', '2026-11-09T00:00:00.000Z', async (url, options) => {
    requests.push({ url: String(url), headers: options.headers });
    return { ok: true, json: async () => [] };
  });
  assert.match(requests[0].url, /tenant_id=eq.tenant-12345678/);
  assert.match(requests[0].url, /created_at=gt.2026-11-09T00%3A00%3A00.000Z/);
  assert.equal(requests[0].headers.Authorization, `Bearer ${userJwt}`);
  assert.equal(requests[0].headers.apikey, 'public-anon-key');
});
