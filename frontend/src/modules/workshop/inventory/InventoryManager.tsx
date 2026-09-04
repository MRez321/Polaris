import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  Boxes,
  Globe,
  HandCoins,
  Store,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { GarmentItem } from '@/types';
import { formatToman, toPersianDigits } from '@/utils/persian';
import { Badge } from '@/components/common/Badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ItemFormModal } from './ItemFormModal';

interface InventoryManagerProps {
  items: GarmentItem[];
  onAddItem: (itemData: Partial<GarmentItem>) => void;
  onUpdateItem: (id: string, itemData: InventoryUpdatePayload) => void;
  onDeleteItem: (id: string) => void;
  onQuickHandoverItem?: (item: GarmentPoolItem) => void;
  categories?: { id: string; label: string }[];
  onCreateCategory?: (label: string) => void;
}

/** A channel-aware item — the shop pool is a client-side filter on listing
 *  availability, so keep the channel fields optional for callers that
 *  don't track them (only channel tabs need them). */
type GarmentPoolItem = GarmentItem & {
  websiteQuantity?: number;
  sellerHeld?: number;
};
type InventoryUpdatePayload = Partial<GarmentItem> & {
  websiteQuantity?: number;
};

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  items = [],
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onQuickHandoverItem,
  categories = [
    { id: 'coats_jackets', label: 'کت و کاپشن' },
    { id: 'pants', label: 'شلوار' },
    { id: 'shirts', label: 'پیراهن' },
    { id: 'women_clothing', label: 'مانتو و بانوان' },
    { id: 'men_clothing', label: 'هودی و راحتی' },
    { id: 'fabrics', label: 'پارچه' },
  ],
  onCreateCategory,
}) => {
  const safeItems = items || [];
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GarmentItem | null>(null);
  const [channel, setChannel] = useState<'all' | 'handover' | 'shop' | 'warehouse'>('all');

  const displayCategories = [
    { id: 'all', label: 'همه دسته‌ها' },
    ...categories,
  ];


  const filteredItems = safeItems.filter((item) => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.fabric || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || (item.stockQuantity || 0) <= (item.minStockThreshold || 0);
    const matchesChannel =
      channel === 'all' ||
      (channel === 'handover' && (item.sellerHeld || 0) > 0) ||
      (channel === 'shop' && (item.websiteQuantity || 0) > 0) ||
      (channel === 'warehouse' && (item.stockQuantity || 0) > 0);

    return matchesSearch && matchesCategory && matchesLowStock && matchesChannel;
  });

  const lowStockCount = safeItems.filter(
    (i) => (i.stockQuantity || 0) <= (i.minStockThreshold || 0)
  ).length;
  const totalStockCount = safeItems.reduce(
    (sum, i) => sum + (i.stockQuantity || 0) + (i.websiteQuantity || 0),
    0
  );
  const totalValue = safeItems.reduce(
    (sum, i) => sum + ((i.stockQuantity || 0) + (i.websiteQuantity || 0)) * (i.consignmentPrice || 0),
    0
  );

  const handleEdit = (item: GarmentItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSave = (itemData: Partial<GarmentItem>) => {
    if (editingItem) {
      onUpdateItem(editingItem.id, itemData);
    } else {
      onAddItem(itemData);
    }
  };

  return (
    <div className="space-y-6 text-stone-900 dark:text-white">
      {/* Top Banner & Quick stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-stone-200 dark:border-[#CEAE80]/20 shadow-md">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#CEAE80]" />
            <span className="text-amber-800 dark:text-[#CEAE80] font-black">انبار پوشاک و ملزومات دوزندگی پولاریس</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            مجموع موجودی: <span className="font-bold text-stone-900 dark:text-white">{toPersianDigits(totalStockCount)} عدد</span> • ارزش
            امانی کل انبار: <span className="font-black text-amber-800 dark:text-[#CEAE80]">{formatToman(totalValue)}</span>
          </p>
        </div>

        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن کالا به انبار</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-stone-200 dark:border-white/5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در انبار (نام لباس، کد کالا، جنس پارچه)..."
              className="w-full pl-4 pr-9 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                showLowStockOnly
                  ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
                  : 'glass-input text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>فقط کالاهای رو به اتمام ({toPersianDigits(lowStockCount)})</span>
            </button>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {displayCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#CEAE80] text-black shadow-md'
                  : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Tabs: همه / تحویل به دست‌فروش / در فروشگاه آنلاین / در انبار */}
      <Tabs value={channel} onValueChange={(v) => setChannel(v as typeof channel)} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-2xl glass-panel border border-stone-200 dark:border-white/5 p-1.5 h-auto">
          <TabsTrigger
            value="all"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[panel-hidden]:text-stone-500"
          >
            <Boxes className="w-4 h-4" />
            همه ({toPersianDigits(safeItems.length)})
          </TabsTrigger>
          <TabsTrigger
            value="handover"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[panel-hidden]:text-stone-500"
          >
            <HandCoins className="w-4 h-4" />
            تحویل به دست‌فروش ({toPersianDigits(safeItems.filter((i) => (i.sellerHeld || 0) > 0).length)})
          </TabsTrigger>
          <TabsTrigger
            value="shop"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[panel-hidden]:text-stone-500"
          >
            <Globe className="w-4 h-4" />
            در فروشگاه آنلاین ({toPersianDigits(safeItems.filter((i) => (i.websiteQuantity || 0) > 0).length)})
          </TabsTrigger>
          <TabsTrigger
            value="warehouse"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[panel-hidden]:text-stone-500"
          >
            <Store className="w-4 h-4" />
            در انبار ({toPersianDigits(safeItems.filter((i) => (i.stockQuantity || 0) > 0).length)})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isLowStock = item.stockQuantity <= item.minStockThreshold;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl glass-card border transition-all hover:border-[#CEAE80]/50 shadow-md flex flex-col justify-between cursor-pointer ${
                isLowStock ? 'border-amber-400/50 bg-amber-500/[0.05]' : 'border-stone-200 dark:border-white/5'
              }`}
              onClick={() => navigate(`/workshop/profile/items/${item.id}`)}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-500 dark:text-gray-400">
                        {item.code}
                      </span>
                      {isLowStock && (
                        <Badge variant="warning" size="sm">
                          کسری موجودی
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-stone-900 dark:text-white text-sm mt-1">
                      {item.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                      title="ویرایش"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`آیا از حذف "${item.name}" مطمئن هستید؟`)) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                      title="حذف کالا"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-xs text-stone-500 dark:text-gray-400 space-y-1">
                  <p>
                    <span className="font-bold text-stone-700 dark:text-gray-300">جنس:</span> {item.fabric}
                  </p>
                  <p>
                    <span className="font-bold text-stone-700 dark:text-gray-300">سایزها:</span>{' '}
                    {item.sizes.join(' • ')}
                  </p>
                  <p>
                    <span className="font-bold text-stone-700 dark:text-gray-300">رنگ‌ها:</span>{' '}
                    {item.colors.join(' ، ')}
                  </p>
                </div>

                {/* Price Matrix */}
                <div className="mt-3.5 p-2.5 rounded-xl bg-stone-50 dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 dark:text-gray-400 block">قیمت امانی دست‌فروش:</span>
                    <span className="font-black text-amber-800 dark:text-[#CEAE80] font-mono">
                      {formatToman(item.consignmentPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 dark:text-gray-400 block">قیمت تمام شده:</span>
                    <span className="font-bold text-stone-700 dark:text-stone-300 font-mono">
                      {formatToman(item.costPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Bar & Actions — remaining free units big/bold, total smaller in parentheses */}
              <div className="mt-4 pt-3 border-t border-stone-200 dark:border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      item.stockQuantity === 0
                        ? 'bg-rose-500'
                        : isLowStock
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-sm font-black text-stone-900 dark:text-white whitespace-nowrap">
                    {toPersianDigits(item.stockQuantity)}
                    <span className="text-[10px] font-bold text-stone-500 dark:text-gray-400 mr-1">
                      آزاد انبار
                    </span>
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 whitespace-nowrap">
                    (مجموع {toPersianDigits((item.stockQuantity || 0) + (item.websiteQuantity || 0) + (item.sellerHeld || 0))})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(item.websiteQuantity || 0) > 0 && (
                    <Badge variant="default" size="sm" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                      فروشگاه: {toPersianDigits(item.websiteQuantity || 0)}
                    </Badge>
                  )}
                  {(item.sellerHeld || 0) > 0 && (
                    <Badge variant="default" size="sm" className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                      دست‌فروش: {toPersianDigits(item.sellerHeld || 0)}
                    </Badge>
                  )}

                  {onQuickHandoverItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickHandoverItem(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-[#CEAE80] text-amber-800 dark:text-[#CEAE80] hover:text-black border border-amber-500/30 text-xs font-black transition-colors"
                    >
                      تحویل امانی
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 glass-panel rounded-2xl border border-stone-200 dark:border-white/5 p-6">
          <Package className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <p className="font-bold text-stone-800 dark:text-gray-300 text-sm">
            هیچ کالایی با فیلترهای انتخابی یافت نشد
          </p>
          <p className="text-xs text-stone-500 dark:text-gray-500 mt-1">
            می‌توانید کلمه جستجو را پاک کنید یا کالای جدیدی به انبار دوزندگی اضافه نمایید.
          </p>
        </div>
      )}

      {/* Item Form Modal */}
      <ItemFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        editItem={editingItem}
        categories={categories}
        onCreateCategory={onCreateCategory}
      />
    </div>
  );
};
