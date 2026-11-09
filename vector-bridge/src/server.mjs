import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { executeCommand } from './commands.mjs';

function sameSecret(received, expected) {
  const left = Buffer.from(received || '');
  const right = Buffer.from(expected || '');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 8_192) request.destroy();
    });
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Request body must be valid JSON.')); }
    });
    request.on('error', reject);
  });
}

function respond(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function pairingHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    // Older Chromium versions use Private Network Access preflights. Newer
    // browsers can also ask the user for loopback permission. Both are kept
    // deliberate: this server only listens on 127.0.0.1 / ::1 / localhost.
    'Access-Control-Allow-Private-Network': 'true',
    Vary: 'Origin, Access-Control-Request-Private-Network',
  };
}

function hasAllowedOrigin(request, expectedOrigin) {
  return String(request.headers.origin || '') === expectedOrigin;
}

/**
 * A loopback-only listener supporting two narrow operations:
 * - a deliberate browser pairing from the configured SWISH website; and
 * - the pre-existing secret-protected status/test command for WirePod.
 */
export function startBridgeServer(pairingConfig, dependencies = {}) {
  const commandRunner = dependencies.executeCommand || executeCommand;
  const getRuntimeConfig = dependencies.getRuntimeConfig || (() => null);
  const savePairing = dependencies.savePairing || (async () => {
    throw new Error('Pairing is not available in this bridge process.');
  });
  const server = createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      respond(response, 200, {
        ok: true,
        component: 'swish-vector-bridge',
        paired: Boolean(getRuntimeConfig()),
      });
      return;
    }

    if (request.url === '/v1/pair') {
      if (!hasAllowedOrigin(request, pairingConfig.pairingOrigin)) {
        respond(response, 403, { error: 'Pairing requests must come from the configured SWISH website.' });
        return;
      }
      const headers = pairingHeaders(pairingConfig.pairingOrigin);
      if (request.method === 'OPTIONS') {
        response.writeHead(204, headers);
        response.end();
        return;
      }
      if (request.method !== 'POST') {
        respond(response, 405, { error: 'Method not allowed.' }, headers);
        return;
      }
      try {
        const body = await readJson(request);
        await savePairing({
          accessToken: String(body.accessToken || ''),
          tenantId: String(body.tenantId || ''),
        });
        respond(response, 200, { ok: true, paired: true }, headers);
      } catch (error) {
        respond(response, 400, { error: error instanceof Error ? error.message : 'Pairing failed.' }, headers);
      }
      return;
    }

    if (request.method !== 'POST' || request.url !== '/v1/command') {
      respond(response, 404, { error: 'Not found' });
      return;
    }
    const config = getRuntimeConfig();
    if (!config?.sharedSecret) {
      respond(response, 503, { error: 'The bridge is not paired and ready.' });
      return;
    }
    const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!sameSecret(token, config.sharedSecret)) {
      respond(response, 401, { error: 'Unauthorized' });
      return;
    }
    try {
      const body = await readJson(request);
      const result = await commandRunner(config, body.command);
      respond(response, 200, { ok: true, command: result.command });
    } catch (error) {
      respond(response, 400, { error: error instanceof Error ? error.message : 'Command failed' });
    }
  });
  server.listen(pairingConfig.bridgePort, pairingConfig.bindHost);
  return server;
}

// Preserve the original module-level contract for local integrations that
// imported this helper before browser pairing was introduced. Pairing remains
// disabled for this compatibility path because no pairing origin is supplied.
export function startCommandServer(config, dependencies = {}) {
  if (!config.sharedSecret) return null;
  return startBridgeServer(
    { ...config, pairingOrigin: 'https://invalid.local' },
    { ...dependencies, getRuntimeConfig: () => config },
  );
}

