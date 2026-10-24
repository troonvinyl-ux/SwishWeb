import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const BACKEND_URL = 'https://iwgaqieyoahmcjfziwga.backend.onspace.ai';

// ---------------------------------------------------------------------------
// Anon key resolution — PUBLIC KEY ONLY
//
// The anon/public key is a JWT that is SAFE to ship in frontend code.
// It grants only public/RLS-protected access — no elevated privileges.
//
// Resolution order:
//   1. VITE_SUPABASE_ANON_KEY build-time env variable
//   2. localStorage cache (persists across sessions — this key is NOT secret)
//   3. Auto-fetch from backend public /meta endpoint
//   4. Fallback compiled constant (set SWISH_ANON_KEY below if known)
//
// NEVER put here:
//   - Supabase service-role key
//   - eBay client secret / access token / refresh token
//   - Gemini / AI API keys
//   - Any private server credential
//
// Those must remain server-side in Edge Functions only.
// ---------------------------------------------------------------------------

// If you know your anon key at build time, set it here as a fallback constant.
// It is public config — not a secret. Leave empty string if not yet known.
const COMPILED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODkwNjM4MTgsImV4cCI6MjEwNDQyMzgxOCwicmVmIjoiaXdnYXFpZXlvYWhtY2pmeml3Z2EiLCJyb2xlIjoiYW5vbiIsImlzcyI6Im9uc3BhY2UifQ.cioQ38guPLFAbl3x48mUaJcMSxU5IpZn7-H-JhtvXJc';

const LOCAL_KEY = 'swish_anon_key'; // localStorage — persists across sessions
const META_ENDPOINT = `${BACKEND_URL}/meta`;
const ALT_ENDPOINT  = `${BACKEND_URL}/auth/v1/settings`;

function envKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
}

function localKey(): string {
  try { return localStorage.getItem(LOCAL_KEY) || ''; } catch { return ''; }
}

function cacheKey(key: string): void {
  try { localStorage.setItem(LOCAL_KEY, key); } catch { /* storage blocked */ }
}

/** Called by LoginPage only as an absolute last resort (needs_key state) */
export function storeAnonKey(key: string): void {
  cacheKey(key);
  _buildClient(key);
}

/** Remove only if user explicitly wants to reset/reconfigure */
export function clearStoredAnonKey(): void {
  try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
}

export function getStoredAnonKey(): string {
  return envKey() || localKey() || COMPILED_ANON_KEY;
}

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: SupabaseClient | null = null;
let _initPromise: Promise<SupabaseClient | null> | null = null;

function _buildClient(key: string): SupabaseClient {
  _client = createClient(BACKEND_URL, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'swish_auth',
    },
  });
  return _client;
}

/**
 * Attempt to fetch the anon key from backend public endpoints.
 * Returns empty string if unavailable — caller handles gracefully.
 */
async function fetchAnonKey(): Promise<string> {
  for (const url of [META_ENDPOINT, ALT_ENDPOINT]) {
    try {
      // Use AbortController for broader browser compatibility
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const json = await res.json();
      const key: string =
        json?.anon_key || json?.anonKey || json?.anon || json?.public_key || '';
      if (key) { cacheKey(key); return key; }
    } catch {
      // network error / abort — try next endpoint
    }
  }
  return '';
}

/**
 * Get or create the Supabase client (async).
 * Returns null only if truly no key is available after all resolution steps.
 */
export async function getSupabaseClientAsync(): Promise<SupabaseClient | null> {
  if (_client) return _client;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    // 1. Any statically available key
    const stored = envKey() || localKey() || COMPILED_ANON_KEY;
    if (stored) return _buildClient(stored);

    // 2. Auto-fetch from public backend endpoint
    const fetched = await fetchAnonKey();
    if (fetched) return _buildClient(fetched);

    // 3. No key available — caller shows inline configuration prompt
    return null;
  })().finally(() => { _initPromise = null; });

  return _initPromise;
}

