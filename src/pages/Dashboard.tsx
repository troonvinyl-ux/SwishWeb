import { useAuth } from '@/contexts/AuthContext';
import { useTable, useCount } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatRelative, statusVariant } from '@/lib/utils';
import { Package, Tag, ShoppingCart, Truck, CheckSquare, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SafeSection } from '@/components/ErrorBoundary';

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

  // Use SafeSection wrappers so individual failures don't blank the dashboard
  const { data: inventory } = useTable('inventory', {
    limit: 5, order: { column: 'created_at', ascending: false },
  });
  const { data: orders } = useTable('orders', {
    limit: 5, order: { column: 'created_at', ascending: false },
  });

  // Tasks are optional — count returns 0 on missing table (hook handles gracefully)
  const { data: tasks } = useTable('tasks', {
    limit: 5, filter: { status: 'open' },
  });

  const { data: invCount }      = useCount('inventory');
  const { data: listingCount }  = useCount('listings', { status: 'active' });
  const { data: orderCount }    = useCount('orders');
  const { data: dispatchCount } = useCount('orders', { status: 'awaiting_dispatch' });
  const { data: taskCount }     = useCount('tasks', { status: 'open' });

  const stats = [
    { label: 'Total Inventory',  value: invCount ?? '—',      icon: Package,     to: '/inventory' },
    { label: 'Active Listings',  value: listingCount ?? '—',  icon: Tag,         to: '/listings' },
    { label: 'Total Orders',     value: orderCount ?? '—',    icon: ShoppingCart, to: '/orders' },
    { label: 'Pending Dispatch', value: dispatchCount ?? '—', icon: Truck,       to: '/dispatch' },
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
