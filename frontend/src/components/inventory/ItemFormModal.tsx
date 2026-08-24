import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { GarmentItem } from '../../types';
import { toPersianDigits } from '../../utils/persian';
import { Plus, Image as ImageIcon, Camera, Trash2 } from 'lucide-react';
import { SelectMenu } from '../ui/select-menu';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Partial<GarmentItem>) => void;
  editItem?: GarmentItem | null;
  categories?: { id: string; label: string }[];
  onCreateCategory?: (label: string) => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editItem,
  categories = [
    { id: 'coats_jackets', label: 'کت، کاپشن و پالتو' },
    { id: 'pants', label: 'شلوار (کتان، جین، اسلش)' },
    { id: 'shirts', label: 'پیراهن مردانه' },
    { id: 'women_clothing', label: 'مانتو و پوشاک بانوان' },
    { id: 'men_clothing', label: 'هودی، تیشرت و اسپرت' },
    { id: 'traditional', label: 'پوشاک سنتی و مجلسی' },
    { id: 'fabrics', label: 'طاقه پارچه و ملزومات دوخت' },
  ],
  onCreateCategory,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<string>('coats_jackets');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [consignmentPrice, setConsignmentPrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockThreshold, setMinStockThreshold] = useState('10');
  const [sizes, setSizes] = useState('M, L, XL, 2XL');
  const [colors, setColors] = useState('مشکی, سرمه‌ای, طوسی');
  const [fabric, setFabric] = useState('کتان ترک ۳۸۰ گرم');
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  useEffect(() => {
    if (editItem) {
      setName(editItem.name || '');
      setCode(editItem.code || '');
      setCategory(editItem.category || 'coats_jackets');
      setCostPrice(String(editItem.costPrice || 0));
      setConsignmentPrice(String(editItem.consignmentPrice || 0));
      setRetailPrice(String(editItem.retailPrice || 0));
      setStockQuantity(String(editItem.stockQuantity || 0));
      setMinStockThreshold(String(editItem.minStockThreshold || 10));
      setSizes((editItem.sizes || []).join(', '));
      setColors((editItem.colors || []).join(', '));
      setFabric(editItem.fabric || '');
      const existingImages = editItem.images && editItem.images.length > 0
        ? editItem.images
        : editItem.imageUrl
        ? [editItem.imageUrl]
        : [];
      setImagesList(existingImages);
    } else {
      setName('');
      setCode(`PLR-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('coats_jackets');
      setCostPrice('450000');
      setConsignmentPrice('680000');
      setRetailPrice('1100000');
      setStockQuantity('20');
      setMinStockThreshold('8');
      setSizes('M, L, XL');
      setColors('مشکی, سرمه‌ای');
      setFabric('پارچه کتان با کیفیت');
      setImagesList([
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&auto=format&fit=crop&q=80',
      ]);
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
  }, [editItem, isOpen]);

  const handleAddImageFromUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImagesList([...imagesList, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert each uploaded file to base64 or object URL
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagesList((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImagesList(imagesList.filter((_, i) => i !== index));
  };

  const handleAddNewCategorySubmit = () => {
    if (!newCategoryName.trim()) return;
    const catLabel = newCategoryName.trim();
    if (onCreateCategory) {
      onCreateCategory(catLabel);
    }
    setCategory(catLabel);
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const matchedCat = categories.find((c) => c.id === category || c.label === category);

    onSave({
      name: name.trim(),
      code: code.trim(),
      category,
      categoryLabel: matchedCat ? matchedCat.label : category,
      costPrice: Number(costPrice) || 0,
      consignmentPrice: Number(consignmentPrice) || 0,
      retailPrice: Number(retailPrice) || 0,
      stockQuantity: Number(stockQuantity) || 0,
      minStockThreshold: Number(minStockThreshold) || 10,
      sizes: sizes.split(',').map((s) => s.trim()).filter(Boolean),
      colors: colors.split(',').map((c) => c.trim()).filter(Boolean),
      fabric: fabric.trim(),
      imageUrl: imagesList[0] || '',
      images: imagesList,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'ویرایش مشخصات لباس / پارچه' : 'افزودن لباس جدید به انبار دوزندگی'}
      subtitle="تعریف قیمت تمام شده دوخت، قیمت امانی دست‌فروش، دسته‌بندی و عکس‌های کالا"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-stone-900 dark:text-white">
        {/* Photo Gallery & Upload Section */}
        <div className="p-4 rounded-xl glass-card space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#CEAE80] flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4" />
              تصاویر کالا و مدل‌ها ({toPersianDigits(imagesList.length)} تصویر)
            </label>
            <span className="text-[11px] text-stone-400">یک یا چند تصویر از گالری یا دوربین</span>
          </div>

          {/* Thumbnails grid */}
          <div className="flex flex-wrap items-center gap-3">
            {imagesList.map((imgUrl, idx) => (
              <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-[#CEAE80]/30 shadow-sm bg-black/20">
                <img
                  src={imgUrl}
                  alt={`مدل ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-[#CEAE80] text-black text-[9px] font-black text-center py-0.5">
                    عکس اصلی
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 left-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Upload Button */}
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-[#CEAE80]/40 hover:border-[#CEAE80] hover:bg-[#CEAE80]/10 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
              <Camera className="w-5 h-5 text-[#CEAE80]" />
              <span className="text-[10px] font-bold text-stone-600 dark:text-stone-300">آپلود عکس</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Or enter direct URL */}
          <div className="flex gap-2 pt-1">
            <input
              type="url"
              placeholder="یا لینک اینترنتی تصویر را وارد کنید..."
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs outline-none"
            />
            <button
              type="button"
              onClick={handleAddImageFromUrl}
              className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-[#252525] hover:bg-[#CEAE80] hover:text-black text-xs font-bold transition-colors"
            >
              افزودن لینک
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              نام کالا / لباس *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: پالتو فوتر کوبیده زمستانه"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              کد کالا (SKU)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none font-mono"
            />
          </div>

          {/* Category with creation option */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                دسته‌بندی لباس
              </label>
              {!isCreatingCategory && (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="text-[11px] text-[#CEAE80] hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  ایجاد دسته‌بندی جدید
                </button>
              )}
            </div>

            {isCreatingCategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="نام دسته جدید (مثلاً: کاپشن بادی)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl glass-input text-xs outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewCategorySubmit}
                  className="px-3 py-1.5 rounded-xl bg-[#CEAE80] text-black font-bold text-xs"
                >
                  تایید
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-2 py-1.5 text-stone-400 hover:text-white text-xs"
                >
                  انصراف
                </button>
              </div>
            ) : (
              <SelectMenu
                value={category}
                onChange={setCategory}
                options={categories.map((cat) => ({ value: cat.id, label: cat.label }))}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              نوع پارچه و دوخت
            </label>
            <input
              type="text"
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              placeholder="مثلاً: فاستونی مطهری ۴۵/۵۵"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none"
            />
          </div>
        </div>

        {/* Pricing Rows */}
        <div className="p-4 rounded-xl bg-[#CEAE80]/10 border border-[#CEAE80]/30 space-y-3">
          <p className="text-xs font-bold text-[#CEAE80]">
            ساختار قیمت‌گذاری (به تومان)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                قیمت تمام شده دوخت (کارگاه)
              </label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="تومان"
                className="w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm font-mono outline-none focus:border-[#CEAE80]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-900 dark:text-stone-200 font-bold mb-1">
                قیمت امانی به دست‌فروش *
              </label>
              <input
                type="number"
                required
                value={consignmentPrice}
                onChange={(e) => setConsignmentPrice(e.target.value)}
                placeholder="تومان"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141414] border border-[#CEAE80] text-[#CEAE80] text-xs sm:text-sm font-bold font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                قیمت مصرف‌کننده نهایی
              </label>
              <input
                type="number"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="تومان"
                className="w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm font-mono outline-none focus:border-[#CEAE80]"
              />
            </div>
          </div>
        </div>

        {/* Stock & Variations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              موجودی اولیه انبار (عدد)
            </label>
            <input
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              حداقل آستانه هشدار کسری
            </label>
            <input
              type="number"
              value={minStockThreshold}
              onChange={(e) => setMinStockThreshold(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              سایزبندی (جدا شده با کاما)
            </label>
            <input
              type="text"
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              placeholder="M, L, XL, 2XL یا 38, 40, 42"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              رنگ‌بندی (جدا شده با کاما)
            </label>
            <input
              type="text"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="مشکی, سرمه‌ای, طوسی"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-[#0A0A0A] font-bold text-sm shadow-md transition-all active:scale-95"
          >
            {editItem ? 'ذخیره تغییرات' : 'افزودن به انبار'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
