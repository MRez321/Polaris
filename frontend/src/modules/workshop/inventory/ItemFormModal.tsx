import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import type { GarmentItem, VariantPrices, VariantPriceOverride, CostBreakdown } from '@/types';
import { toPersianDigits, formatToman } from '@/utils/persian';
import { Plus, Image as ImageIcon, Tags, Calculator, DollarSign, Percent, Ruler, Palette, PackageCheck, Shirt } from 'lucide-react';
import { SelectMenu } from '@/components/ui/select-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { ImagePicker } from '@/components/common/ImagePicker';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Partial<GarmentItem>) => void;
  editItem?: GarmentItem | null;
  categories?: { id: string; label: string }[];
  onCreateCategory?: (label: string) => void;
}

// Preset size order: free-size first, then letter sizes, then numeric sizes.
const PRESET_SIZES = ['فری‌سایز', 'S', 'M', 'L', 'XL', '2XL', '38', '40', '42', '44', '46', '48'];
// Common Persian garment colors.
const PRESET_COLORS = ['سفید', 'مشکی', 'سرمه‌ای', 'قرمز', 'آبی', 'سبز', 'زرد', 'کرم', 'قهوه‌ای', 'طوسی'];

// Cost-breakdown component labels (workshop cost calculator).
const COST_COMPONENTS: { key: keyof CostBreakdown; label: string; hint?: string }[] = [
  { key: 'fabric', label: 'پارچه', hint: 'حداکثر ۴۰٪ قیمت تمام شده' },
  { key: 'sewing', label: 'دوخت و ساخت' },
  { key: 'accessories', label: 'یراق‌آلات' },
  { key: 'transport', label: 'حمل و نقل' },
  { key: 'packaging', label: 'بسته‌بندی' },
];

