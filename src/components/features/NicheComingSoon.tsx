export default function NicheComingSoon() {
  const label = window.location.hostname.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><section className="swish-card max-w-xl p-8 text-center"><p className="text-sm font-semibold uppercase tracking-widest text-primary">SWISHFLIP niche</p><h1 className="mt-4 text-4xl font-bold">{label}</h1><p className="mt-4 leading-7 text-muted-foreground">This specialist entry point is reserved, but the workspace has not been activated.</p><a href="https://swishflip.co.uk/#explore" className="btn-primary mt-6 min-h-11">Explore available niches</a></section></main>;
}
