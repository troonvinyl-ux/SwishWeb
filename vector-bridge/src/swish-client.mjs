function restUrl(config, table, query) {
  const url = new URL(`/rest/v1/${table}`, config.backendUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url;
}

async function requestRows(config, table, query, fetchImpl = fetch) {
  const response = await fetchImpl(restUrl(config, table, query), {
    headers: {
      apikey: config.anonymousKey,
      Authorization: `Bearer ${config.accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const message = (await response.text()).slice(0, 240);
    throw new Error(`SWISH ${table} query failed (${response.status}): ${message || response.statusText}`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`SWISH ${table} query returned an unexpected response.`);
  return rows;
}

export async function getRowsCreatedAfter(config, table, cursor, fetchImpl = fetch) {
  return requestRows(config, table, {
    select: 'id,created_at',
    tenant_id: `eq.${config.tenantId}`,
    created_at: `gt.${cursor}`,
    order: 'created_at.asc',
    limit: '25',
  }, fetchImpl);
}

export async function getLatestCursor(config, table, fetchImpl = fetch) {
  const rows = await requestRows(config, table, {
    select: 'created_at',
    tenant_id: `eq.${config.tenantId}`,
    order: 'created_at.desc',
    limit: '1',
  }, fetchImpl);
  return typeof rows[0]?.created_at === 'string' ? rows[0].created_at : new Date().toISOString();
}

async function getExactCount(config, table, query, fetchImpl = fetch) {
  const response = await fetchImpl(restUrl(config, table, { select: 'id', ...query, limit: '1' }), {
    headers: {
      apikey: config.anonymousKey,
      Authorization: `Bearer ${config.accessToken}`,
      Prefer: 'count=exact',
    },
  });
  if (!response.ok) throw new Error(`SWISH ${table} count failed (${response.status}).`);
  const range = response.headers.get('content-range') || '';
  const total = Number.parseInt(range.split('/')[1], 10);
  if (!Number.isInteger(total) || total < 0) throw new Error(`SWISH ${table} count was not available.`);
  return total;
}

export async function getCompanionStatus(config, fetchImpl = fetch) {
  const tenantScope = { tenant_id: `eq.${config.tenantId}` };
  const [inventory, liveListings, orders] = await Promise.all([
    getExactCount(config, 'items', tenantScope, fetchImpl),
    getExactCount(config, 'listings', { ...tenantScope, status: 'in.(active,live)' }, fetchImpl),
    getExactCount(config, 'orders', tenantScope, fetchImpl),
  ]);
  return { inventory, liveListings, orders };
}

export function statusPhrase({ inventory, liveListings, orders }) {
  return `Swish status. ${inventory} inventory item${inventory === 1 ? '' : 's'}, ${liveListings} live listing${liveListings === 1 ? '' : 's'}, and ${orders} order${orders === 1 ? '' : 's'}.`;
}
