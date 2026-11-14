// Recovery metadata only: no JWT, eBay nonce, credentials or tenant authorization.
const LIFETIME_MS = 15 * 60 * 1000;
export function ebayOAuthKey(userId: string, tenantId: string): string {
  return `swish_ebay_oauth_started:${userId}:${tenantId}`;
}
export function isEbayOAuthPending(userId: string, tenantId: string): boolean {
  const value = sessionStorage.getItem(ebayOAuthKey(userId, tenantId));
  if (!value) return false;
  const started = Number(value);
  const elapsed = Date.now() - started;
  return Number.isFinite(started) && elapsed >= 0 && elapsed < LIFETIME_MS;
}
export function beginEbayOAuth(userId: string, tenantId: string): void {
  sessionStorage.setItem(ebayOAuthKey(userId, tenantId), String(Date.now()));
}
export function clearEbayOAuth(userId: string, tenantId: string): void {
  sessionStorage.removeItem(ebayOAuthKey(userId, tenantId));
}
