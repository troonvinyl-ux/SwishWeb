import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';

/**
 * Resolve the signed-in user's existing SWISH workspace.
 * Consumers must scope tenant-owned queries by this ID and keep them disabled
 * until it is known; RLS is a second boundary, not a replacement for scoping.
 */
export function useCurrentTenantId() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['current_tenant_id', user?.id],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const sb = getSupabaseClient() || await getSupabaseClientAsync();
      if (!sb || !user?.id) throw new Error('Sign in to SWISH to access this workspace.');
      // Match the native app's tenant resolution: RLS exposes the signed-in
      // user's tenant rows, and the native app selects the primary tenant by
      // oldest creation date. Do not independently pick an arbitrary membership
      // row here or the web app can query a different tenant from the native app.
      const { data, error } = await sb
        .from('tenants')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error('Could not resolve your SWISH workspace. Please retry.');
      return data?.id ? String(data.id) : null;
    },
  });

  return {
    tenantId: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
