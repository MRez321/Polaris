import React, { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

import { SafeImage } from './SafeImage';
import { ImagePickerModal } from './ImagePickerModal';

interface ImagePickerProps {
  /** Currently bound URLs (single-element array in single mode). */
  values: string[];
  onChange: (values: string[]) => void;
  /** Gallery category for uploads and the initial filter. */
  category?: string;
  multiple?: boolean;
  /** Tailwind size classes for each thumbnail tile. */
  tileClassName?: string;
  addLabel?: string;
  /** Badge shown under the first thumbnail (e.g. «عکس اصلی»). */
  primaryLabel?: string;
}

/**
 * Inline form control binding image URLs to any entity field. Shows current
 * thumbnails with remove buttons plus a dashed add-tile that opens the
 * three-source chooser (site gallery / device / camera).
 */
export const ImagePicker: React.FC<ImagePickerProps> = ({
  values,
  onChange,
  category = 'general',
  multiple = false,
  tileClassName = 'w-20 h-20',
  addLabel = 'انتخاب تصویر',
  primaryLabel,
}) => {
  const [open, setOpen] = useState(false);

  function removeAt(index: number): void {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {values.map((url, idx) => (
        <div key={`${url}-${idx}`} className={`relative group ${tileClassName}`}>
          <div className="w-full h-full rounded-xl overflow-hidden border border-[#CEAE80]/40 bg-black/10 dark:bg-black/30">
            <SafeImage src={url} alt={primaryLabel && idx === 0 ? primaryLabel : `تصویر ${idx + 1}`} className="w-full h-full object-cover" />
          </div>
          {primaryLabel && idx === 0 && (
            <span className="absolute bottom-0 inset-x-0 bg-[#CEAE80] text-black text-[9px] font-black text-center py-0.5">
              {primaryLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => removeAt(idx)}
            className="absolute -top-1.5 -left-1.5 p-1 rounded-full bg-rose-600 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            title="حذف تصویر"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {multiple || values.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${tileClassName} rounded-xl border-2 border-dashed border-[#CEAE80]/40 hover:border-[#CEAE80] hover:bg-[#CEAE80]/10 flex flex-col items-center justify-center gap-1 transition-all`}
        >
          <ImagePlus className="w-5 h-5 text-[#CEAE80]" />
          <span className="text-[10px] font-bold text-stone-600 dark:text-stone-300 px-1 text-center leading-tight">
            {addLabel}
          </span>
        </button>
      ) : null}

      <ImagePickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={(urls) => onChange(multiple ? [...values, ...urls] : urls.slice(0, 1))}
        category={category}
        multiple={multiple}
      />
    </div>
  );
};
