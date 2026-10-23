import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, Coins, ShoppingBag, Lightbulb, Tag, ShoppingCart,
  Truck, TrendingUp, BarChart3, Wallet, CheckSquare, Terminal, Settings,
  LogOut, ChevronDown, ChevronRight, Zap, RefreshCw, AlertCircle, ClipboardList, Sparkles
} from 'lucide-react';
import { useState } from 'react';

interface NavItemDef {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label?: string;
  items: NavItemDef[];
}

const EBAY_ITEMS: NavItemDef[] = [
  { label: 'eBay Hub', to: '/ebay', icon: () => <span className="text-xs font-bold">eB</span> },
  { label: 'Listings', to: '/ebay/listings', icon: Tag },
  { label: 'Orders', to: '/ebay/orders', icon: ShoppingCart },
  { label: 'Messages', to: '/ebay/messages', icon: () => <span className="text-xs">✉</span> },
  { label: 'Offers', to: '/ebay/offers', icon: () => <span className="text-xs">%</span> },
  { label: 'Returns', to: '/ebay/returns', icon: RefreshCw },
  { label: 'Cases', to: '/ebay/cases', icon: AlertCircle },
  { label: 'Finances', to: '/ebay/finances', icon: Wallet },
  { label: 'Analytics', to: '/ebay/analytics', icon: BarChart3 },
  { label: 'Import', to: '/ebay/import', icon: () => <span className="text-xs">↓</span> },
  { label: 'Logs', to: '/ebay/logs', icon: ClipboardList },
];

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Command Centre', to: '/command-centre', icon: Terminal },
      { label: 'App Tools & Parity', to: '/tools', icon: Sparkles },
    ],
  },
  {
    label: 'Stock',
    items: [
      { label: 'Inventory', to: '/inventory', icon: Package },
      { label: 'Coin Flipper', to: '/identify', icon: Coins },
      { label: 'Acquisitions', to: '/acquisitions', icon: ShoppingBag },
      { label: 'Opportunities', to: '/opportunities', icon: Lightbulb },
      { label: 'Review Required', to: '/review-required', icon: AlertCircle },
      { label: 'Audit', to: '/audit', icon: ClipboardList },
    ],
  },
  {
    label: 'Selling',
    items: [
      { label: 'Listings', to: '/listings', icon: Tag },
      { label: 'Orders', to: '/orders', icon: ShoppingCart },
      { label: 'Dispatch', to: '/dispatch', icon: Truck },
      { label: 'Repricing', to: '/repricing', icon: RefreshCw },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Insights', to: '/insights', icon: TrendingUp },
      { label: 'Money', to: '/money', icon: Wallet },
    ],
  },
  {
    label: 'Tasks',
    items: [
      { label: 'Tasks', to: '/tasks', icon: CheckSquare },
    ],
  },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, signOut } = useAuth();
  const [ebayOpen, setEbayOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); };

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold swish-gold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          SWISH
        </span>
        <span className="text-xs text-muted-foreground ml-auto">Web</span>
      </div>

      {/* Active specialist workspace */}
      <div className="px-3 pt-3 pb-1">
        <Link to="/niches" onClick={onClose} className="flex items-center justify-between gap-2 rounded-lg border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))] px-3 py-2.5 hover:border-primary/50 transition-colors">
          <span className="min-w-0"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Specialist workspace</span><span className="block truncate text-xs font-semibold text-foreground">{({coins:'Coin Flipper',cards:'Card Flipper',antiques:'Antique Flipper',bikes:'Bike Flipper',mx:'Flipper MX',fossils:'Fossil Flipper',clothing:'Clothing Flipper',beauty:'Beauty Flipper',tech:'Tech Flipper',tools:'Tool Flipper'} as Record<string,string>)[localStorage.getItem('swish_active_niche') || ''] || 'Choose a niche'}</span></span>
          <Sparkles className="w-4 h-4 shrink-0 text-primary" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className="nav-section-label">{section.label}</div>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => cn('nav-item', isActive && 'active')}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* eBay section */}
        <div>
          <div className="nav-section-label">eBay</div>
          <button
            className={cn('nav-item', ebayOpen && 'bg-[hsl(var(--sidebar-accent))]')}
            onClick={() => setEbayOpen(!ebayOpen)}
          >
            <span className="text-xs font-bold w-4 text-center shrink-0">eB</span>
            <span className="flex-1">eBay</span>
            {ebayOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {ebayOpen && (
            <div className="ml-2 border-l border-[hsl(var(--sidebar-border))] pl-2 mt-0.5 space-y-0.5">
              {EBAY_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => cn('nav-item text-xs py-1.5', isActive && 'active')}
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div>
          <div className="nav-section-label">System</div>
          <NavLink to="/settings" onClick={onClose} className={({ isActive }) => cn('nav-item', isActive && 'active')}>
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </NavLink>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.email || 'User'}</div>
          </div>
          <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" title="Sign out">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
