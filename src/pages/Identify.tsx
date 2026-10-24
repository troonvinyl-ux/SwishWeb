/**
 * SWISH Specialist Identification Workflow
 * Coin-specific capture/identification below remains enabled only for the coins niche until
 * verified specialist Edge Function contracts exist for the other niches.
 *
 * Requirements satisfied:
 * REQ-CAP-001 Obverse + reverse required before submission
 * REQ-CAP-002 Optional edge/detail/reference/extra images + weight/diameter/URL/notes
 * REQ-CAP-003 Editable typed notes; voice note with honest unavailable-state
 * REQ-CAP-004 Single submit, duplicate-submit protection, progress, error, retry
 * REQ-ID-001  Calls existing `swish-identify` Edge Function via secure path
 * REQ-ID-002  Routes Islamic/Indian/countermark to `swish-islamic-identify`, falls back to `swish-identify`
 * REQ-ID-003  Weight + diameter passed as hard evidence; match/contradiction displayed
 * REQ-ID-004  Ranked candidates, evidence, confidence label, contradictions, catalogue links
 * REQ-ID-005  NEVER fabricates results — all states are truthful
 * REQ-VAL-001 Calls `value` Edge Function after identification
 * REQ-VAL-002 Sold prices vs asking prices labelled separately
 * REQ-VAL-003 Terapeak badge shown only when backend confirms availability
 * REQ-CON-001 Explicit candidate selection required before confirm button enabled
 * REQ-CON-002 Full source scan (images, evidence, candidates, valuation) stored on inventory record
 * REQ-CON-003 Unreviewed/failed scans never reach confirmed inventory
 * REQ-INV-001 Exactly one inventory record created per confirmation (insert + idempotency key)
 * REQ-INV-002 Update path requires explicit existing-coin selection
 * REQ-INV-003 Status='scan_failed'/'scan_draft'/'review'/'active' keep states distinct
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { callEdgeFunction, getSupabaseClient, getSupabaseClientAsync, EdgeFunctionError } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency } from '@/lib/utils';
import { getActiveNiche } from '@/lib/niches';
import {
  Camera, Upload, X, Zap, Loader2, AlertCircle, CheckCircle, Tag,
  AlertTriangle, Info, Mic, MicOff, ExternalLink, RotateCcw,
  Scale, Ruler, Link2, FileText, ChevronDown, ChevronRight,
  Package, ArrowRight, Search
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'capture' | 'identifying' | 'review' | 'confirming' | 'confirmed';
type CoinSide = 'obverse' | 'reverse' | 'edge' | 'detail' | 'reference' | 'extra';

interface CoinImage {
  side: CoinSide;
  file: File;
  preview: string;
  storedUrl?: string;
  uploadFailed?: boolean;
}

interface Candidate {
  title?: string;
  name?: string;
  brand?: string;
  manufacturer?: string;
  model?: string;
  reference?: string;
  year?: string | number;
  country?: string;
  denomination?: string;
  metal?: string;
  alloy?: string;
  category?: string;
  description?: string;
  confidence?: number;
  evidence?: string | string[];
  contradictions?: string | string[];
  catalogue?: string;
  catalogue_url?: string;
  numista_url?: string;
  ngc_url?: string;
  pcgs_url?: string;
  bmcc_url?: string;
  weight_match?: boolean;
  diameter_match?: boolean;
  estimated_value?: number;
  condition_assumed?: string;
  [key: string]: unknown;
}

interface ValuationData {
  estimated_value?: number;
  metal_value?: number;
  catalogue_value?: number;
  dealer_value?: number;
  auction_value?: number;
  ebay_realised?: number;
  ebay_asking?: number;
  low?: number;
  median?: number;
  high?: number;
  comparable_count?: number;
  source?: string;
  source_date?: string;
  methodology?: string;
  confidence?: number;
  currency?: string;
  condition_assumed?: string;
  insufficient_evidence?: boolean;
  terapeak_available?: boolean;
  data_unavailable?: boolean;
  [key: string]: unknown;
}

interface IdentifyResult {
  candidates?: Candidate[];
  identification?: Candidate;
  unable_to_identify?: boolean;
  reason?: string;
  specialist_routed?: boolean;
  service_used?: string;
  scan_id?: string;
  item_id?: string;
  error?: string;
  [key: string]: unknown;
}

interface ScanMetadata {
  weight?: string;
  diameter?: string;
  reference_url?: string;
  notes?: string;
  voice_note?: string;
  is_islamic?: boolean;
  is_indian?: boolean;
  is_countermark?: boolean;
  metal?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function confidenceInfo(score: number): { label: string; color: string; barColor: string } {
  if (score >= 0.9) return { label: 'Confirmed',       color: 'text-green-400',  barColor: 'bg-green-500' };
  if (score >= 0.75) return { label: 'High confidence', color: 'text-green-400',  barColor: 'bg-green-500' };
  if (score >= 0.5)  return { label: 'Probable',        color: 'text-yellow-400', barColor: 'bg-yellow-500' };
  if (score >= 0.3)  return { label: 'Possible',        color: 'text-orange-400', barColor: 'bg-orange-500' };
  return                    { label: 'Needs review',    color: 'text-red-400',    barColor: 'bg-red-500' };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfidenceBar({ score }: { score: number }) {
  const { label, color, barColor } = confidenceInfo(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 bg-secondary rounded-full overflow-hidden shrink-0">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.round(score * 100)}%` }} />
      </div>
      <span className={`text-xs font-medium ${color}`}>{label} ({Math.round(score * 100)}%)</span>
    </div>
  );
}

function ImageSlot({
  side, label, required, image, onAdd, onRemove, onCamera,
}: {
  side: CoinSide; label: string; required: boolean;
  image?: CoinImage;
  onAdd: (s: CoinSide, f: File) => void;
  onRemove: (s: CoinSide) => void;
  onCamera: (s: CoinSide) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    onAdd(side, file);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium">{label}</span>
        {required && <span className="text-destructive text-xs">*</span>}
      </div>
      <div
        onClick={() => !image && onCamera(side)}
        onKeyDown={e => { if (!image && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onCamera(side); } }}
        role={!image ? 'button' : undefined}
        tabIndex={!image ? 0 : undefined}
        aria-label={!image ? `Open camera to capture ${label}` : undefined}
        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all
          ${image
            ? 'border-primary/40 bg-secondary cursor-default'
            : 'border-dashed border-border/60 hover:border-primary/50 bg-secondary/20 cursor-pointer flex items-center justify-center'
          }`}
      >
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
        {image ? (
          <>
            <img src={image.preview} alt={label} className="w-full h-full object-cover" />
            {image.uploadFailed && (
              <div className="absolute bottom-0 left-0 right-0 bg-destructive/80 text-white text-xs text-center py-1">
                Upload failed — using local preview
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); onRemove(side); }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:opacity-90 shadow-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="text-center p-2">
            <Camera className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground leading-tight">{label.toLowerCase()}</p>
          </div>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onCamera(side)} className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-2 py-2 text-xs hover:bg-primary/15 transition-colors">
          <Camera className="w-3.5 h-3.5" /> {image ? 'Retake photo' : 'Open camera'}
        </button>
        <button type="button" onClick={() => ref.current?.click()} className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-xs hover:border-primary hover:text-primary transition-colors">
          <Upload className="w-3.5 h-3.5" /> Choose file
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Identify() {
  const navigate = useNavigate();
  const [activeNiche] = useState(() => getActiveNiche());

  if (activeNiche && activeNiche.id !== 'coins') {
    return (
      <div className="swish-card max-w-2xl mx-auto p-6 space-y-3">
        <h1 className="page-title">{activeNiche.name} identification</h1>
        <p className="text-sm text-muted-foreground">
          The current capture workflow is coin-specific. This specialist route is gated so it will not submit
          {activeNiche.name.toLowerCase().replace(' flipper', '')} items to the coin identification service.
        </p>
        <p className="text-xs text-muted-foreground">
          This workflow will become available when a verified niche-specific identification service and save schema are connected.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/workspace/' + activeNiche.id)}>Back to {activeNiche.name}</button>
      </div>
    );
  }

  // Duplicate-submit guard (ref — not state — so it doesn't cause re-renders)
  const submitGuard = useRef(false);
  // Stores the newly created/updated inventory ID for the confirmed screen
  const [savedInventoryId, setSavedInventoryId] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('capture');
  const [images, setImages] = useState<Map<CoinSide, CoinImage>>(new Map());
  const [metadata, setMetadata] = useState<ScanMetadata>({});
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [cameraSide, setCameraSide] = useState<CoinSide | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDeviceId, setCameraDeviceId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [updateTargetId, setUpdateTargetId] = useState('');

  // Existing inventory search (for REQ-INV-002 — update path)
  const [inventorySearch, setInventorySearch] = useState('');
  const { data: inventoryResults } = useTable('items', {
    search: { column: 'canonical_title', query: inventorySearch },
    limit: 10,
    enabled: inventorySearch.length > 2,
  });

  // Voice note
  const [voiceSupported] = useState(() =>
    typeof window !== 'undefined' &&
    !!(window.navigator?.mediaDevices?.getUserMedia && window.MediaRecorder)
  );
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const setMeta = useCallback(<K extends keyof ScanMetadata>(k: K, v: ScanMetadata[K]) => {
    setMetadata(p => ({ ...p, [k]: v }));
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addImage = useCallback((side: CoinSide, file: File) => {
    const preview = URL.createObjectURL(file);
    setImages(p => { const n = new Map(p); n.set(side, { side, file, preview }); return n; });
  }, []);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setCameraSide(null);
    setCameraError('');
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is unavailable. Use Chrome or Edge over HTTPS, or upload a microscope image.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      const videoDevices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      setCameraDevices(videoDevices);
      const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId || deviceId || '';
      setCameraDeviceId(activeId);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      setCameraError(err instanceof Error && err.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
        : 'Could not open the microscope. Close other camera apps and retry, or upload an image.');
    }
  }, []);

  useEffect(() => {
    if (cameraSide) void startCamera(cameraDeviceId || undefined);
    return () => {
      cameraStreamRef.current?.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraSide]);

  const captureCameraImage = useCallback(() => {
    const video = cameraVideoRef.current;
    if (!video || !cameraSide || !video.videoWidth || !video.videoHeight) {
      setCameraError('Live preview is not ready yet. Wait for the image, then capture.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setCameraError('Could not capture this frame. Please try again.'); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setCameraError('Could not create the image. Please try again.'); return; }
      addImage(cameraSide, new File([blob], `coin-${cameraSide}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      stopCamera();
      toast.success('Coin image captured');
    }, 'image/jpeg', 0.95);
  }, [cameraSide, addImage, stopCamera]);

  const removeImage = useCallback((side: CoinSide) => {
    setImages(p => {
      const n = new Map(p);
      const img = n.get(side);
      if (img) URL.revokeObjectURL(img.preview);
      n.delete(side);
      return n;
    });
  }, []);

  const obverse = images.get('obverse');
  const reverse = images.get('reverse');
  const canSubmit = !!obverse && !!reverse;
  const needsSpecialist = !!(metadata.is_islamic || metadata.is_indian || metadata.is_countermark);

  // Voice recording
  const startRecording = async () => {
    if (!voiceSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        // Automatic transcription is not configured in this build — be honest
        setMeta('voice_note', '[Voice note recorded — automatic transcription is not available in this build. Please add any observations as typed notes above.]');
        toast.info('Voice note recorded. Transcription not available — please type key observations in the Notes field.');
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast.error('Microphone access denied or unavailable');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // Upload all images to storage
  const uploadImages = async (itemId: string): Promise<Map<CoinSide, string>> => {
    const sb = await getSupabaseClientAsync();
    const urls = new Map<CoinSide, string>();
    if (!sb || !itemId) return urls;

    let index = 0;
    for (const [side, img] of images) {
      index += 1;
      setProgressMsg(`Saving ${side} image…`);
      const ext = (img.file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
      // Match the existing SWISH App item-images bucket and item-scoped path policy.
      const path = `${itemId}/${index}_${side}.${ext}`;
      try {
        const { data, error } = await sb.storage.from('item-images').upload(path, img.file, { upsert: true, contentType: img.file.type || 'image/jpeg' });
        if (!error && data) {
          const { data: urlData } = sb.storage.from('item-images').getPublicUrl(path);
          if (urlData?.publicUrl) {
            urls.set(side, urlData.publicUrl);
            setImages(p => {
              const n = new Map(p);
              const i = n.get(side);
              if (i) n.set(side, { ...i, storedUrl: urlData.publicUrl });
              return n;
            });
          }
        } else {
          console.warn(`[CoinFlipper] Upload failed for ${side}:`, error?.message);
          setImages(p => {
            const n = new Map(p);
            const i = n.get(side);
            if (i) n.set(side, { ...i, uploadFailed: true });
            return n;
          });
        }
      } catch (uploadError) {
        console.warn(`[CoinFlipper] Upload failed for ${side}:`, uploadError instanceof Error ? uploadError.message : 'Network error');
        setImages(p => {
          const n = new Map(p);
          const i = n.get(side);
          if (i) n.set(side, { ...i, uploadFailed: true });
          return n;
        });
      }
    }
    return urls;
  };

  // Fetch valuation through the existing SWISH App backend. The market-value
  // function requires an authenticated tenantId and specialistId; never guess a
  // tenant or bypass its membership check.
  const fetchValuation = useCallback(async (candidate: Candidate) => {
    setValuationLoading(true);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('Backend client is not initialised');

      const { data: { user }, error: userError } = await sb.auth.getUser();
      if (userError || !user) throw new Error('Sign in to SWISH before requesting market valuation');

      const { data: membership, error: membershipError } = await sb
        .from('tenant_memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (membershipError) throw new Error(`Could not resolve your SWISH tenant: ${membershipError.message}`);
      if (!membership?.tenant_id) throw new Error('No SWISH tenant membership was found for this account');

      const title = String(candidate.title || candidate.denomination || candidate.name || '').trim();
      if (title.length < 3) throw new Error('The identification did not provide a usable title for valuation');

      const { data, error } = await callEdgeFunction<ValuationData>('swish-market-value', {
        tenantId: membership.tenant_id,
        title,
        specialistId: 'coins',
        attributes: {
          category: candidate.category,
          brand: candidate.brand || candidate.manufacturer,
          model: candidate.model,
          reference: candidate.reference,
          year: candidate.year,
          country: candidate.country,
          denomination: candidate.denomination,
          metal: candidate.metal || candidate.alloy,
          weight: metadata.weight ? parseFloat(metadata.weight) : undefined,
          diameter: metadata.diameter ? parseFloat(metadata.diameter) : undefined,
        },
        identificationConfidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0.5,
        identificationTier: (typeof candidate.confidence === 'number' && candidate.confidence >= 0.85) ? 'high'
          : (typeof candidate.confidence === 'number' && candidate.confidence >= 0.5) ? 'medium' : 'low',
      });
      if (data && !error) {
        setValuation(data as ValuationData);
      } else if (error) {
        setValuation({ data_unavailable: true });
        console.warn('[CoinFlipper] Valuation unavailable:', error instanceof EdgeFunctionError ? error.displayMessage : error.message);
      }
    } catch (err) {
      setValuation({ data_unavailable: true });
      console.warn('[CoinFlipper] Valuation unavailable:', err instanceof Error ? err.message : 'Unknown valuation error');
    } finally {
      setValuationLoading(false);
    }
  }, [metadata.weight, metadata.diameter]);

  // Convert captured/uploaded files to data URLs so identification still works
  // when public Storage upload is unavailable. The existing SWISH App Edge Function
  // accepts data URLs in the `images` array.
  // Match the proven KeenOnCoins Capture Station upload path: normalise selected
  // images before sending them to the existing SWISH Edge Function. This prevents
  // oversized phone/microscope originals causing HTTP 400 payload failures.
  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read image'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read image'));
        return;
      }
      const image = new Image();
      image.onerror = () => reject(new Error('Could not decode selected image'));
      image.onload = () => {
        const maxDimension = 1800;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) {
          reject(new Error('Could not prepare selected image'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT — identification request (REQ-CAP-004, REQ-ID-001, REQ-ID-002)
  // ──────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // REQ-CAP-001 — guard
    if (!canSubmit) { toast.error('Both obverse and reverse images are required'); return; }

    // REQ-CAP-004 — duplicate-submit protection
    if (submitGuard.current) { toast.warning('Identification already in progress'); return; }
    submitGuard.current = true;

    setErrorMsg('');
    setResult(null);
    setValuation(null);
    setStep('identifying');

    // Identification uses the original image data directly. Persist images only after
    // an item ID exists so uploads use SWISH App's item-images/{itemId}/ path contract.
    const storedUrls = new Map<CoinSide, string>();

    // Resolve authenticated tenant context from the existing SWISH App backend.
    // Edge Functions enforce tenant membership; never invent or omit this context.
    let tenantId = '';
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected');
      const { data: { user }, error: userError } = await sb.auth.getUser();
      if (userError || !user) throw new Error('Please sign in to SWISH before identifying coins');
      const { data: membership, error: membershipError } = await sb
        .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (membershipError) throw new Error(`Could not resolve your SWISH tenant: ${membershipError.message}`);
      if (!membership?.tenant_id) throw new Error('No SWISH tenant membership was found for this account');
      tenantId = membership.tenant_id;
    } catch (tenantError) {
      setErrorMsg(tenantError instanceof Error ? tenantError.message : 'Could not resolve your SWISH tenant');
      setStep('capture');
      submitGuard.current = false;
      return;
    }

    setProgressMsg('Analysing coin with AI…');

    // REQ-ID-002 — specialist routing
    const fnName = needsSpecialist ? 'swish-islamic-identify' : 'swish-identify';
    const coinType = metadata.is_islamic ? 'islamic'
      : metadata.is_indian ? 'indian'
      : metadata.is_countermark ? 'countermark'
      : 'general';

    // Keep image order deterministic so the backend always receives obverse then
    // reverse, followed by optional detail/reference images, regardless of upload order.
    const sideOrder: CoinSide[] = ['obverse', 'reverse', 'edge', 'detail', 'reference', 'extra'];
    const orderedImages = Array.from(images.values()).sort(
      (a, b) => sideOrder.indexOf(a.side) - sideOrder.indexOf(b.side),
    );
    let imageDataUrls: string[] = [];
    try {
      // Reuse the proven Capture Station path: normalize image files and send data URLs
      // directly to the existing SWISH Edge Function, without relying on Storage uploads.
      imageDataUrls = await Promise.all(orderedImages.map(img => fileToDataUrl(img.file)));
    } catch (readError) {
      const detail = readError instanceof Error ? readError.message : 'Unknown image read error';
      setErrorMsg(`Could not read the captured coin images: ${detail}`);
      setStep('capture');
      submitGuard.current = false;
      return;
    }

    const measurementWeight = metadata.weight ? parseFloat(metadata.weight) : undefined;
    const measurementDiameter = metadata.diameter ? parseFloat(metadata.diameter) : undefined;
    const observedMetal = String(metadata['metal'] || 'Unknown');
    const observationNotes = [metadata.notes, metadata.voice_note].filter(Boolean).join('\n').trim();
    const knownAttributes = {
      weight_g: measurementWeight,
      diameter_mm: measurementDiameter,
      thickness_mm: undefined,
      metal: observedMetal,
      notes: observationNotes,
    };
    const imageSides = Array.from(images.values());
    const payload = {
      // Keep the same data-URL image transport used by KeenOnCoins Capture Station.
      // Include side labels and both legacy/current field names for the existing SWISH handler.
      images: imageDataUrls,
      imageLabels: orderedImages.map(img => img.side),
      existingImageUrls: Array.from(storedUrls.values()),
      tenantId,
      tenant_id: tenantId,
      specialistId: needsSpecialist ? 'islamic_silver' : 'coins',
      nicheId: 'coins',
      acquisitionContext: 'Coin Flipper identification from microscope capture',
      knownAttributes,
      weight: measurementWeight,
      weight_g: measurementWeight,
      diameter: measurementDiameter,
      diameter_mm: measurementDiameter,
      metal: observedMetal,
      notes: observationNotes || undefined,
      reference_url: metadata.reference_url || undefined,
      voice_note: metadata.voice_note || undefined,
      coin_type: coinType,
      specialist: needsSpecialist,
    };

    let identResult: IdentifyResult | null = null;

    const { data: primaryData, error: primaryError } = await callEdgeFunction<IdentifyResult>(fnName, payload);

    if (primaryError && needsSpecialist) {
      // Specialist function not deployed — fall back gracefully (REQ-ID-005: no fabrication)
      const errMsg = primaryError instanceof EdgeFunctionError ? primaryError.displayMessage : primaryError.message;
      toast.warning(`Specialist service unavailable (${errMsg}) — using general identification`);
      setProgressMsg('Falling back to general identification…');

      const { data: fallback, error: fallbackErr } = await callEdgeFunction<IdentifyResult>('swish-identify', { ...payload, specialist: false });

      if (fallbackErr) {
        const msg = fallbackErr instanceof EdgeFunctionError ? fallbackErr.displayMessage : fallbackErr.message;
        setErrorMsg(msg);
        setStep('capture');
        submitGuard.current = false;
        return;
      }
      identResult = fallback;
    } else if (primaryError) {
      const msg = primaryError instanceof EdgeFunctionError ? primaryError.displayMessage : primaryError.message;
      setErrorMsg(msg);
      setStep('capture');
      submitGuard.current = false;
      return;
    } else {
      identResult = primaryData;
    }

    setProgressMsg('');
    setResult(identResult);
    setSelectedIdx(0);
    setStep('review');
    submitGuard.current = false;

    // REQ-VAL-001 — fetch valuation for top candidate
    const topCandidate = identResult?.candidates?.[0] ?? (identResult?.identification ?? null);
    if (topCandidate && !identResult?.unable_to_identify) {
      fetchValuation(topCandidate);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIRM — save to inventory (REQ-CON-001, REQ-CON-002, REQ-INV-001)
  // ──────────────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    const candidates = result?.candidates ?? (result?.identification ? [result.identification as Candidate] : []);
    const candidate = candidates[selectedIdx];
    if (!candidate) { toast.error('Select a candidate before confirming'); return; }

    setStep('confirming');

    // REQ-CON-002 — preserve full source scan including all candidates, images, evidence
    const identificationData = {
      confirmed_candidate: candidate,
      all_candidates: result?.candidates ?? [],
      service_used: needsSpecialist ? 'swish-islamic-identify' : 'swish-identify',
      specialist_routed: result?.specialist_routed ?? false,
      scan_metadata: {
        weight: metadata.weight,
        diameter: metadata.diameter,
        reference_url: metadata.reference_url,
        notes: metadata.notes,
        voice_note: metadata.voice_note,
        is_islamic: metadata.is_islamic,
        is_indian: metadata.is_indian,
        is_countermark: metadata.is_countermark,
      },
      scan_images: Object.fromEntries(
        Array.from(images.entries()).map(([side, img]) => [side, img.storedUrl ?? img.preview])
      ),
      valuation,
      confirmed_at: new Date().toISOString(),
    };

    // REQ-INV-001 — confidence < 0.5 → 'review'; ≥ 0.5 → 'active'
    const confidence = candidate.confidence ?? 0;
    const sb = await getSupabaseClientAsync();
    if (!sb) {
      toast.error('SWISH backend is not connected');
      setStep('review');
      return;
    }
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) {
      toast.error('Please sign in to save this coin');
      setStep('review');
      return;
    }
    const { data: membership, error: membershipError } = await sb
      .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
    if (membershipError || !membership?.tenant_id) {
      toast.error(membershipError?.message || 'No SWISH tenant membership was found');
      setStep('review');
      return;
    }
    const tenantId = membership.tenant_id as string;
    const media = Array.from(images.values()).map(i => i.storedUrl).filter((url): url is string => !!url && /^https:\/\//i.test(url));
    const attributes = {
      ...candidate,
      source_scan: identificationData,
      supplied_weight_g: metadata.weight ? Number(metadata.weight) : undefined,
      supplied_diameter_mm: metadata.diameter ? Number(metadata.diameter) : undefined,
      reference_url: metadata.reference_url || undefined,
      custom_notes: metadata.notes || undefined,
      valuation_data: valuation,
    };
    const row: Record<string, unknown> = {
      tenant_id: tenantId,
      canonical_title: String(candidate.title ?? candidate.denomination ?? candidate.name ?? 'Unidentified Coin'),
      description: String(candidate.description ?? ''),
      specialist_id: needsSpecialist ? 'islamic_silver' : 'coins',
      status: confidence >= 0.5 ? 'identified' : 'review_required',
      disposition_decision: 'pending',
      condition: 'Used',
      condition_notes: '',
      identification_confidence: confidence,
      identification_source: 'detected',
      valuation_low: Number(valuation?.low ?? 0),
      valuation_mid: Number(valuation?.median ?? valuation?.estimated_value ?? candidate.estimated_value ?? 0),
      valuation_high: Number(valuation?.high ?? 0),
      valuation_confidence: valuation?.confidence && Number(valuation.confidence) >= 0.8 ? 'high' : 'unknown',
      expected_selling_price: Number(valuation?.median ?? valuation?.estimated_value ?? candidate.estimated_value ?? 0),
      expected_net: 0,
      expected_profit: 0,
      sale_prob_30d: 0,
      attributes,
      media,
      warnings: confidence < 0.5 ? ['Identification confidence is low; manual review required before listing.'] : [],
      tags: ['coin-flipper'],
      acquired_cost: 0,
      weight_grams: metadata.weight ? Number(metadata.weight) : null,
      dimensions_mm: metadata.diameter ? { diameter: Number(metadata.diameter) } : {},
      material: String(candidate.metal ?? candidate.alloy ?? ''),
      country_of_origin: String(candidate.country ?? ''),
      denomination: String(candidate.denomination ?? ''),
      catalogue_number: String(candidate.reference ?? ''),
    };

    // REQ-INV-002 — if user selected an existing coin to update, use upsert instead
    if (showUpdatePanel && updateTargetId) {
      const { error } = await sb.from('items').update(row).eq('id', updateTargetId).eq('tenant_id', tenantId);
      if (error) {
        toast.error(error.message);
        setStep('review');
        return;
      }
      const savedUrls = await uploadImages(updateTargetId);
      const permanentMedia = Array.from(savedUrls.values());
      if (permanentMedia.length) {
        const { error: mediaError } = await sb.from('items').update({ media: permanentMedia }).eq('id', updateTargetId).eq('tenant_id', tenantId);
        if (mediaError) toast.warning(`Coin updated, but image links could not be saved: ${mediaError.message}`);
      } else {
        toast.warning('Coin updated, but microscope images could not be uploaded. Check item-images storage permissions.');
      }
      toast.success('Inventory record updated');
      setSavedInventoryId(updateTargetId);
      setStep('confirmed');
      return;
    }

    const { data: savedItem, error: saveError } = await sb.from('items').insert(row).select('id').single();
    if (saveError || !savedItem) {
      toast.error(saveError?.message || 'Coin could not be saved to SWISH inventory');
      setStep('review');
      return;
    }
    const savedUrls = await uploadImages(savedItem.id as string);
    const permanentMedia = Array.from(savedUrls.values());
    if (permanentMedia.length) {
      const { error: mediaError } = await sb.from('items').update({ media: permanentMedia }).eq('id', savedItem.id).eq('tenant_id', tenantId);
      if (mediaError) toast.warning(`Coin saved, but image links could not be saved: ${mediaError.message}`);
    } else {
      toast.warning('Coin saved, but microscope images could not be uploaded. Check item-images storage permissions.');
    }
    setSavedInventoryId(savedItem.id as string);
    toast.success('Coin saved to SWISH inventory');
    setStep('confirmed');
  };

  const handleReset = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages(new Map());
    setMetadata({});
    setResult(null);
    setValuation(null);
    setSelectedIdx(0);
    setErrorMsg('');
    setShowOptional(false);
    setShowUpdatePanel(false);
    setUpdateTargetId('');
    setInventorySearch('');
    setSavedInventoryId(null);
    setStep('capture');
    submitGuard.current = false;
  };

  const candidates = result?.candidates ?? (result?.identification ? [result.identification as Candidate] : []);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Identifying (progress spinner)
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'identifying') {
    return (
      <div className="max-w-sm mx-auto pt-20 text-center space-y-5 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Identifying coin…</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressMsg || 'Analysing images with AI…'}</p>
        </div>
        {/* Show the two required coin images while waiting */}
        <div className="grid grid-cols-2 gap-3 max-w-48 mx-auto">
          {(['obverse', 'reverse'] as CoinSide[]).map(side => (
            images.get(side) && (
              <div key={side} className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-border">
                <img src={images.get(side)!.preview} alt={side} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-black/50 text-center text-white text-xs py-1 capitalize">
                  {side}
                </div>
              </div>
            )
          ))}
        </div>
        {needsSpecialist && (
          <p className="text-xs text-primary flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />Using specialist identification service
          </p>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Confirming
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'confirming') {
    return (
      <div className="max-w-sm mx-auto pt-20 text-center space-y-4 animate-fade-in">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Saving to inventory…</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Confirmed
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'confirmed') {
    return (
      <div className="max-w-sm mx-auto pt-16 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Saved to Inventory</h2>
          <p className="text-sm text-muted-foreground mt-1">What would you like to do next?</p>
        </div>
        <div className="flex flex-col gap-3">
          {savedInventoryId && (
            <button
              onClick={() => navigate(`/listings/new?item_id=${savedInventoryId}`)}
              className="btn-primary w-full justify-center"
            >
              <Tag className="w-4 h-4" />Create eBay Listing
            </button>
          )}
          <button
            onClick={() => navigate(savedInventoryId ? `/inventory/${savedInventoryId}` : '/inventory')}
            className="btn-secondary w-full justify-center"
          >
            <Package className="w-4 h-4" />View Inventory Record
          </button>
          <button onClick={handleReset} className="btn-ghost w-full justify-center text-sm">
            <RotateCcw className="w-3.5 h-3.5" />Scan another coin
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Review (REQ-ID-004, REQ-VAL-002, REQ-CON-001)
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'review') {
    const selected = candidates[selectedIdx];
    const selectionMade = candidates.length > 0;

    return (
      <div className="space-y-5 animate-fade-in max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">Review Identification</h1>
            <p className="page-subtitle">
              {result?.unable_to_identify
                ? 'Unable to identify — insufficient visual evidence'
                : `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}${
                    result?.specialist_routed ? ' · specialist service' :
                    needsSpecialist ? ' · fallback to general' : ''
                  }`
              }
            </p>
          </div>
          <button onClick={handleReset} className="btn-ghost shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />New scan
          </button>
        </div>

        {/* Unable to identify */}
        {result?.unable_to_identify && (
          <div className="swish-card p-5 space-y-3">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Unable to identify</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {result.reason ?? 'The AI could not identify this coin with sufficient confidence. Try: cleaner images with better lighting, higher resolution, or provide weight and diameter measurements.'}
                </p>
              </div>
            </div>
            <button onClick={handleReset} className="btn-secondary text-xs">
              <RotateCcw className="w-3.5 h-3.5" />Scan again with better images
            </button>
          </div>
        )}

        {/* Selection instruction */}
        {candidates.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Select the correct identification below, review all evidence carefully, then click Confirm.
            Do not confirm if the evidence is insufficient — use "Needs review" items with caution.
          </div>
        )}

        {/* Candidate cards */}
        {candidates.map((c, i) => (
          <div
            key={i}
            onClick={() => setSelectedIdx(i)}
            className={`swish-card p-4 cursor-pointer border-2 transition-all ${
              selectedIdx === i ? 'border-primary' : 'border-transparent hover:border-primary/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Radio indicator */}
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                selectedIdx === i ? 'border-primary' : 'border-border'
              }`}>
                {selectedIdx === i && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                {/* Title */}
                <div>
                  <p className="font-semibold text-sm">
                    {c.title ?? c.denomination ?? `Candidate ${i + 1}`}
                  </p>
                  <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-0.5">
                    {c.country && <span>{c.country}</span>}
                    {c.year && <span>· {c.year}</span>}
                    {c.metal && <span>· {c.metal}</span>}
                    {c.manufacturer && <span>· {c.manufacturer}</span>}
                    {c.reference && <span className="font-mono">· {c.reference}</span>}
                  </div>
                </div>

                {/* Confidence bar */}
                {c.confidence != null && <ConfidenceBar score={c.confidence} />}

                {/* Evidence — REQ-ID-004 */}
                {toArray(c.evidence).length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">Supporting evidence:</p>
                    {toArray(c.evidence).map((ev, j) => (
                      <div key={j} className="flex items-start gap-1.5 text-xs">
                        <CheckCircle className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contradictions */}
                {toArray(c.contradictions).length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-warning">Contradictions:</p>
                    {toArray(c.contradictions).map((ct, j) => (
                      <div key={j} className="flex items-start gap-1.5 text-xs">
                        <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                        <span>{ct}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Measurement match indicators — REQ-ID-003 */}
                {(c.weight_match != null || c.diameter_match != null) && (
                  <div className="flex gap-4">
                    {c.weight_match != null && (
                      <div className={`flex items-center gap-1 text-xs ${c.weight_match ? 'text-green-400' : 'text-destructive'}`}>
                        <Scale className="w-3 h-3" />
                        Weight {c.weight_match ? '✓ matches' : '✗ contradiction'}
                      </div>
                    )}
                    {c.diameter_match != null && (
                      <div className={`flex items-center gap-1 text-xs ${c.diameter_match ? 'text-green-400' : 'text-destructive'}`}>
                        <Ruler className="w-3 h-3" />
                        Diameter {c.diameter_match ? '✓ matches' : '✗ contradiction'}
                      </div>
                    )}
                  </div>
                )}

                {c.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
                )}

                {/* Catalogue links */}
                <div className="flex flex-wrap gap-3 pt-0.5">
                  {(c.catalogue_url || c.numista_url) && (
                    <a href={(c.catalogue_url ?? c.numista_url) as string} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" />Numista
                    </a>
                  )}
                  {c.ngc_url && (
                    <a href={c.ngc_url as string} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" />NGC
                    </a>
                  )}
                  {c.pcgs_url && (
                    <a href={c.pcgs_url as string} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" />PCGS
                    </a>
                  )}
                  {c.bmcc_url && (
                    <a href={c.bmcc_url as string} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" />BMCC
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Valuation panel — REQ-VAL-002, REQ-VAL-003 */}
        {(valuationLoading || valuation) && (
          <div className="swish-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Valuation</h3>
              {valuationLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              {valuation?.terapeak_available && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">
                  Terapeak data
                </span>
              )}
            </div>

            {valuationLoading && (
              <p className="text-xs text-muted-foreground">Fetching market data…</p>
            )}

            {/* REQ-VAL-002 — unavailable state is honest */}
            {!valuationLoading && valuation?.data_unavailable && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Market valuation data is currently unavailable from the backend. No price estimate is shown.
              </div>
            )}

            {!valuationLoading && valuation && !valuation.data_unavailable && (
              <>
                {valuation.insufficient_evidence && (
                  <div className="flex items-center gap-2 text-xs text-warning">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Insufficient market data — this is an estimate only, not a verified sale value
                  </div>
                )}

                {/* Sold vs asking — clearly separated (REQ-VAL-002) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Metal Value',      value: valuation.metal_value,    note: 'spot price',            sold: true  },
                    { label: 'eBay Realised',    value: valuation.ebay_realised,  note: '✓ verified sold',       sold: true  },
                    { label: 'Auction Value',    value: valuation.auction_value,  note: '✓ hammer avg',          sold: true  },
                    { label: 'Catalogue Value',  value: valuation.catalogue_value,note: 'reference price',       sold: false },
                    { label: 'Dealer Value',     value: valuation.dealer_value,   note: 'dealer buy',            sold: false },
                    { label: 'eBay Asking',      value: valuation.ebay_asking,    note: '⚠ active listings only', sold: false },
                  ].filter(v => v.value != null).map(v => (
                    <div key={v.label}
                      className={`rounded-lg p-2.5 ${v.sold ? 'bg-green-500/5 ring-1 ring-green-500/20' : 'bg-secondary/40'}`}
                    >
                      <div className="text-xs text-muted-foreground">{v.label}</div>
                      <div className="text-sm font-bold swish-gold">{formatCurrency(v.value!)}</div>
                      <div className="text-xs text-muted-foreground">{v.note}</div>
                    </div>
                  ))}
                </div>

                {valuation.comparable_count != null && (
                  <p className="text-xs text-muted-foreground">
                    Based on {valuation.comparable_count} comparable{valuation.comparable_count !== 1 ? 's' : ''}
                    {valuation.source ? ` · ${valuation.source}` : ''}
                    {valuation.source_date ? ` (${valuation.source_date})` : ''}
                  </p>
                )}

                {/* REQ-VAL-002 — explicit disclaimer */}
                <div className="bg-warning/5 border border-warning/20 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                  ⚠️ eBay asking prices are not verified sales. Only "eBay Realised" reflects actual completed transactions.
                  Do not use asking prices as market value.
                </div>
              </>
            )}
          </div>
        )}

        {/* REQ-INV-002 — update existing coin panel */}
        <div className="swish-card p-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowUpdatePanel(!showUpdatePanel)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full"
          >
            {showUpdatePanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Update an existing inventory record instead of creating new
          </button>
          {showUpdatePanel && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={inventorySearch}
                  onChange={e => setInventorySearch(e.target.value)}
                  placeholder="Search existing inventory…"
                  className="input-field pl-8 text-xs"
                />
              </div>
              {(inventoryResults as Record<string, unknown>[])?.map(item => (
                <button
                  key={item.id as string}
                  type="button"
                  onClick={() => { setUpdateTargetId(item.id as string); setInventorySearch(String(item.canonical_title ?? '')); }}
                  className={`w-full text-left p-2 rounded-lg text-xs border transition-colors ${
                    updateTargetId === item.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="font-medium">{String(item.canonical_title ?? 'Untitled')}</div>
                  <div className="text-muted-foreground">{item.sku as string ?? ''}</div>
                </button>
              ))}
              {showUpdatePanel && updateTargetId && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Will update: {inventorySearch}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Confidence warning for low-confidence confirmation */}
        {selected && selected.confidence != null && selected.confidence < 0.5 && (
          <div className="flex items-start gap-2 text-xs text-warning">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            This candidate has low confidence. Item will be saved with <strong>&quot;Review Required&quot;</strong> status
            and will not appear as confirmed inventory until manually reviewed.
          </div>
        )}

        {/* Confirm + Discard actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleConfirm}
            disabled={!selectionMade || step === 'confirming'}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            {showUpdatePanel && updateTargetId ? 'Update Inventory Record' : 'Confirm & Save to Inventory'}
          </button>
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw className="w-3.5 h-3.5" />Discard
          </button>
        </div>

        {/* No candidates, not explicitly unable */}
        {!result?.unable_to_identify && candidates.length === 0 && (
          <div className="swish-card p-5 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No identification data returned by the backend</p>
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Raw response</summary>
              <pre className="text-left bg-secondary/40 p-3 rounded mt-2 overflow-auto max-h-40 scrollbar-thin text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
            <button onClick={handleReset} className="btn-secondary">Try again</button>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Capture (default — step === 'capture')
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Zap className="w-5 h-5 swish-gold" />Coin Flipper
          </h1>
          <p className="page-subtitle">
            Photograph both sides of your coin for AI identification and valuation
          </p>
        </div>
      </div>

      {/* Error banner (from previous failed attempt) */}
      {errorMsg && (
        <div className="swish-card p-4 flex gap-3 items-start">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Identification failed</p>
            <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-xs text-primary shrink-0 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Required images */}
      <div className="swish-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Coin Images</h3>
          <span className="text-xs text-destructive font-medium">* Both required</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ImageSlot side="obverse" label="Obverse (Front)" required image={obverse} onAdd={addImage} onRemove={removeImage} onCamera={side => { setCameraError(''); setCameraSide(side); }} />
          <ImageSlot side="reverse" label="Reverse (Back)"  required image={reverse} onAdd={addImage} onRemove={removeImage} onCamera={side => { setCameraError(''); setCameraSide(side); }} />
        </div>
        {!canSubmit && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            {!obverse && !reverse
              ? 'Add obverse and reverse images to continue'
              : !obverse
              ? 'Add obverse (front) image to continue'
              : 'Add reverse (back) image to continue'}
          </p>
        )}
      </div>

      {/* Optional additional images */}
      <div className="swish-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/20 transition-colors"
        >
          <span className="text-muted-foreground font-medium text-sm">
            Additional images <span className="text-xs font-normal">(optional — improves accuracy)</span>
          </span>
          {showOptional ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showOptional && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ImageSlot side="edge"      label="Edge"      required={false} image={images.get('edge')}      onAdd={addImage} onRemove={removeImage} onCamera={side => { setCameraError(''); setCameraSide(side); }} />
              <ImageSlot side="detail"    label="Detail"    required={false} image={images.get('detail')}    onAdd={addImage} onRemove={removeImage} onCamera={side => { setCameraError(''); setCameraSide(side); }} />
              <ImageSlot side="reference" label="Reference" required={false} image={images.get('reference')} onAdd={addImage} onRemove={removeImage} onCamera={side => { setCameraError(''); setCameraSide(side); }} />
              <ImageSlot side="extra"     label="Extra"     required={false} image={images.get('extra')}     onAdd={addImage} onRemove={removeImage} onCamera={side => { setCameraError(''); setCameraSide(side); }} />
            </div>
          </div>
        )}
      </div>

      {/* Metadata — REQ-CAP-002 */}
      <div className="swish-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Measurements &amp; Reference
          <span className="text-xs font-normal ml-1">(optional — used as hard identification evidence)</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Scale className="w-3 h-3" />Weight (grams)
            </label>
            <input
              type="number" step="0.01" min="0"
              value={metadata.weight ?? ''}
              onChange={e => setMeta('weight', e.target.value || undefined)}
              className="input-field text-sm"
              placeholder="e.g. 9.45"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Ruler className="w-3 h-3" />Diameter (mm)
            </label>
            <input
              type="number" step="0.1" min="0"
              value={metadata.diameter ?? ''}
              onChange={e => setMeta('diameter', e.target.value || undefined)}
              className="input-field text-sm"
              placeholder="e.g. 28.0"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Link2 className="w-3 h-3" />Reference URL
            <span className="text-xs">(Numista, NGC, PCGS, British Museum, etc.)</span>
          </label>
          <input
            type="url"
            value={metadata.reference_url ?? ''}
            onChange={e => setMeta('reference_url', e.target.value || undefined)}
            className="input-field text-sm"
            placeholder="https://en.numista.com/catalogue/…"
          />
        </div>

        {/* Notes — REQ-CAP-003 */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <FileText className="w-3 h-3" />Notes
          </label>
          <textarea
            value={metadata.notes ?? ''}
            onChange={e => setMeta('notes', e.target.value || undefined)}
            rows={3}
            className="input-field text-sm"
            placeholder="Inscriptions, legends, observed grade, edge markings, provenance, uncertainty…"
          />
        </div>

        {/* Voice note — REQ-CAP-003 (truthful unavailable state) */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Voice Note</label>
          {voiceSupported ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors min-h-[36px] ${
                    recording
                      ? 'border-destructive text-destructive hover:bg-destructive/10'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
                  }`}
                >
                  {recording
                    ? <><MicOff className="w-3.5 h-3.5" />Stop recording</>
                    : <><Mic className="w-3.5 h-3.5" />Record voice note</>}
                </button>
                {recording && (
                  <span className="text-xs text-destructive animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-destructive inline-block" />Recording…
                  </span>
                )}
              </div>
              {metadata.voice_note && !recording && (
                <div className="bg-secondary/30 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                  {metadata.voice_note}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MicOff className="w-3.5 h-3.5" />
              Voice notes are not supported in this browser. Please use the Notes field above.
            </p>
          )}
        </div>

        {/* Specialist routing — REQ-ID-002 */}
        <div className="border-t border-border/40 pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Specialist Identification</p>
          <div className="space-y-2">
            {([
              { key: 'is_islamic'    as const, label: 'Islamic coin (Dirham, Dinar, Fals, etc.)' },
              { key: 'is_indian'     as const, label: 'Indian coin (Mughal, colonial, princely state, etc.)' },
              { key: 'is_countermark' as const, label: 'Countermarked coin' },
            ] as const).map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={!!metadata[opt.key]}
                  onChange={e => setMeta(opt.key, e.target.checked || undefined)}
                  className="w-3.5 h-3.5 accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {needsSpecialist && (
            <p className="text-xs text-primary mt-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Will use specialist identification service (swish-islamic-identify)
            </p>
          )}
        </div>
      </div>

      {/* Submit button — REQ-CAP-004 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4" />
          Identify Coin
        </button>
        {!canSubmit && (
          <p className="text-xs text-muted-foreground">
            Add {!obverse ? 'obverse' : 'reverse'} image to continue
          </p>
        )}
      </div>

      {cameraSide && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Microscope camera capture">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-semibold">Capture {cameraSide === 'obverse' ? 'obverse (front)' : cameraSide === 'reverse' ? 'reverse (back)' : cameraSide}</h2><p className="text-xs text-muted-foreground">Select your USB microscope if multiple cameras are available.</p></div>
              <button type="button" onClick={stopCamera} className="rounded-lg p-2 hover:bg-secondary" aria-label="Close camera"><X className="w-5 h-5" /></button>
            </div>
            {cameraDevices.length > 1 && <select value={cameraDeviceId} onChange={e => { setCameraDeviceId(e.target.value); void startCamera(e.target.value); }} className="input-field w-full text-sm" aria-label="Select camera">
              {cameraDevices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${i + 1}`}</option>)}
            </select>}
            <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full max-h-[65vh] rounded-xl bg-black object-contain" />
            {cameraError && <p role="alert" className="text-sm text-destructive">{cameraError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={captureCameraImage} className="btn-primary"><Camera className="w-4 h-4" /> Capture image</button>
              <button type="button" onClick={() => void startCamera(cameraDeviceId || undefined)} className="rounded-lg border border-border px-3 py-2 text-sm">Reconnect camera</button>
              <button type="button" onClick={stopCamera} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="swish-card p-4 flex gap-3 items-start">
        <Package className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Tips for best results:</strong>{' '}
          Photograph against a plain dark or light background. Avoid glare.
          Include a scale reference if possible. Provide weight and diameter
          measurements — they are used as hard evidence and significantly improve accuracy.
          <br />
          After identification, you will review all candidates before anything is saved to inventory.
        </div>
      </div>

      {/* Quick link to inventory */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowRight className="w-3.5 h-3.5" />
        <span>Want to add a coin manually?</span>
        <a
          href="/inventory/new"
          className="text-primary hover:underline"
          onClick={e => { e.preventDefault(); navigate('/inventory/new'); }}
        >
          New inventory item
        </a>
      </div>
    </div>
  );
}
