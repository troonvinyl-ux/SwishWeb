import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface VerificationResult { passed: boolean; failures: string[]; warnings: string[]; }
interface ListingVerificationProps { result: VerificationResult | null; }
export default function ListingVerification({ result }: ListingVerificationProps) {
  if (!result) return null;
  const Icon = result.passed ? CheckCircle2 : AlertCircle;
  return <section aria-live="polite" className="swish-card space-y-3 p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><Icon className={`h-5 w-5 ${result.passed ? 'text-success' : 'text-destructive'}`} />{result.passed ? 'Saved listing passed verification' : 'Listing needs attention'}</h2>
    {result.failures.length > 0 && <div><h3 className="font-medium text-destructive">Blocking issues</h3><ul className="mt-2 list-disc space-y-2 pl-5">{result.failures.map((text, index) => <li key={index}>{text}</li>)}</ul></div>}
    {result.warnings.length > 0 && <div><h3 className="font-medium text-warning">Review before publishing</h3><ul className="mt-2 list-disc space-y-2 pl-5">{result.warnings.map((text, index) => <li key={index}>{text}</li>)}</ul></div>}
    <p className="text-sm leading-6 text-muted-foreground">Editing the draft or changing photos clears this result. Save and verify again before explicitly confirming publication.</p>
  </section>;
}
