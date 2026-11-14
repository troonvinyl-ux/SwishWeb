import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Internal helper — gets a connected client or throws a descriptive error
// ---------------------------------------------------------------------------

async function getClient() {
  const sb = getSupabaseClient() || await getSupabaseClientAsync();
  if (!sb) throw new Error('Backend not connected — check configuration');
  return sb;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TableOptions {
  select?: string;
  filter?: Record<string, unknown>;
  inFilter?: Record<string, unknown[]>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  search?: { column: string; query: string };
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// useTable — flexible SELECT with search, filter, sort, limit
// ---------------------------------------------------------------------------

export function useTable(table: string, options?: TableOptions) {
  const { user } = useAuth();
  // The existing backend does not provide Realtime. Refresh read-only data in
  // the foreground; never replay an uncertain marketplace mutation.
  const sharedTable = ['items', 'listings', 'orders', 'marketplace_connectors'].includes(table);
  return useQuery({
    queryKey: [table, options, user?.id],
    enabled: Boolean(user?.id) && options?.enabled !== false,
    refetchInterval: sharedTable ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry schema/auth errors — they won't resolve on their own
      const msg = (error as Error).message || '';
      if (msg.includes('does not exist') || msg.includes('permission denied') || msg.includes('not found')) return false;
      return failureCount < 2;
    },
    queryFn: async () => {
      const sb = await getClient();
      let q = sb.from(table).select(options?.select || '*');
      if (options?.filter) {
        Object.entries(options.filter).forEach(([k, v]) => {
          if (v != null) q = q.eq(k, v);
        });
      }
      if (options?.inFilter) {
        Object.entries(options.inFilter).forEach(([k, values]) => {
          if (Array.isArray(values) && values.length > 0) q = q.in(k, values);
        });
      }
      if (options?.search?.query) {
        q = q.ilike(options.search.column, `%${options.search.query}%`);
      }
      if (options?.order) {
        q = q.order(options.order.column, { ascending: options.order.ascending ?? false });
      }
      if (options?.limit) q = q.limit(options.limit);
      const { data, error } = await q;
      if (error) {
        console.warn(`[SWISH] useTable("${table}") error:`, error.message);
        throw new Error(error.message);
      }
      return data || [];
    },
  });
}

// ---------------------------------------------------------------------------
// useTableRow — single row by id
// ---------------------------------------------------------------------------

export function useTableRow(table: string, id: string | null | undefined, select = '*', tenantId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [table, id, select, tenantId, user?.id],
    enabled: Boolean(user?.id) && !!id && id !== 'new' && (tenantId === undefined || Boolean(tenantId)),
    refetchOnWindowFocus: true,
    retry: false,
    queryFn: async () => {
      const sb = await getClient();
      let query = sb.from(table).select(select).eq('id', id!);
      if (tenantId !== undefined) query = query.eq('tenant_id', tenantId);
      const { data, error } = await query.single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useInsert(table: string, tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const sb = await getClient();
      if (tenantId !== undefined && !tenantId) throw new Error('Your SWISH workspace is not ready.');
      const safeRow = tenantId !== undefined ? { ...row, tenant_id: tenantId } : row;
      const { data, error } = await sb.from(table).insert(safeRow).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useUpdate(table: string, tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const sb = await getClient();
      let query = sb.from(table).update(updates).eq('id', id);
      if (tenantId !== undefined) {
        if (!tenantId) throw new Error('Your SWISH workspace is not ready.');
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useUpsert(table: string, tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const sb = await getClient();
      if (tenantId !== undefined && !tenantId) throw new Error('Your SWISH workspace is not ready.');
      const safeRow = tenantId !== undefined ? { ...row, tenant_id: tenantId } : row;
      const { data, error } = await sb.from(table).upsert(safeRow).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useDelete(table: string, tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const sb = await getClient();
      let query = sb.from(table).delete().eq('id', id);
      if (tenantId !== undefined) {
        if (!tenantId) throw new Error('Your SWISH workspace is not ready.');
        query = query.eq('tenant_id', tenantId);
      }
      const { error } = await query;
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

// ---------------------------------------------------------------------------
// useCount — COUNT(*) query
// ---------------------------------------------------------------------------

export function useCount(
  table: string,
  filter?: Record<string, unknown>,
  inFilter?: Record<string, unknown[]>,
  enabled = true,
  select = '*',
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [table, 'count', filter, inFilter, select, user?.id],
    enabled: enabled && Boolean(user?.id),
    retry: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const sb = await getClient();
      let q = sb.from(table).select(select, { count: 'exact', head: true });
      if (filter) Object.entries(filter).forEach(([k, v]) => { if (v != null) q = q.eq(k, v); });
      if (inFilter) Object.entries(inFilter).forEach(([k, values]) => {
        if (Array.isArray(values) && values.length > 0) q = q.in(k, values);
      });
      const { count, error } = await q;
      if (error) {
        console.warn(`[SWISH] useCount("${table}") error:`, error.message);
        // Unavailable is not zero stock. Consumers must render an error state.
        throw new Error(error.message);
      }
      return count || 0;
    },
  });
}