const emptyBreakdown: CostBreakdown = { fabric: 0, sewing: 0, accessories: 0, transport: 0, packaging: 0 };

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
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [fabric, setFabric] = useState('');
  const [description, setDescription] = useState('');
  const [variantPricingOn, setVariantPricingOn] = useState(false);
  const [sizePriceOverrides, setSizePriceOverrides] = useState<Record<string, VariantPriceOverride>>({});
  const [colorPriceOverrides, setColorPriceOverrides] = useState<Record<string, VariantPriceOverride>>({});
  const [imagesList, setImagesList] = useState<string[]>([]);
  // Purchase price in USD (2 decimals, e.g. 3.24).
  const [purchasePriceUsd, setPurchasePriceUsd] = useState('');
  // Cost breakdown calculator components (toman).
  const [breakdown, setBreakdown] = useState<CostBreakdown>(emptyBreakdown);
  const [breakdownTouched, setBreakdownTouched] = useState(false);
  // Percentage pricing: امانی/فروشگاه auto-computed as % of workshop cost.
  const [percentPricingOn, setPercentPricingOn] = useState(false);
  const [consignmentPercent, setConsignmentPercent] = useState<number | null>(null);
  const [retailPercent, setRetailPercent] = useState<number | null>(null);
  // Production status: order-made items waiting to be produced.
  const [isPendingProduction, setIsPendingProduction] = useState(false);
  // Custom size/color definitions.
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [newColorInput, setNewColorInput] = useState('');
  const [addingSize, setAddingSize] = useState(false);
  const [addingColor, setAddingColor] = useState(false);

  // Workshop cost: manual costPrice, or the breakdown sum once the calculator is used.
  const breakdownSum = useMemo(
    () => breakdown.fabric + breakdown.sewing + breakdown.accessories + breakdown.transport + breakdown.packaging,
    [breakdown],
  );
  const effectiveCostPrice = breakdownTouched ? breakdownSum : costPrice;

  // Live-computed channel prices when % pricing is on.
  const computedConsignmentPrice = percentPricingOn && effectiveCostPrice
    ? Math.round((effectiveCostPrice * (consignmentPercent || 0)) / 100)
    : consignmentPrice;
  const computedRetailPrice = percentPricingOn && effectiveCostPrice
    ? Math.round((effectiveCostPrice * (retailPercent || 0)) / 100)
    : retailPrice;

  // Fabric share of the workshop cost (for the ≤40% hint).
  const fabricShare = breakdownSum > 0 ? Math.round((breakdown.fabric / breakdownSum) * 100) : 0;

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
      setSizes(editItem.sizes || []);
      setColors(editItem.colors || []);
      // Custom entries not covered by presets stay editable.
      setCustomSizes((editItem.sizes || []).filter((s) => !PRESET_SIZES.includes(s)));
      setCustomColors((editItem.colors || []).filter((c) => !PRESET_COLORS.includes(c)));
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
      setPurchasePriceUsd(editItem.purchasePriceUsd != null ? String(editItem.purchasePriceUsd) : '');
      setBreakdown(editItem.costBreakdown ?? emptyBreakdown);
      setBreakdownTouched(editItem.costBreakdown != null);
      setPercentPricingOn(false);
      setConsignmentPercent(null);
      setRetailPercent(null);
      setIsPendingProduction(editItem.productionStatus === 'pending_production');
    } else {
      setName('');
      setItemId(crypto.randomUUID());
      setCategory('coats_jackets');
      setCostPrice(null);
      setConsignmentPrice(null);
      setRetailPrice(null);
      setStockQuantity(null);
      setMinStockThreshold(null);
      setSizes([]);
      setColors([]);
      setCustomSizes([]);
      setCustomColors([]);
      setFabric('');
      setDescription('');
      setVariantPricingOn(false);
      setSizePriceOverrides({});
      setColorPriceOverrides({});
      setImagesList([]);
      setPurchasePriceUsd('');
      setBreakdown(emptyBreakdown);
      setBreakdownTouched(false);
      setPercentPricingOn(false);
      setConsignmentPercent(null);
      setRetailPercent(null);
      setIsPendingProduction(false);
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setNewSizeInput('');
    setNewColorInput('');
    setAddingSize(false);
    setAddingColor(false);
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

  const toggleListValue = (list: string[], value: string): { list: string[]; added: boolean } =>
    list.includes(value) ? { list: list.filter((v) => v !== value), added: false } : { list: [...list, value], added: true };

  const toggleSize = (value: string) => {
    setSizes((prev) => toggleListValue(prev, value).list);
  };

  const toggleColor = (value: string) => {
    setColors((prev) => toggleListValue(prev, value).list);
  };

  const addCustomSize = () => {
    const v = newSizeInput.trim();
    if (!v) return;
    setCustomSizes((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setSizes((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setNewSizeInput('');
    setAddingSize(false);
  };

  const addCustomColor = () => {
    const v = newColorInput.trim();
    if (!v) return;
    setCustomColors((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setColors((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setNewColorInput('');
    setAddingColor(false);
  };

  const updateBreakdown = (key: keyof CostBreakdown, value: number | null) => {
    setBreakdown((prev) => ({ ...prev, [key]: value ?? 0 }));
    setBreakdownTouched(true);
  };

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

  // Build the variantPrices payload: only size/color keys that are still
  // selected, and only non-empty override records.
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
    const filteredSizes = keep(sizePriceOverrides, sizes);
    const filteredColors = keep(colorPriceOverrides, colors);
    if (Object.keys(filteredSizes).length === 0 && Object.keys(filteredColors).length === 0) return undefined;
    return { ...(Object.keys(filteredSizes).length > 0 ? { sizes: filteredSizes } : {}), ...(Object.keys(filteredColors).length > 0 ? { colors: filteredColors } : {}) };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!percentPricingOn && consignmentPrice === null) return;

    const matchedCat = categories.find((c) => c.id === category || c.label === category);

    // USD price: parse Persian/Latin digits, keep 2 decimals.
    const usdValue = parseFloat(purchasePriceUsd.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(',', '.'));
    const validUsd = Number.isFinite(usdValue) && usdValue >= 0 ? Math.round(usdValue * 100) / 100 : undefined;

    onSave({
      id: itemId,
      name: name.trim(),
      category,
      categoryLabel: matchedCat ? matchedCat.label : category,
      costPrice: (percentPricingOn ? effectiveCostPrice : costPrice) || 0,
      consignmentPrice: computedConsignmentPrice || 0,
      retailPrice: computedRetailPrice || 0,
      stockQuantity: stockQuantity || 0,
      minStockThreshold: minStockThreshold || 10,
      sizes,
      colors,
      fabric: fabric.trim(),
      description: description.trim() || undefined,
      variantPrices: buildVariantPrices(),
      imageUrl: imagesList[0] || '',
      images: imagesList,
      ...(validUsd !== undefined ? { purchasePriceUsd: validUsd } : {}),
      ...(breakdownTouched ? { costBreakdown: breakdown } : {}),
      productionStatus: isPendingProduction ? 'pending_production' : 'ready',
    });
    onClose();
  };

  const chipCheckbox = (value: string, checked: boolean, onToggle: () => void) => (
    <label
      key={value}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all text-xs font-bold ${
        checked
          ? 'bg-brand text-brand-on border-brand shadow-sm'
          : 'glass-input text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:border-brand/50'
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={() => onToggle()} />
      <span>{value}</span>
    </label>
  );

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

        {/* Sizes: checkbox multi-select with presets + custom add */}
        <div className="p-4 rounded-xl glass-card space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand flex items-center gap-1.5">
              <Ruler className="w-4 h-4" />
              سایزبندی
            </label>
            {!addingSize && (
              <button
                type="button"
                onClick={() => setAddingSize(true)}
                className="text-[11px] text-brand hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                تعریف سایز جدید
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {[...PRESET_SIZES, ...customSizes].map((s) => chipCheckbox(s, sizes.includes(s), () => toggleSize(s)))}
          </div>
          {addingSize && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSizeInput}
                onChange={(e) => setNewSizeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
                placeholder="سایز دلخواه (مثلاً: XXXL یا ۵۰)"
                className="flex-1 px-3 py-1.5 rounded-xl glass-input text-xs outline-none"
                autoFocus
              />
              <button type="button" onClick={addCustomSize} className="px-3 py-1.5 rounded-xl bg-brand text-brand-on font-bold text-xs">
                افزودن
              </button>
              <button
                type="button"
                onClick={() => { setAddingSize(false); setNewSizeInput(''); }}
                className="px-2 py-1.5 text-stone-400 hover:text-white text-xs"
              >
                انصراف
              </button>
            </div>
          )}
        </div>

        {/* Colors: checkbox multi-select with presets + custom add */}
        <div className="p-4 rounded-xl glass-card space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              رنگ‌بندی
            </label>
            {!addingColor && (
              <button
                type="button"
                onClick={() => setAddingColor(true)}
                className="text-[11px] text-brand hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                تعریف رنگ جدید
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {[...PRESET_COLORS, ...customColors].map((c) => chipCheckbox(c, colors.includes(c), () => toggleColor(c)))}
          </div>
          {addingColor && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newColorInput}
                onChange={(e) => setNewColorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomColor())}
                placeholder="رنگ دلخواه (مثلاً: سرمه‌ای روشن)"
                className="flex-1 px-3 py-1.5 rounded-xl glass-input text-xs outline-none"
                autoFocus
              />
              <button type="button" onClick={addCustomColor} className="px-3 py-1.5 rounded-xl bg-brand text-brand-on font-bold text-xs">
                افزودن
              </button>
              <button
                type="button"
                onClick={() => { setAddingColor(false); setNewColorInput(''); }}
                className="px-2 py-1.5 text-stone-400 hover:text-white text-xs"
              >
                انصراف
              </button>
            </div>
          )}
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

        {/* Purchase price in USD (2 decimals) */}
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30">
          <label className="flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300 mb-2">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              قیمت خرید به دلار
            </span>
            <span className="font-normal text-[10px] text-sky-600/80 dark:text-sky-400/80">دو رقم اعشار — مثلاً 3.24</span>
          </label>
          <input
            type="text"
            dir="ltr"
            inputMode="decimal"
            value={purchasePriceUsd}
            onChange={(e) => setPurchasePriceUsd(e.target.value.replace(/[^\d.,۰-۹]/g, ''))}
            placeholder="3.24"
            className="w-40 px-3 py-2 rounded-lg glass-input text-sm font-mono text-left outline-none focus:border-sky-500"
          />
        </div>

        {/* Workshop cost breakdown calculator */}
        <div className="p-4 rounded-xl bg-brand/10 border border-brand/30 space-y-3">
          <label className="text-xs font-bold text-brand flex items-center gap-1.5">
            <Calculator className="w-4 h-4" />
            تفکیک قیمت تمام شده کارگاه
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {COST_COMPONENTS.map(({ key, label, hint }) => (
              <div key={key}>
                <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                  {label}
                  {hint && key === 'fabric' && (
                    <span className={`block mt-0.5 text-[9px] font-bold ${fabricShare > 40 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {toPersianDigits(fabricShare)}٪ از مجموع {fabricShare > 40 ? '(بیش از ۴۰٪!)' : '(≤ ۴۰٪ ✓)'}
                    </span>
                  )}
                </label>
                <FormattedNumberInput
                  value={breakdown[key] || null}
                  onChange={(v) => updateBreakdown(key, v)}
                  placeholder="۰"
                  className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono outline-none focus:border-brand"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/70 dark:bg-black/30 border border-brand/30">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-200">جمع = قیمت تمام شده کارگاه</span>
            <span className="text-sm font-black text-brand font-mono">{formatToman(breakdownSum)}</span>
          </div>
        </div>

        {/* Pricing rows: workshop / consignment / retail (+ % mode) */}
        <div className="p-4 rounded-xl bg-brand/10 border border-brand/30 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-bold text-brand">ساختار قیمت‌گذاری (به تومان)</p>
            <label className="flex items-center gap-2 text-[11px] font-bold text-stone-600 dark:text-stone-300">
              <Percent className="w-3.5 h-3.5 text-brand" />
              قیمت‌گذاری درصدی از قیمت کارگاه
              <Switch checked={percentPricingOn} onCheckedChange={setPercentPricingOn} />
            </label>
          </div>

          {percentPricingOn ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                  قیمت تمام شده کارگاه (پایه محاسبه)
                </label>
                <div className="px-3 py-2 rounded-lg bg-white dark:bg-[#141414] border border-brand/30 text-sm font-black text-brand-ink dark:text-brand font-mono">
                  {formatToman(effectiveCostPrice || 0)}
                </div>
                <p className="text-[10px] text-stone-400 mt-1">از تفکیک هزینه‌ها یا فیلد کارگاه</p>
              </div>
              <div>
                <label className="block text-[11px] text-stone-900 dark:text-stone-200 font-bold mb-1">
                  درصد قیمت امانی *
                </label>
                <div className="flex gap-1.5">
                  <FormattedNumberInput
                    value={consignmentPercent}
                    onChange={setConsignmentPercent}
                    placeholder="۱۵۰"
                    className="flex-1 px-3 py-2 rounded-lg glass-input text-xs font-mono outline-none focus:border-brand"
                  />
                  <span className="text-xs font-bold text-stone-500 self-center">٪</span>
                </div>
                <p className="text-[10px] text-stone-500 mt-1 font-mono">
                  = {formatToman(computedConsignmentPrice || 0)}
                </p>
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                  درصد قیمت فروشگاه
                </label>
                <div className="flex gap-1.5">
                  <FormattedNumberInput
                    value={retailPercent}
                    onChange={setRetailPercent}
                    placeholder="۲۵۰"
                    className="flex-1 px-3 py-2 rounded-lg glass-input text-xs font-mono outline-none focus:border-brand"
                  />
                  <span className="text-xs font-bold text-stone-500 self-center">٪</span>
                </div>
                <p className="text-[10px] text-stone-500 mt-1 font-mono">
                  = {formatToman(computedRetailPrice || 0)}
                </p>
              </div>
            </div>
          ) : (
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
          )}
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
                const keys = kind === 'sizes' ? sizes : colors;
                if (keys.length === 0) {
                  return (
                    <p key={kind} className="text-[11px] text-stone-400 italic">
                      {kind === 'sizes' ? 'ابتدا سایزها را انتخاب کنید.' : 'ابتدا رنگ‌ها را انتخاب کنید.'}
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
                                      ? formatToman((percentPricingOn ? effectiveCostPrice : costPrice) || 0)
                                      : field === 'consignmentPrice'
                                      ? formatToman(computedConsignmentPrice || 0)
                                      : formatToman(computedRetailPrice || 0)
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

        {/* Stock & production status */}
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

          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer select-none">
              <Shirt className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="flex-1 text-xs font-bold text-stone-700 dark:text-stone-200">
                این کالا سفارش است و هنوز تولید نشده
                <span className="block text-[10px] font-normal text-stone-500 dark:text-stone-400 mt-0.5">
                  تا زمان «علامت‌گذاری آماده» برای دست‌فروش‌ها و فروشگاه قابل فروش نیست
                </span>
              </span>
              <Checkbox
                checked={isPendingProduction}
                onCheckedChange={(c) => setIsPendingProduction(c === true)}
              />
            </label>
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
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <PackageCheck className="w-4 h-4" />
            {editItem ? 'ذخیره تغییرات' : 'افزودن به انبار'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
