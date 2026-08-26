import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { GarmentItem } from '../../types';
import { toPersianDigits } from '../../utils/persian';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { SelectMenu } from '../ui/select-menu';
import { FormattedNumberInput } from '../common/FormattedNumberInput';
import { ImagePicker } from '../common/ImagePicker';
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
  const [itemId, setItemId] = useState('');
  const [category, setCategory] = useState<string>('coats_jackets');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [costPrice, setCostPrice] = useState<number | null>(null);
  const [consignmentPrice, setConsignmentPrice] = useState<number | null>(null);
  const [retailPrice, setRetailPrice] = useState<number | null>(null);
  const [stockQuantity, setStockQuantity] = useState<number | null>(null);
  const [minStockThreshold, setMinStockThreshold] = useState<number | null>(null);
  const [sizes, setSizes] = useState('');
  const [colors, setColors] = useState('');
  const [fabric, setFabric] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([]);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name || '');
      setItemId(editItem.id);
      setCategory(editItem.category || 'coats_jackets');
      setCostPrice(editItem.costPrice ?? null);
      setConsignmentPrice(editItem.consignmentPrice ?? null);
      setRetailPrice(editItem.retailPrice ?? null);
      setStockQuantity(editItem.stockQuantity ?? null);
      setMinStockThreshold(editItem.minStockThreshold ?? null);
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
      setItemId(crypto.randomUUID());
      setCategory('coats_jackets');
      setCostPrice(null);
      setConsignmentPrice(null);
      setRetailPrice(null);
      setStockQuantity(null);
      setMinStockThreshold(null);
      setSizes('');
      setColors('');
      setFabric('');
      setImagesList([]);
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
  }, [editItem, isOpen]);


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
    if (consignmentPrice === null) return;

    const matchedCat = categories.find((c) => c.id === category || c.label === category);

    onSave({
      id: itemId,
      name: name.trim(),
      category,
      categoryLabel: matchedCat ? matchedCat.label : category,
      costPrice: costPrice || 0,
      consignmentPrice: consignmentPrice || 0,
      retailPrice: retailPrice || 0,
      stockQuantity: stockQuantity || 0,
      minStockThreshold: minStockThreshold || 10,
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
            <span className="text-[11px] text-stone-400">از گالری سایت، دستگاه یا دوربین</span>
          </div>

          <ImagePicker
            values={imagesList}
            onChange={setImagesList}
            category="item"
            multiple
            addLabel="افزودن عکس"
            primaryLabel="عکس اصلی"
          />
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
              شناسه یکتا <span className="text-stone-400 font-normal">(خودکار — غیرقابل تغییر)</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={itemId}
              readOnly
              disabled
              className="w-full px-3 py-2 rounded-xl glass-input text-sm outline-none font-mono text-left opacity-70 cursor-not-allowed"
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
              <FormattedNumberInput
                value={costPrice}
                onChange={setCostPrice}
                placeholder="مثلاً: ۴۵۰,۰۰۰ تومان"
                className="w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm font-mono outline-none focus:border-[#CEAE80]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-900 dark:text-stone-200 font-bold mb-1">
                قیمت امانی به دست‌فروش *
              </label>
              <FormattedNumberInput
                value={consignmentPrice}
                onChange={setConsignmentPrice}
                placeholder="مثلاً: ۶۸۰,۰۰۰ تومان"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141414] border border-[#CEAE80] text-[#CEAE80] text-xs sm:text-sm font-bold font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                قیمت مصرف‌کننده نهایی
              </label>
              <FormattedNumberInput
                value={retailPrice}
                onChange={setRetailPrice}
                placeholder="مثلاً: ۱,۲۰۰,۰۰۰ تومان"
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
              <FormattedNumberInput
                value={stockQuantity}
                onChange={setStockQuantity}
                placeholder="مثلاً: ۲۵ عدد"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none font-mono"
              />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              حداقل آستانه هشدار کسری
            </label>
              <FormattedNumberInput
                value={minStockThreshold}
                onChange={setMinStockThreshold}
                placeholder="مثلاً: ۸ عدد"
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
