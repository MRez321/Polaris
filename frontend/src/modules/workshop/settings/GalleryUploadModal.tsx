import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Camera,
  FolderOpen,
  Loader2,
  Upload,
  X,
} from 'lucide-react';

import { Modal } from '@/components/common/Modal';
import { galleryApi, type GalleryImage } from '@/lib/galleryApi';
import { GALLERY_CATEGORIES } from '@/components/common/ImagePickerModal';
import { SelectMenu } from '@/components/ui/select-menu';
import { compressImage } from '@/modules/workshop/utils/imageFile';
import { getApiErrorMessage } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';

interface GalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful upload with the created rows. */
  onUploaded: (rows: GalleryImage[]) => void;
}

/**
 * Upload flow for the workshop gallery: pick files from device or camera,
 * review per-image previews, set shared category + tags (and per-image
 * label/alt), then upload (compressed) and index them in the gallery.
 */
export const GalleryUploadModal: React.FC<GalleryUploadModalProps> = ({ isOpen, onClose, onUploaded }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState('general');
  const [tagsInput, setTagsInput] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Reset when the modal opens; revoke stale object URLs when it closes.
  useEffect(() => {
    if (!isOpen) {
      previews.forEach((p) => URL.revokeObjectURL(p));
      setFiles([]);
      setPreviews([]);
      setTagsInput('');
      setBusy(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickFiles(list: FileList | null): void {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, 10);
    if (incoming.length === 0) {
      toast.error('فقط فایل‌های تصویری پذیرفته می‌شوند');
      return;
    }
    setFiles((prev) => [...prev, ...incoming].slice(0, 10));
  }

  // Rebuild previews whenever the file list changes.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p));
      return urls;
    });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function removeFile(index: number): void {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload(): Promise<void> {
    if (files.length === 0) {
      toast.error('ابتدا تصاویر را انتخاب کنید');
      return;
    }
    setBusy(true);
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)));
      const tags = tagsInput.split(/[,،]/).map((t) => t.trim()).filter(Boolean).slice(0, 20);
      const rows = await galleryApi.upload(compressed, { category, tags });
      toast.success(`${toPersianDigits(rows.length)} تصویر بارگذاری شد`);
      onUploaded(rows);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="بارگذاری تصویر در گالری" subtitle="از دستگاه یا دوربین — با دسته‌بندی و تگ" maxWidth="2xl">
      <div className="space-y-4">
        {/* Source buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl glass-card hover:border-brand text-xs font-bold flex flex-col items-center gap-2 transition-colors"
          >
            <FolderOpen className="w-6 h-6 text-brand" />
            انتخاب از دستگاه
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="p-4 rounded-2xl glass-card hover:border-brand text-xs font-bold flex flex-col items-center gap-2 transition-colors"
          >
            <Camera className="w-6 h-6 text-brand" />
            گرفتن عکس با دوربین
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              pickFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(e) => {
              pickFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* Previews */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-brand/20 bg-black/10">
                <img src={previews[i]} alt={f.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 left-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                  title="حذف"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 truncate">
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Shared metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">دسته‌بندی</label>
            <SelectMenu
              value={category}
              onChange={setCategory}
              options={GALLERY_CATEGORIES.filter((c) => c.value !== 'all').map((c) => ({
                value: c.value as string,
                label: c.label,
              }))}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              تگ‌ها (با کاما جدا کنید)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="پالتو، زمستان، پشتی"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs outline-none"
            />
          </div>
        </div>

        <p className="text-[10px] text-stone-400 leading-relaxed">
          تصاویر قبل از ارسال فشرده‌سازی می‌شوند (حجم کمتر، ارسال سریع‌تر). سایز، فرمت و حجم هر تصویر
          به‌صورت خودکار در گالری ثبت می‌شود و بعداً از پنجره جزئیات قابل مشاهده و ویرایش است.
          برای متن جایگزین (alt) و برچسب اختصاصی، بعد از بارگذاری روی تصویر بزنید.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-black/10 dark:border-white/10">
          <span className="text-[11px] font-bold text-stone-400">
            {files.length > 0 ? `${toPersianDigits(files.length)} تصویر آماده ارسال` : 'هنوز تصویری انتخاب نشده'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={busy || files.length === 0}
              onClick={() => void handleUpload()}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              بارگذاری
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default GalleryUploadModal;
