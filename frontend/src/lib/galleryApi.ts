import { api } from './api';

/** A single entry of the central image library (gallery_images table). */
export interface GalleryImage {
  id: string;
  url: string;
  fileName: string;
  category: string;
  label: string;
  tags: string[];
  createdAt: string;
}

export interface GalleryPatch {
  category?: string;
  label?: string;
  tags?: string[];
}

export interface UploadMeta {
  category?: string;
  tags?: string[];
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
    if (meta.tags?.length) form.append('tags', JSON.stringify(meta.tags));
    return api
      .post<GalleryImage[]>('/api/uploads', form, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },

  update: (id: string, patch: GalleryPatch) =>
    api.patch<GalleryImage>(`/api/gallery/${id}`, patch).then((r) => r.data),

  remove: (id: string) => api.delete<{ message: string }>(`/api/gallery/${id}`).then((r) => r.data),
};
