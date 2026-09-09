import { api } from './api';

/** A single entry of the central image library (gallery_images table). */
export interface GalleryImage {
  id: string;
  url: string;
  fileName: string;
  category: string;
  label: string;
  alt: string;
  tags: string[];
  /** Probed server-side at upload; null for legacy rows. */
  width: number | null;
  height: number | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

export interface GalleryPatch {
  category?: string;
  label?: string;
  alt?: string;
  tags?: string[];
}

export interface UploadMeta {
  category?: string;
  label?: string;
  alt?: string;
  tags?: string[];
}

/**
 * Absolute URL for display/copy. The DB stores the portable root-relative
 * path (`/uploads/...`) so the row survives domain changes; the UI builds
 * the full URL against the current origin at the boundary. External
 * (already absolute) URLs pass through untouched.
 */
export function absoluteGalleryUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

export const galleryApi = {
  list: () => api.get<GalleryImage[]>('/api/gallery').then((r) => r.data),

  /**
   * Multipart upload. The explicit `undefined` Content-Type lets the browser
   * set the multipart boundary (the axios instance default is application/json).
   */
  upload: (files: File[], meta: UploadMeta = {}) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    if (meta.category) form.append('category', meta.category);
    if (meta.label) form.append('label', meta.label);
    if (meta.alt) form.append('alt', meta.alt);
    if (meta.tags?.length) form.append('tags', JSON.stringify(meta.tags));
    return api
      .post<GalleryImage[]>('/api/uploads', form, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },

  update: (id: string, patch: GalleryPatch) =>
    api.patch<GalleryImage>(`/api/gallery/${id}`, patch).then((r) => r.data),

  remove: (id: string) => api.delete<{ message: string }>(`/api/gallery/${id}`).then((r) => r.data),
};
