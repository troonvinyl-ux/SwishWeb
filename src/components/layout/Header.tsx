import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/command-centre': 'Command Centre',
  '/inventory': 'Inventory',
  '/identify': 'Coin Flipper',
  '/acquisitions': 'Acquisitions',
  '/opportunities': 'Opportunities',
  '/review-required': 'Review Required',
  '/audit': 'Audit',
  '/listings': 'Listings',
  '/orders': 'Orders',
  '/dispatch': 'Dispatch',
  '/repricing': 'Repricing',
  '/insights': 'Insights',
  '/money': 'Money',
  '/tasks': 'Tasks',
  '/ebay': 'eBay Hub',
  '/ebay/listings': 'eBay Listings',
  '/ebay/orders': 'eBay Orders',
  '/ebay/messages': 'eBay Messages',
  '/ebay/offers': 'eBay Offers',
  '/ebay/returns': 'eBay Returns',
  '/ebay/cases': 'eBay Cases',
  '/ebay/finances': 'eBay Finances',
  '/ebay/analytics': 'eBay Analytics',
  '/ebay/import': 'eBay Import',
  '/ebay/logs': 'eBay Logs',
  '/settings': 'Settings',
};

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const activeNiche = String(localStorage.getItem('swish_active_niche') || 'coins');
  const identifyLabel: Record<string, string> = { coins: 'Coin Flipper', clothing: 'Threads Flip — Identify', bicycles: 'SWISH Bikes — Identify', motocross: 'SWISH MX — Identify', surplus_flip: 'Surplus Flip — Identify' };
  const captureLabels: Record<string, string> = { coins: 'Coin Flipper', clothing: 'Threads Flip — Identify', bicycles: 'SWISH Bikes — Identify', motocross: 'SWISH MX — Identify', surplus_flip: 'Surplus Flip — Identify' };
  const scanNiche = location.pathname.split('/')[2];
  const scanKey = scanNiche === 'bikes' ? 'bicycles' : scanNiche === 'mx' ? 'motocross' : scanNiche;
  const pageLabel = location.pathname === '/identify'
    ? (identifyLabel[activeNiche] || 'SWISH — Identify')
    : location.pathname.startsWith('/scan/')
      ? (captureLabels[scanKey] || 'SWISH — Identify')
      : ROUTE_LABELS[location.pathname] || location.pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' › ');

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/inventory?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal('');
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
      <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        {searchOpen ? (
          <div className="flex items-center gap-2 max-w-sm">
            <input
              autoFocus
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search inventory…"
              className="input-field text-sm"
            />
            <button onClick={() => { setSearchOpen(false); setSearchVal(''); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <h1 className="text-base font-semibold truncate">{pageLabel}</h1>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Search className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