/**
 * Synchronous accessor — null if client not yet initialised.
 */
export function getSupabaseClient(): SupabaseClient | null {
  return _client;
}

/**
 * Resets only the in-memory client reference.
 * Does NOT delete the stored anon key — that persists for next session.
 * Call only when you genuinely need to rebuild the client (e.g. key change).
 */
export function resetClient(): void {
  _client = null;
  _initPromise = null;
}

// ---------------------------------------------------------------------------
// Edge Function caller — improved error diagnostics
// ---------------------------------------------------------------------------

export interface EdgeFunctionResult<T = unknown> {
  data: T | null;
  error: EdgeFunctionError | null;
}

export class EdgeFunctionError extends Error {
  public readonly fn: string;
  public readonly status: number;
  public readonly body: unknown;

  constructor(fn: string, status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.fn   = fn;
    this.status = status;
    this.body  = body;
  }

  /** Safe string for display — never exposes credentials */
  get displayMessage(): string {
    const base = `[${this.fn}] ${this.message}`;
    if (this.status) return `${base} (HTTP ${this.status})`;
    return base;
  }
}

/**
 * Invoke an Edge Function with rich error diagnostics.
 * Captures function name, HTTP status, and structured error body.
 * Never exposes credentials in the error object.
 */
export async function callEdgeFunction<T = unknown>(
  fn: string,
  payload: Record<string, unknown>,
  client?: SupabaseClient | null,
): Promise<EdgeFunctionResult<T>> {
  const sb = client || (await getSupabaseClientAsync());
  if (!sb) {
    return {
      data: null,
      error: new EdgeFunctionError(fn, 0, 'Backend not connected'),
    };
  }

  let invocation: Awaited<ReturnType<typeof sb.functions.invoke>>;
  try {
    invocation = await sb.functions.invoke(fn, { body: payload });
  } catch (cause) {
    // A rejected fetch (network/CORS/unreachable function) throws before the
    // SDK can return FunctionsHttpError. Convert it to a safe diagnostic result.
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    console.error(`[SWISH] Edge Function "${fn}" could not be reached`, {
      message,
      backendHost: (() => { try { return new URL(BACKEND_URL).host; } catch { return 'unknown'; } })(),
    });
    return {
      data: null,
      error: new EdgeFunctionError(fn, 0, `Request could not reach the backend: ${message}`),
    };
  }
  const { data, error } = invocation;

  if (error) {
    // Supabase JS wraps the HTTP response error — extract what we can
    let status = 0;
    let message = error.message || 'Unknown error';
    let body: unknown = null;

    // FunctionsHttpError contains context property with status / body
    const ctx = (error as unknown as Record<string, unknown>).context;
    if (ctx && typeof ctx === 'object') {
      const c = ctx as Record<string, unknown>;
      if (typeof c.status === 'number') status = c.status;
      if (c.body) {
        try {
          body = typeof c.body === 'string' ? JSON.parse(c.body) : c.body;
          if (body && typeof body === 'object') {
            const b = body as Record<string, unknown>;
            // Extract structured message if backend sends one
            const extracted = (b.message || b.error || b.detail || b.msg) as string;
            if (extracted) message = extracted;
          }
        } catch { body = c.body; }
      }
    }

    // Also try the newer FunctionsFetchError / FunctionsRelayError
    if (!status && (error as unknown as Record<string, unknown>).status) {
      status = (error as unknown as Record<string, unknown>).status as number;
    }

    console.error(`[SWISH] Edge Function "${fn}" failed`, { status, message, body });

    return {
      data: null,
      error: new EdgeFunctionError(fn, status, message, body),
    };
  }

  return { data: data as T, error: null };
}

// ---------------------------------------------------------------------------
// Storage URL helper — no credential leakage
// ---------------------------------------------------------------------------

export function getStorageUrl(path: string, bucket = 'images'): string {
  return `${BACKEND_URL}/storage/v1/object/public/${bucket}/${path}`;
}
