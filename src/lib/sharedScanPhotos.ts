/** Shared browser photo preparation for all SWISH specialist scanners.
 * The original File remains available for inventory storage; the compressed
 * data URL is used only for AI inference. Never fabricate missing evidence.
 */
export type ScanPhoto = { slotId: string; label: string; file: File };
export type PreparedScan = { images: string[]; imageLabels: string[]; slots: string[] };

export async function prepareScanPhotos(
  photos: readonly ScanPhoto[],
  maxDimension = 1024,
  jpegQuality = 0.65,
): Promise<PreparedScan> {
  if (!Number.isFinite(maxDimension) || maxDimension < 1) throw new Error('Invalid photo dimension');
  if (!Number.isFinite(jpegQuality) || jpegQuality <= 0 || jpegQuality > 1) throw new Error('Invalid JPEG quality');
  const images = await Promise.all(photos.map(async ({ file }) => {
    if (!file.type.startsWith('image/')) throw new Error('Please select an image file');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read image'));
      reader.readAsDataURL(file);
    });
    return new Promise<string>((resolve, reject) => {
      const source = new Image();
      source.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(source.naturalWidth, source.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('Image processing is unavailable')); return; }
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', jpegQuality));
      };
      source.onerror = () => reject(new Error('Unable to decode image'));
      source.src = dataUrl;
    });
  }));
  return {
    images,
    imageLabels: photos.map(photo => photo.label),
    slots: photos.map(photo => photo.slotId),
  };
}

export function scanPhotoStoragePath(itemId: string, slotId: string, file: File): string {
  const safeSlot = slotId.replace(/[^a-z0-9_-]/gi, '-');
  const suffix = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  return `${itemId}/${safeSlot}-${crypto.randomUUID()}.${suffix}`;
}
