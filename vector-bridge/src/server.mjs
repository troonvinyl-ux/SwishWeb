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

function respond(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

export function startCommandServer(config, dependencies = {}) {
  if (!config.sharedSecret) return null;
  const commandRunner = dependencies.executeCommand || executeCommand;
  const server = createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      respond(response, 200, { ok: true, component: 'swish-vector-bridge' });
      return;
    }
    if (request.method !== 'POST' || request.url !== '/v1/command') {
      respond(response, 404, { error: 'Not found' });
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
  server.listen(config.bridgePort, config.bindHost);
  return server;
}
