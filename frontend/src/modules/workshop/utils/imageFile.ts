/**
 * Client-side image compression before upload: phone photos arrive as
 * multi-MB JPEGs; downscaling keeps payloads ~100-300KB so uploads are fast
 * on mobile connections and well under the server's 8MB limit.
 */

const MAX_DIMENSION = 1600;
const QUALITY = 0.85;

/**
 * Downscales and re-encodes an image to WebP (JPEG fallback when WebP
 * encoding is unavailable). Returns the original file untouched when it is
 * not raster-decodable (GIF/SVG) or decoding fails.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || !file.type.startsWith('image/')) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // undecodable in this browser — send as-is, backend validates
  }

  const scale = Math.min(1, MAX_DIMENSION / bitmap.width, MAX_DIMENSION / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    if (canvas.toBlob) canvas.toBlob(resolve, 'image/webp', QUALITY);
    else resolve(null);
  });
  if (!blob || blob.size === 0) {
    // WebP encoder unavailable — retry as JPEG
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    if (!jpeg) return file;
    return new File([jpeg], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
}
