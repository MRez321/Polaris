import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Copy,
  Image as ImageIcon,
  Images,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { Modal } from '@/components/common/Modal';
import { SelectMenu } from '@/components/ui/select-menu';
import { galleryApi, type GalleryImage } from '@/lib/galleryApi';
import { GALLERY_CATEGORIES, galleryCategoryLabel } from '@/components/common/ImagePickerModal';
import { getApiErrorMessage } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';

/**
 * Settings tab listing every uploaded image: filter by category/tag, search,
 * then manage each entry (label, tags, category, copy URL, delete).
 */
export const GalleryManager: React.FC = () => {
  const [rows, setRows] = useState<GalleryImage[] | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  async function refresh(): Promise<void> {
    try {
      setRows(await galleryApi.list());
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setRows([]);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    (rows ?? []).forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [rows]);

  const filtered = (rows ?? []).filter((row) => {
    const matchesCat = catFilter === 'all' || row.category === catFilter;
    const matchesTag = !tagFilter || row.tags.includes(tagFilter);
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      row.label.toLowerCase().includes(q) ||
      row.fileName.toLowerCase().includes(q) ||
      row.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCat && matchesTag && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center">
              <Images className="w-5 h-5 text-[#CEAE80]" />
            </span>
            <span className="text-[#CEAE80]">گالری تصاویر کارگاه</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            مدیریت تمام عکس‌های بارگذاری‌شده: پروفایل افراد، تصاویر کالا، فاکتورها و لوگو
            {rows && ` — ${toPersianDigits(rows.length)} تصویر`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="px-3 py-1.5 rounded-xl glass-card hover:border-[#CEAE80] text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Loader2 className={`w-3.5 h-3.5 ${rows === null ? 'animate-spin text-[#CEAE80]' : ''}`} />
          <span>به‌روزرسانی</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {GALLERY_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCatFilter(c.value)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                catFilter === c.value
                  ? 'bg-[#CEAE80] text-black'
                  : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-gray-300 hover:bg-[#CEAE80]/30'
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="relative flex-1 min-w-44">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در نام، برچسب یا تگ‌ها..."
              className="w-full pr-8 pl-3 py-1.5 rounded-lg glass-input text-xs outline-none"
            />
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-black/5 dark:border-white/5">
            <span className="text-[10px] font-bold text-stone-400 ml-1">تگ‌ها:</span>
            {tagFilter && (
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 text-[10px] font-bold flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                حذف فیلتر تگ
              </button>
            )}
            {allTags.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                  tagFilter === tag
                    ? 'bg-[#CEAE80] text-black'
                    : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-gray-300 hover:bg-[#CEAE80]/30'
                }`}
              >
                {tag} ({toPersianDigits(count)})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {rows === null ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#CEAE80]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel py-16 rounded-2xl text-center space-y-3">
          <ImageIcon className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-500 dark:text-gray-400">
            هنوز تصویری ثبت نشده است؛ از فرم فروشندگان، کالاها یا پرسنل تصویر اضافه کنید
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelected(row)}
              className="group relative aspect-square rounded-xl overflow-hidden border border-[#CEAE80]/20 hover:border-[#CEAE80] hover:ring-2 hover:ring-[#CEAE80]/40 transition-all bg-black/10 dark:bg-black/30"
            >
              <img src={row.url} alt={row.label} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {row.label || row.fileName}
              </span>
              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold">
                {galleryCategoryLabel(row.category)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail / edit modal */}
      <GalleryImageDetailModal
        image={selected}
        onClose={() => setSelected(null)}
        onSaved={(updated) => {
          setRows((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setSelected(updated);
        }}
        onDeleted={(id) => {
          setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
          setSelected(null);
        }}
      />
    </div>
  );
};

interface DetailModalProps {
  image: GalleryImage | null;
  onClose: () => void;
  onSaved: (image: GalleryImage) => void;
  onDeleted: (id: string) => void;
}

const GalleryImageDetailModal: React.FC<DetailModalProps> = ({ image, onClose, onSaved, onDeleted }) => {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('general');
  const [tagsInput, setTagsInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (image) {
      setLabel(image.label);
      setCategory(image.category);
      setTagsInput(image.tags.join(', '));
    }
  }, [image]);

  if (!image) return null;

  function tagsFromInput(): string[] {
    return tagsInput.split(/[,،]/).map((t) => t.trim()).filter(Boolean).slice(0, 20);
  }

  async function handleSave(): Promise<void> {
    setBusy(true);
    try {
      const updated = await galleryApi.update(image!.id, {
        label: label.trim(),
        category,
        tags: tagsFromInput(),
      });
      toast.success('تغییرات تصویر ذخیره شد');
      onSaved(updated);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!confirm('این تصویر برای همیشه حذف شود؟')) return;
    setBusy(true);
    try {
      await galleryApi.remove(image!.id);
      toast.success('تصویر حذف شد');
      onDeleted(image!.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="جزئیات تصویر گالری" maxWidth="lg">
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden bg-black/10 dark:bg-black/30 flex items-center justify-center max-h-72">
          <img src={image.url} alt={label || image.fileName} referrerPolicy="no-referrer" className="max-h-72 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-2">
          <code dir="ltr" className="flex-1 truncate px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-white/10 text-[11px] text-left">
            {image.url}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(image.url).then(() => toast.success('آدرس تصویر کپی شد'));
            }}
            className="p-2 rounded-xl bg-stone-100 dark:bg-white/10 hover:bg-[#CEAE80] hover:text-black text-stone-500 dark:text-gray-300 transition-colors"
            title="کپی آدرس"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">برچسب تصویر</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثلاً: پالتو مدل زمستانه ۱۴۰۴"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs outline-none"
            />
          </div>
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
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            تگ‌ها (با کاما جدا کنید)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="پالتو، زمستان، پشتی، مشکی"
            className="w-full px-3 py-2 rounded-xl glass-input text-xs outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف تصویر
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white text-xs font-bold"
            >
              بستن
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="px-4 py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-bold text-xs disabled:opacity-50"
            >
              ذخیره تغییرات
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
