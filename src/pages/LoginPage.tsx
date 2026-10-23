
import { useState, useEffect } from 'react';
import { useAuth, ConnectionStatus } from '@/contexts/AuthContext';
import { Zap, Eye, EyeOff, Loader2, AlertCircle, Key, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status === 'initialising') {
    return (
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5 h-7">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Connecting to SWISH backend…
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive mb-5 bg-destructive/10 rounded-lg px-3 py-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        Backend connection error. Check your network and try again.
      </div>
    );
  }
  return <div className="h-7 mb-5" />;
}

export default function LoginPage() {
  const { signIn, connectionStatus, setManualKey } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);

  // Manual anon key — shown only when auto-init fails (needs_key)
  const [manualKey, setManualKeyInput] = useState('');
  const [showKey, setShowKey]          = useState(false);
  const needsKey = connectionStatus === 'needs_key';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Step 1: if we still need a key, apply it and wait for connection
    if (needsKey) {
      if (!manualKey.trim()) { toast.error('Enter the backend API key first'); return; }
      setManualKey(manualKey.trim());
      return; // useEffect below will re-submit once connected
    }

    if (!email || !password) { toast.error('Enter email and password'); return; }
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error(error.message || 'Sign in failed');
    else toast.success('Welcome back');
    setLoading(false);
  };

  // Auto re-submit once connection is established after manual key entry
  const [prevStatus, setPrevStatus] = useState<ConnectionStatus>(connectionStatus);
  useEffect(() => {
    if (prevStatus === 'needs_key' && connectionStatus === 'connected' && email && password) {
      setLoading(true);
      signIn(email, password).then(({ error }) => {
        if (error) toast.error(error.message || 'Sign in failed');
        else toast.success('Welcome back');
        setLoading(false);
      });
    }
    setPrevStatus(connectionStatus);
  }, [connectionStatus, prevStatus, email, password, signIn]); // Added missing dependencies to `useEffect`

  const busy = loading || connectionStatus === 'initialising';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span
              className="text-3xl font-bold swish-gold tracking-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              SWISH
            </span>
          </div>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <ConnectionBanner status={connectionStatus} />

        <form onSubmit={handleSubmit} className="swish-card p-6 space-y-4">
          {/* Manual key field — visible ONLY if auto-init failed */}
          {needsKey && (
            <div className="pb-3 border-b border-border/60">
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground flex items-center gap-1">
                <Key className="w-3 h-3" />Backend API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={manualKey}
                  onChange={e => setManualKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs…"
                  className="input-field pr-9 font-mono text-xs"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-connect failed. Find your public anon key in OnSpace Cloud → Settings.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || (needsKey && !manualKey.trim())}
            className="btn-primary w-full justify-center py-2.5 mt-2"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {connectionStatus === 'initialising' ? 'Connecting…' : 'Signing in…'}
              </>
            ) : needsKey ? 'Connect & Sign In'
            : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          SWISH Web · {new URL('https://iwgaqieyoahmcjfziwga.backend.onspace.ai').hostname}
        </p>
      </div>
    </div>
  );
}
