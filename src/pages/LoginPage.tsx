import { useState } from 'react';
import { useAuth, ConnectionStatus } from '@/contexts/AuthContext';
import { Zap, Eye, EyeOff, Loader2, Key, WifiOff, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const NICHES = [
  { id: 'coins', label: 'SWISH Coins', description: 'Coins and collectibles' },
  { id: 'motocross', label: 'SWISH MX', description: 'Motocross and off-road bikes' },
  { id: 'bicycles', label: 'SWISH Bikes', description: 'Bicycles and cycling gear' },
  { id: 'clothing', label: 'Threads Flip', description: 'Clothing, vintage and designer fashion' },
  { id: 'surplus_flip', label: 'SWISH Surplus', description: 'Surplus and general resale' },
];

function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status === 'initialising') {
    return <div className="mb-5 flex h-7 items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Connecting to SWISH backend…</div>;
  }
  if (status === 'error') {
    return <div className="mb-5 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"><WifiOff className="h-3.5 w-3.5 shrink-0" />Backend connection error. Check your network and try again.</div>;
  }
  return <div className="mb-5 h-7" />;
}

export default function LoginPage() {
  const { signIn, signUp, connectionStatus, setManualKey } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [niche, setNiche] = useState('coins');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualKey, setManualKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const needsKey = connectionStatus === 'needs_key';
  const busy = loading || connectionStatus === 'initialising';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (needsKey) {
      if (!manualKey.trim()) { toast.error('Enter the backend public API key first'); return; }
      setManualKey(manualKey.trim());
      toast.success('Backend configured. Submit the form again to continue.');
      return;
    }

    if (!email.trim() || !password) { toast.error('Enter your email and password'); return; }
    if (mode === 'signup') {
      if (!fullName.trim()) { toast.error('Enter your name'); return; }
      if (password.length < 8) { toast.error('Use a password with at least 8 characters'); return; }
      if (password !== confirmPassword) { toast.error('The passwords do not match'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        localStorage.setItem('swish_active_niche', niche);
        localStorage.setItem('swish_active_niche_name', NICHES.find(option => option.id === niche)?.label || niche);
        const result = await signUp(email, password, fullName, niche);
        if (result.error) toast.error(result.error.message || 'Could not create account');
        else if (result.needsEmailConfirmation) {
          toast.success('Account created. Check your email to confirm your address, then sign in.');
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else {
          localStorage.setItem('swish_active_niche', niche);
          toast.success('Welcome to SWISH. Your account is ready.');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message || 'Sign in failed');
        else toast.success('Welcome back');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-5 sm:p-6">
      <section className="w-full max-w-md animate-fade-in">
        <header className="text-center mb-7">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center"><Zap className="w-6 h-6 text-primary-foreground" /></div>
            <span className="text-4xl font-bold swish-gold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SWISH</span>
          </div>
          <p className="text-muted-foreground text-sm">One engine. Your niche. Your business.</p>
        </header>

        <ConnectionBanner status={connectionStatus} />

        <div className="swish-card p-2 grid grid-cols-2 gap-2 mb-4" role="tablist" aria-label="Account access">
          <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => setMode('signin')} className={`rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 ${mode === 'signin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><LogIn className="w-4 h-4" />Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => setMode('signup')} className={`rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><UserPlus className="w-4 h-4" />Create account</button>
        </div>

        <form onSubmit={handleSubmit} className="swish-card p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold">{mode === 'signup' ? 'Create your SWISH account' : 'Welcome back'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{mode === 'signup' ? 'Start by choosing the business you want to manage.' : 'Sign in to continue to your workspace.'}</p>
          </div>

          {needsKey && <div className="pb-3 border-b border-border/60">
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground"><Key className="w-3 h-3 inline mr-1" />Backend public API key</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={manualKey} onChange={e => setManualKeyInput(e.target.value)} placeholder="Public anon key" className="input-field pr-9 font-mono text-xs" autoComplete="off" />
              <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Only the public anon key belongs here. Never enter a service-role key or marketplace secret.</p>
          </div>}

          {mode === 'signup' && <div>
            <label htmlFor="swish-full-name" className="block text-xs font-medium mb-1.5 text-muted-foreground">Your name</label>
            <input id="swish-full-name" value={fullName} onChange={e => setFullName(e.target.value)} className="input-field" placeholder="Full name" autoComplete="name" required />
          </div>}

          <div>
            <label htmlFor="swish-email" className="block text-xs font-medium mb-1.5 text-muted-foreground">Email</label>
            <input id="swish-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" autoComplete="email" required />
          </div>

          {mode === 'signup' && <div>
            <label htmlFor="swish-niche" className="block text-xs font-medium mb-1.5 text-muted-foreground">Choose your first workspace</label>
            <select id="swish-niche" value={niche} onChange={e => setNiche(e.target.value)} className="input-field" required>
              {NICHES.map(option => <option key={option.id} value={option.id}>{option.label} — {option.description}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">You can enable other niches later if your account has access.</p>
          </div>}

          <div>
            <label htmlFor="swish-password" className="block text-xs font-medium mb-1.5 text-muted-foreground">Password</label>
            <div className="relative">
              <input id="swish-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-10" placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>

          {mode === 'signup' && <div>
            <label htmlFor="swish-confirm-password" className="block text-xs font-medium mb-1.5 text-muted-foreground">Confirm password</label>
            <div className="relative">
              <input id="swish-confirm-password" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field pr-10" placeholder="Enter password again" autoComplete="new-password" minLength={8} required />
              <button type="button" aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'} onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>}

          <button type="submit" disabled={busy || (needsKey && !manualKey.trim())} className="btn-primary w-full justify-center py-3 mt-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{connectionStatus === 'initialising' ? 'Connecting…' : mode === 'signup' ? 'Creating account…' : 'Signing in…'}</> : needsKey ? 'Connect backend' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          {mode === 'signup' && <p className="text-xs text-muted-foreground text-center leading-relaxed">Creating an account does not automatically grant a paid membership. Access is determined by SWISH's existing subscription and entitlement rules.</p>}
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">SWISH Web · secure account access</p>
      </section>
    </main>
  );
}
