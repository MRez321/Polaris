import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Camera,
  FolderOpen,
  Image as ImageIcon,
  Images,
  Loader2,
  RefreshCw,
  Search,
  SwitchCamera,
  X,
} from 'lucide-react';

import { Modal } from './Modal';
import { galleryApi, type GalleryImage } from '@/lib/galleryApi';
import { compressImage } from '@/modules/workshop/utils/imageFile';
import { getApiErrorMessage } from '@/lib/api';

export const GALLERY_CATEGORIES = [
  { value: 'all', label: 'همه' },
  { value: 'avatar', label: 'پروفایل افراد' },
  { value: 'item', label: 'کالا و مدل‌ها' },
  { value: 'receipt', label: 'فاکتور و رسید' },
  { value: 'logo', label: 'لوگو' },
  { value: 'general', label: 'عمومی' },
] as const;

export function galleryCategoryLabel(value: string): string {
  return GALLERY_CATEGORIES.find((c) => c.value === value)?.label ?? 'عمومی';
}

type PickerSource = 'gallery' | 'device' | 'camera';

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with one URL in single mode, several in multiple mode. */
  onSelect: (urls: string[]) => void;
  /** Gallery category used for uploads AND the initial filter. */
  category?: string;
  multiple?: boolean;
}

/**
 * Full-screen-ish chooser with three sources: site gallery, device files,
 * live phone camera (getUserMedia) with a native capture-input fallback when
 * camera access is unavailable/denied.
 */
export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  category = 'general',
  multiple = false,
}) => {
  const [source, setSource] = useState<PickerSource | null>(null);
  const [galleryRows, setGalleryRows] = useState<GalleryImage[] | null>(null);
  const [catFilter, setCatFilter] = useState(category === 'all' ? 'all' : category);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCamera(): void {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => () => stopCamera(), []);
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setSource(null);
      setCameraError(null);
    }
  }, [isOpen]);

  async function openGallery(): Promise<void> {
    setSource('gallery');
    if (!galleryRows) {
      try {
        setGalleryRows(await galleryApi.list());
      } catch (err) {
        toast.error(getApiErrorMessage(err));
        setGalleryRows([]);
      }
    }
  }

  async function startCamera(): Promise<void> {
    setSource('camera');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('مرورگر شما از دسترسی مستقیم به دوربین پشتیبانی نمی‌کند — از دکمه پایین استفاده کنید');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraError(null);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      stopCamera();
      setCameraError('دسترسی به دوربین ممکن نشد — با دکمه زیر از دوربین خود دستگاه عکس بگیرید');
    }
  }

  async function uploadAndFinish(files: File[]): Promise<void> {
    setBusy(true);
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)));
      const rows = await galleryApi.upload(compressed, { category });
      onSelect(rows.map((r) => r.url));
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function capturePhoto(): void {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        void uploadAndFinish([
          new File([blob], `camera-${Date.now()}.webp`, { type: 'image/webp' }),
        ]);
      },
      'image/webp',
      0.9,
    );
  }

  const filtered = (galleryRows ?? []).filter((row) => {
    const matchesCat = catFilter === 'all' || row.category === catFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      row.label.toLowerCase().includes(q) ||
      row.fileName.toLowerCase().includes(q) ||
      row.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title="انتخاب تصویر"
      subtitle="از گالری سایت انتخاب کنید، از دستگاه بارگذاری کنید یا با دوربین عکس بگیرید"
      maxWidth="2xl"
    >
      {source === null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
          <button
            type="button"
            onClick={() => void openGallery()}
            className="p-6 rounded-2xl glass-card hover:border-brand flex flex-col items-center gap-3 transition-all hover:-translate-y-0.5"
          >
            <span className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center">
              <Images className="w-6 h-6 text-brand" />
            </span>
            <span className="text-sm font-black">گالری سایت</span>
            <span className="text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed">
              انتخاب از تصاویر پیش‌تر بارگذاری‌شده
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => setSource('device')}
            className="p-6 rounded-2xl glass-card hover:border-brand flex flex-col items-center gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            <span className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-brand" />
            </span>
            <span className="text-sm font-black">از دستگاه</span>
            <span className="text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed">
              انتخاب فایل تصویر از گوشی یا کامپیوتر
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void startCamera()}
            className="p-6 rounded-2xl glass-card hover:border-brand flex flex-col items-center gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            <span className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-brand" />
            </span>
            <span className="text-sm font-black">دوربین</span>
            <span className="text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed">
              عکس‌برداری زنده با دوربین دستگاه
            </span>
          </button>
        </div>
      )}

      {/* ---------------- Site gallery ---------------- */}
      {source === 'gallery' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {GALLERY_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCatFilter(c.value)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                  catFilter === c.value
                    ? 'bg-brand text-brand-on'
                    : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-gray-300 hover:bg-brand/30'
                }`}
              >
                {c.label}
              </button>
            ))}
            <div className="relative flex-1 min-w-40">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو بر اساس برچسب یا تگ..."
                className="w-full pr-8 pl-3 py-1.5 rounded-lg glass-input text-xs outline-none"
              />
            </div>
          </div>

          {galleryRows === null ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <ImageIcon className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-600" />
              <p className="text-xs text-stone-500 dark:text-gray-400">
                تصویری در این دسته یافت نشد
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-96 overflow-y-auto p-1">
              {filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onSelect([row.url]);
                    onClose();
                  }}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-brand/20 hover:border-brand hover:ring-2 hover:ring-brand/40 transition-all bg-black/10 dark:bg-black/30"
                  title={row.label || row.fileName}
                >
                  <img src={row.url} alt={row.label} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] truncate px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {row.label || row.fileName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- Device files ---------------- */}
      {source === 'device' && (
        <div className="py-6 flex flex-col items-center gap-4">
          {busy ? (
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          ) : (
            <>
              <label className="px-6 py-3 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs flex items-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all">
                <FolderOpen className="w-4 h-4" />
                <span>انتخاب فایل{multiple ? '‌ها' : ''} از دستگاه</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple={multiple}
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (files.length > 0) void uploadAndFinish(files);
                  }}
                />
              </label>
              <p className="text-[11px] text-stone-500 dark:text-gray-400">
                JPG، PNG، WebP — حداکثر ۸ مگابایت؛ تصاویر به صورت خودکار بهینه می‌شوند
              </p>
            </>
          )}
        </div>
      )}

      {/* ---------------- Live camera ---------------- */}
      {source === 'camera' && (
        <div className="space-y-3">
          {!cameraError && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-96 mx-auto w-full">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            </div>
          )}
          {cameraError && (
            <p className="text-xs text-amber-500 bg-amber-500/10 rounded-xl px-3 py-2">{cameraError}</p>
          )}
          <div className="flex items-center justify-center gap-3 pb-2">
            {!cameraError && (
              <button
                type="button"
                disabled={busy}
                onClick={capturePhoto}
                className="w-14 h-14 rounded-full bg-brand hover:bg-brand-hover text-brand-on flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50"
                title="عکس‌برداری"
              >
                <Camera className="w-6 h-6" />
              </button>
            )}
            <label className={`px-4 py-2 rounded-xl bg-stone-200 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
              <SwitchCamera className="w-4 h-4" />
              <span>عکس با اپ دوربین دستگاه</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void uploadAndFinish([f]);
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setSource(null);
                setCameraError(null);
              }}
              className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white text-xs font-bold flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              بازگشت
            </button>
          </div>
          {busy && (
            <div className="flex items-center justify-center gap-2 text-xs text-brand font-bold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              در حال ذخیره تصویر...
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
