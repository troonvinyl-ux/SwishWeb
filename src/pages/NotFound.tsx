import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function NotFound() {
  const location = useLocation();
  useEffect(() => {
    console.error('404:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-6xl font-bold swish-gold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>404</div>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-muted-foreground text-sm mb-6">
          <code className="bg-secondary px-2 py-1 rounded text-xs">{location.pathname}</code>
        </p>
        <Link to="/dashboard" className="btn-primary inline-flex">Go to Dashboard</Link>
      </div>
    </div>
  );
}
