import { readFile } from 'node:fs/promises';

const LOCAL_WIREPOD_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function asBoolean(value, fallback) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function requireValue(env, key) {
  const value = String(env[key] ?? '').trim();
  if (!value) throw new Error(`Missing required ${key} in vector-bridge/.env.`);
  return value;
}

function parsePositiveInt(value, fallback, key, minimum) {
  if (value == null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${key} must be a whole number of at least ${minimum}.`);
  }
  return parsed;
}

function base64UrlDecode(segment) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - segment.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function readJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('SWISH_ACCESS_TOKEN must be a signed user JWT.');
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (!payload || typeof payload !== 'object') throw new Error('JWT payload is invalid.');
    return payload;
  } catch {
    throw new Error('SWISH_ACCESS_TOKEN must contain a readable JWT payload.');
  }
}

export function isLocalWirePodUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (LOCAL_WIREPOD_HOSTS.has(host) || host.endsWith('.local')) return true;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^127\./.test(host)) return true;
    const match = host.match(/^172\.(\d{1,3})\./);
    return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
  } catch {
    return false;
  }
}

export function validateConfig(env) {
  const backendUrl = requireValue(env, 'SWISH_BACKEND_URL').replace(/\/$/, '');
  const anonymousKey = requireValue(env, 'SWISH_ANON_KEY');
  const accessToken = requireValue(env, 'SWISH_ACCESS_TOKEN');
  const tenantId = requireValue(env, 'SWISH_TENANT_ID');
  const wirePodUrl = requireValue(env, 'WIREPOD_URL').replace(/\/$/, '');
  const serial = requireValue(env, 'VECTOR_SERIAL');
  const payload = readJwtPayload(accessToken);

  if (!/^https:\/\//i.test(backendUrl)) {
    throw new Error('SWISH_BACKEND_URL must use HTTPS.');
  }
  if (!isLocalWirePodUrl(wirePodUrl)) {
    throw new Error('WIREPOD_URL must point to a private-network or .local WirePod host.');
  }
  if (!/^[a-zA-Z0-9_-]{4,128}$/.test(serial)) {
    throw new Error('VECTOR_SERIAL contains unsupported characters.');
  }
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(tenantId)) {
    throw new Error('SWISH_TENANT_ID must be an explicit tenant identifier.');
  }
  if (payload.role === 'service_role') {
    throw new Error('Refusing a service-role token. Use an ordinary signed-in SWISH user token.');
  }

  const bindHost = String(env.BRIDGE_BIND_HOST || '127.0.0.1').trim();
  const sharedSecret = String(env.BRIDGE_SHARED_SECRET || '').trim();
  if (!['127.0.0.1', '::1', 'localhost'].includes(bindHost) && sharedSecret.length < 32) {
    throw new Error('A non-loopback bridge needs a BRIDGE_SHARED_SECRET of at least 32 characters.');
  }

  return Object.freeze({
    backendUrl,
    anonymousKey,
    accessToken,
    tenantId,
    wirePodUrl,
    serial,
    pollIntervalMs: parsePositiveInt(env.POLL_INTERVAL_SECONDS, 60, 'POLL_INTERVAL_SECONDS', 30) * 1_000,
    announceNewOrders: asBoolean(env.ANNOUNCE_NEW_ORDERS, true),
    announceNewItems: asBoolean(env.ANNOUNCE_NEW_ITEMS, false),
    bindHost,
    bridgePort: parsePositiveInt(env.BRIDGE_PORT, 8788, 'BRIDGE_PORT', 1),
    sharedSecret,
  });
}

export function parseDotEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export async function loadConfig(envPath, processEnv = process.env) {
  let fileValues = {};
  try {
    fileValues = parseDotEnv(await readFile(envPath, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      throw new Error(`No ${envPath} found. Copy vector-bridge/.env.example to vector-bridge/.env first.`);
    }
    throw error;
  }
  return validateConfig({ ...fileValues, ...processEnv });
}
