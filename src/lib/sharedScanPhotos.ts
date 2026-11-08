/** Browser photo preparation only; uses SWISH's existing item-images path contract. */
export interface ScanPhoto {
  slotId: string;
  label: string;
  file: File;
}

export interface PreparedScanPhotos {
  images: string[];
  imageLabels: string[];
  slots: string[];
}

async function preparePhoto(file: File): Promise<string> {
  if (!file.size) throw new Error('The selected photo is empty');
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }
  const sourceUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const source = new Image();
    source.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(source);
    };
    source.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Could not decode the selected photo. Try a JPEG or PNG image.'));
    };
    source.src = sourceUrl;
  });
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('The selected photo has no readable dimensions');
  }
  // Match specialist capture: max 1024px, JPEG quality 0.65.
  const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo processing is unavailable in this browser');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.65);
}

export async function prepareScanPhotos(photos: readonly ScanPhoto[]): Promise<PreparedScanPhotos> {
  if (!photos.length) throw new Error('Add a photo before identifying the item');
  // Promise.all preserves the profile order and alignment with labels and slots.
  const images = await Promise.all(photos.map(photo => preparePhoto(photo.file)));
  return {
    images,
    imageLabels: photos.map(photo => photo.label),
    slots: photos.map(photo => photo.slotId),
  };
}

export function scanPhotoStoragePath(itemId: string, slot: string, file: File): string {
  if (!/^[a-z0-9_-]+$/i.test(itemId)) throw new Error('A valid inventory item ID is required');
  const safeSlot = slot.replace(/[^a-z0-9_-]/gi, '-').slice(0, 64) || 'photo';
  const namedExtension = file.name.includes('.') ? file.name.split('.').pop() : '';
  const extension = namedExtension?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
    || ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' } as Record<string, string>)[file.type]
    || 'jpg';
  return `${itemId}/${Date.now()}_${safeSlot}.${extension}`;
}
