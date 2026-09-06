import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import type { GarmentItem, VariantPrices, VariantPriceOverride } from '@/types';
import { toPersianDigits, formatToman } from '@/utils/persian';
import { Plus, Image as ImageIcon, Tags } from 'lucide-react';
import { SelectMenu } from '@/components/ui/select-menu';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { ImagePicker } from '@/components/common/ImagePicker';
import { Switch } from '@/components/ui/switch';
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
  const [description, setDescription] = useState('');
  const [variantPricingOn, setVariantPricingOn] = useState(false);
  const [sizePriceOverrides, setSizePriceOverrides] = useState<Record<string, VariantPriceOverride>>({});
  const [colorPriceOverrides, setColorPriceOverrides] = useState<Record<string, VariantPriceOverride>>({});
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
      setDescription(editItem.description || '');
      const overrides = editItem.variantPrices;
      setVariantPricingOn(
        overrides !== undefined &&
          Object.keys(overrides.sizes ?? {}).length + Object.keys(overrides.colors ?? {}).length > 0,
      );
      setSizePriceOverrides({ ...(overrides?.sizes ?? {}) });
      setColorPriceOverrides({ ...(overrides?.colors ?? {}) });
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
      setDescription('');
      setVariantPricingOn(false);
      setSizePriceOverrides({});
      setColorPriceOverrides({});
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

  const parseVariantList = (raw: string) => raw.split(',').map((s) => s.trim()).filter(Boolean);

  const updateOverride = (
    kind: 'sizes' | 'colors',
    key: string,
    field: keyof VariantPriceOverride,
    value: number | null,
  ) => {
    const setter = kind === 'sizes' ? setSizePriceOverrides : setColorPriceOverrides;
    setter((prev) => {
      const next = { ...prev, [key]: { ...prev[key] } };
      const record = next[key]!;
      if (value === null) {
        delete record[field];
      } else {
        record[field] = value;
      }
      if (Object.keys(record).length === 0) delete next[key];
      return next;
    });
  };

  // Build the variantPrices payload: only size/color keys that still exist in
  // the (possibly edited) comma lists, and only non-empty override records.
  const buildVariantPrices = (): VariantPrices | undefined => {
    if (!variantPricingOn) return undefined;
    const keep = (overrides: Record<string, VariantPriceOverride>, keys: string[]) => {
      const filtered: Record<string, VariantPriceOverride> = {};
      for (const key of keys) {
        const record = overrides[key];
        if (record && Object.keys(record).length > 0) filtered[key] = record;
      }
      return filtered;
    };
    const sizeKeys = parseVariantList(sizes);
    const colorKeys = parseVariantList(colors);
    const filteredSizes = keep(sizePriceOverrides, sizeKeys);
    const filteredColors = keep(colorPriceOverrides, colorKeys);
    if (Object.keys(filteredSizes).length === 0 && Object.keys(filteredColors).length === 0) return undefined;
    return { ...(Object.keys(filteredSizes).length > 0 ? { sizes: filteredSizes } : {}), ...(Object.keys(filteredColors).length > 0 ? { colors: filteredColors } : {}) };
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
      sizes: parseVariantList(sizes),
      colors: parseVariantList(colors),
      fabric: fabric.trim(),
      description: description.trim() || undefined,
      variantPrices: buildVariantPrices(),
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
      subtitle="قیمت تمام شده کارگاه، قیمت امانی دست‌فروش و قیمت فروشگاه سایت"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-stone-900 dark:text-white">
        {/* Photo Gallery & Upload Section */}
        <div className="p-4 rounded-xl glass-card space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand flex items-center gap-1.5">
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
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-brand outline-none"
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
                  className="text-[11px] text-brand hover:underline font-bold flex items-center gap-1"
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
                  className="px-3 py-1.5 rounded-xl bg-brand text-brand-on font-bold text-xs"
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
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-brand outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            توضیحات کالا <span className="text-stone-400 font-normal">(نمایش در فروشگاه سایت)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="معرفی کالا برای صفحه فروشگاه — جنس، دوخت، کاربرد و نکات فروش..."
            className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-brand outline-none resize-y min-h-[70px]"
          />
        </div>

        {/* Pricing Rows */}
        <div className="p-4 rounded-xl bg-brand/10 border border-brand/30 space-y-3">
          <p className="text-xs font-bold text-brand">
            ساختار قیمت‌گذاری (به تومان)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                قیمت تمام شده کارگاه
              </label>
              <FormattedNumberInput
                value={costPrice}
                onChange={setCostPrice}
                placeholder="مثلاً: ۴۵۰,۰۰۰ تومان"
                className="w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm font-mono outline-none focus:border-brand"
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
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141414] border border-brand text-brand text-xs sm:text-sm font-bold font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                قیمت فروشگاه سایت
              </label>
              <FormattedNumberInput
                value={retailPrice}
                onChange={setRetailPrice}
                placeholder="مثلاً: ۱,۲۰۰,۰۰۰ تومان"
                className="w-full px-3 py-2 rounded-lg glass-input text-xs sm:text-sm font-mono outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        {/* Variant Pricing */}
        <div className="p-4 rounded-xl glass-card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-brand flex items-center gap-1.5">
              <Tags className="w-4 h-4" />
              قیمت‌گذاری متفاوت برای سایز / رنگ
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400">خاموش = یک قیمت برای همه</span>
              <Switch
                checked={variantPricingOn}
                onCheckedChange={setVariantPricingOn}
              />
            </div>
          </div>

          {variantPricingOn && (
            <div className="space-y-4">
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                برای هر سایز یا رنگ می‌توانید قیمت‌های متفاوتی ثبت کنید؛ هر فیلد خالی، قیمت پایه همان ردیف کالاست.
              </p>
              {(['sizes', 'colors'] as const).map((kind) => {
                const keys = parseVariantList(kind === 'sizes' ? sizes : colors);
                if (keys.length === 0) {
                  return (
                    <p key={kind} className="text-[11px] text-stone-400 italic">
                      {kind === 'sizes' ? 'ابتدا سایزبندی را وارد کنید.' : 'ابتدا رنگ‌بندی را وارد کنید.'}
                    </p>
                  );
                }
                return (
                  <div key={kind} className="space-y-2">
                    <p className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                      {kind === 'sizes' ? 'سایزها' : 'رنگ‌ها'}
                    </p>
                    <div className="space-y-2">
                      {keys.map((key) => {
                        const overrides = kind === 'sizes' ? sizePriceOverrides[key] : colorPriceOverrides[key];
                        return (
                          <div
                            key={key}
                            className="grid grid-cols-1 sm:grid-cols-[minmax(60px,80px)_1fr_1fr_1fr] gap-2 items-end"
                          >
                            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 py-2 truncate">
                              {key}
                            </span>
                            {(['costPrice', 'consignmentPrice', 'retailPrice'] as const).map((field) => (
                              <div key={field}>
                                <label className="block text-[10px] text-stone-500 dark:text-stone-400 mb-1">
                                  {field === 'costPrice' ? 'کارگاه' : field === 'consignmentPrice' ? 'امانی' : 'فروشگاه'}
                                </label>
                                <FormattedNumberInput
                                  value={overrides?.[field] ?? null}
                                  onChange={(v) => updateOverride(kind, key, field, v)}
                                  placeholder={
                                    field === 'costPrice'
                                      ? formatToman(costPrice || 0)
                                      : field === 'consignmentPrice'
                                      ? formatToman(consignmentPrice || 0)
                                      : formatToman(retailPrice || 0)
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono outline-none focus:border-brand"
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-brand outline-none font-mono"
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
                className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-brand outline-none font-mono"
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
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-brand outline-none"
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
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-brand outline-none"
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
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-bold text-sm shadow-md transition-all active:scale-95"
          >
            {editItem ? 'ذخیره تغییرات' : 'افزودن به انبار'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
