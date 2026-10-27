import { useAuth } from '@/contexts/AuthContext';
import { useTable, useCount } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatRelative, statusVariant } from '@/lib/utils';
import { Package, Tag, ShoppingCart, Truck, CheckSquare, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SafeSection } from '@/components/ErrorBoundary';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';

function StatCard({ label, value, icon: Icon, to }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}) {
  return (
    <Link to={to} className="stat-card hover:border-primary/40 transition-colors block">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 swish-gold" />
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const specialistIds = getSpecialistIdsForNiche(getActiveNicheId());
  const scoped = Boolean(tenantId) && specialistIds.length > 0;

  // Use SafeSection wrappers so individual failures don't blank the dashboard.
  // All operational data is scoped to the current tenant and active niche.
  const { data: inventory } = useTable('items', {
    filter: { tenant_id: tenantId }, inFilter: { specialist_id: specialistIds },
    limit: 5, order: { column: 'created_at', ascending: false }, enabled: scoped,
  });
  const { data: orders } = useTable('orders', {
    select: '*, items!inner(specialist_id)',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay' },
    inFilter: { 'items.specialist_id': specialistIds },
    limit: 5, order: { column: 'created_at', ascending: false }, enabled: scoped,
  });

  // Tasks are optional and tenant-scoped.
  const { data: tasks } = useTable('tasks', {
    limit: 5, filter: { tenant_id: tenantId, status: 'open' }, enabled: Boolean(tenantId),
  });

  const { data: invCount }      = useCount('items', { tenant_id: tenantId }, { specialist_id: specialistIds }, scoped);
  const { data: listingCount }  = useCount('listings', { tenant_id: tenantId, marketplace_id: 'ebay', status: 'active' }, { 'items.specialist_id': specialistIds }, scoped, '*, items!inner(specialist_id)');
  const { data: orderCount }    = useCount('orders', { tenant_id: tenantId, marketplace_id: 'ebay' }, { 'items.specialist_id': specialistIds }, scoped, '*, items!inner(specialist_id)');
  const { data: dispatchCount } = useCount('orders', { tenant_id: tenantId, marketplace_id: 'ebay', status: 'awaiting_dispatch' }, { 'items.specialist_id': specialistIds }, scoped, '*, items!inner(specialist_id)');
  const { data: taskCount }     = useCount('tasks', { tenant_id: tenantId, status: 'open' }, undefined, Boolean(tenantId));

  const stats = [
    { label: 'Total Inventory',  value: tenantLoading ? '…' : (invCount ?? '—'),      icon: Package,     to: '/inventory' },
    { label: 'Active Listings',  value: tenantLoading ? '…' : (listingCount ?? '—'),  icon: Tag,         to: '/listings' },
    { label: 'Total Orders',     value: tenantLoading ? '…' : (orderCount ?? '—'),    icon: ShoppingCart, to: '/orders' },
    { label: 'Pending Dispatch', value: tenantLoading ? '…' : (dispatchCount ?? '—'), icon: Truck,       to: '/dispatch' },
    { label: 'Open Tasks',       value: taskCount ?? '—',     icon: CheckSquare, to: '/tasks' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          SWISH operational dashboard — real data from your backend
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(s => <StatCard key={s.to} {...s} />)}
      </div>

      {/* Activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Recent inventory */}
        <SafeSection name="recent-inventory">
          <div className="swish-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Recent Inventory</h3>
              <Link to="/inventory" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {(inventory || []).length > 0 ? (
              <div className="space-y-1.5">
                {(inventory as Record<string, unknown>[]).map(item => (
                  <Link
                    key={item.id as string}
                    to={`/inventory/${item.id}`}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image_url
                        ? <img src={item.image_url as string} alt="" className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {(item.title || item.name || item.sku || 'Untitled') as string}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatRelative(item.created_at as string)}</div>
                    </div>
                    {item.status && (
                      <span className={statusVariant(item.status as string)}>{item.status as string}</span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">No inventory yet</p>
                <Link to="/inventory/new" className="text-xs text-primary hover:underline mt-1 inline-block">Add first item</Link>
              </div>
            )}
          </div>
        </SafeSection>

        {/* Recent orders */}
        <SafeSection name="recent-orders">
          <div className="swish-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Recent Orders</h3>
              <Link to="/orders" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {(orders || []).length > 0 ? (
              <div className="space-y-1.5">
                {(orders as Record<string, unknown>[]).map(order => (
                  <div
                    key={order.id as string}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {(order.item_title || order.external_order_id || order.order_id || 'Order') as string}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(order.buyer_name || order.buyer_username || '') as string}
                        {order.buyer_name || order.buyer_username ? ' · ' : ''}
                        {formatRelative(order.created_at as string)}
                      </div>
                    </div>
                    <div className="text-xs font-semibold swish-gold shrink-0">
                      {formatCurrency((order.total_amount || order.sale_price) as number)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No recent orders</p>
            )}
          </div>
        </SafeSection>

        {/* Open tasks — graceful if table missing */}
        <SafeSection name="tasks-widget">
          <div className="swish-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Open Tasks</h3>
              <Link to="/tasks" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {(tasks || []).length > 0 ? (
              <div className="space-y-1.5">
                {(tasks as Record<string, unknown>[]).map(task => (
                  <div key={task.id as string} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/40">
                    <CheckSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{(task.title || 'Untitled task') as string}</div>
                    </div>
                    {task.priority && (
                      <span className="text-xs text-muted-foreground capitalize shrink-0">{task.priority as string}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No open tasks</p>
            )}
          </div>
        </SafeSection>
      </div>
    </div>
  );
}
