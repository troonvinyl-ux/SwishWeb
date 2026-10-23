import { useState, useRef } from 'react';
import { callEdgeFunction } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase';
import { Upload, Download, RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EbayImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState('listings');

  const handleFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    setFile(files[0]);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) { toast.error('Select a CSV file'); return; }
    setImporting(true);

    // Upload the CSV file first
    const sb = getSupabaseClient();
    let csvUrl = '';
    if (sb) {
      const path = `imports/${Date.now()}_${file.name}`;
      const { data, error } = await sb.storage.from('imports').upload(path, file, { upsert: true });
      if (!error && data) {
        const { data: urlData } = sb.storage.from('imports').getPublicUrl(path);
        csvUrl = urlData?.publicUrl || '';
      }
    }

    const { data, error } = await callEdgeFunction('ebay-import-csv', {
      type: importType,
      csv_url: csvUrl,
      filename: file.name,
    });

    if (error) toast.error(error.message);
    else { toast.success('Import triggered'); setResult(data as Record<string, unknown>); }
    setImporting(false);
  };

  const handleExport = async () => {
    const { data, error } = await callEdgeFunction('ebay-export-csv', { type: importType });
    if (error) { toast.error(error.message); return; }
    const url = (data as Record<string, unknown>)?.url as string;
    if (url) window.open(url, '_blank');
    else toast.info('Export triggered — check your email or downloads');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div className="page-header">
        <h1 className="page-title">eBay Import / Export</h1>
        <p className="page-subtitle">Import and export eBay data via CSV</p>
      </div>

      <div className="swish-card p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Import / Export Type</label>
          <select value={importType} onChange={e => setImportType(e.target.value)} className="input-field mt-0.5">
            <option value="listings">Listings</option>
            <option value="orders">Orders</option>
            <option value="inventory">Inventory</option>
            <option value="categories">Categories</option>
          </select>
        </div>

        {/* Upload zone */}
        <div
          className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition-colors"
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
        >
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => handleFile(e.target.files)} />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          {file ? (
            <p className="text-sm font-medium text-primary">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium">Drop CSV file here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv and .xlsx</p>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={handleImport} disabled={importing || !file} className="btn-primary flex-1 justify-center">
            <Upload className="w-3.5 h-3.5" />{importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-3.5 h-3.5" />Export
          </button>
        </div>
      </div>

      {result && (
        <div className="swish-card p-4">
          <div className="flex items-center gap-2 mb-3">
            {(result as Record<string, unknown>).error ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : (
              <CheckCircle className="w-4 h-4 text-success" />
            )}
            <h3 className="text-sm font-semibold">Import Result</h3>
          </div>
          <pre className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded overflow-auto max-h-48 scrollbar-thin">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
