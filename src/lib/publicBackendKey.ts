const SWISH_BACKEND_REF = 'iwgaqieyoahmcjfziwga';
/** Only the existing backend's anonymous JWT may be shipped to this browser. */
export function validatePublicBackendKey(key: string): string {
  const parts = key.trim().split('.');
  if (parts.length !== 3 || !parts[1]) throw new Error('SWISH requires its existing public anonymous API key.');
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  if (payload.role !== 'anon' || payload.ref !== SWISH_BACKEND_REF || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    throw new Error('Only an unexpired public anonymous key for the existing SWISH backend is accepted. Never enter private credentials.');
  }
  return key.trim();
}
