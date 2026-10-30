import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MapPin, Edit2, Trash2, Check, X as XIcon } from 'lucide-react';
import type { Supplier } from '@/types';
import { toPersianDigits, formatToman } from '@/utils/persian';

interface SupplierCardProps {
  supplier: Supplier;
  canManage: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  onToggleActive: (supplier: Supplier) => void;
}

/**
 * Enhanced supplier card — mirrors the SellersManager card pattern.
 * Shows at a glance: shop name, contact persons, city, categories,
 * primary phone (clickable to call), purchase stats, and action buttons.
 * Clicking the card navigates to /console/profile/supplier/:id.
 */
export const SupplierCard: React.FC<SupplierCardProps> = ({
  supplier,
  canManage,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 800);
  };

  return (
    <div
      onClick={() => navigate(`/console/profile/supplier/${supplier.id}`)}
      className="glass-card p-4 sm:p-5 rounded-2xl hover:border-brand/50 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-3.5 group relative"
    >
      <div className="flex-1">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Shop Name & Code */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-black text-stone-900 dark:text-white text-sm sm:text-base truncate group-hover:text-brand transition-colors">
                {supplier.shopName}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-black/50 text-stone-600 dark:text-stone-400 font-mono">
                {toPersianDigits(supplier.code)}
              </span>
              {supplier.isActive === false && (
                <span className="px-1.5 py-0.25 text-[9px] rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                  غیرفعال
                </span>
              )}
            </div>

            {/* Contact Person(s) */}
            {supplier.contactPersons && supplier.contactPersons.length > 0 && (
              <div className="mb-1.5 text-xs text-stone-600 dark:text-gray-300">
                {supplier.contactPersons.slice(0, 2).map((contact, idx) => (
                  <span key={contact.id || idx}>
                    {contact.name}
                  </span>
                ))}
                {supplier.contactPersons.length > 2 && (
                  <span> و {toPersianDigits(supplier.contactPersons.length - 2)} نفر دیگر</span>
                )}
              </div>
            )}

            {/* Clickable Phone Number(s) */}
            {supplier.phones && supplier.phones.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {supplier.phones.slice(0, 2).map((phone, idx) => (
                  <a
                    key={idx}
                    href={`tel:${phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-brand hover:underline font-mono inline-flex items-center gap-1"
                    dir="ltr"
                    title={phone}
                  >
                    <Phone className="w-3 h-3 text-brand shrink-0" />
                    <span>{phone}</span>
                    {copiedKey === `phone-${supplier.id}-${idx}` ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <button
                        onClick={(e) => handleCopy(phone, `phone-${supplier.id}-${idx}`, e)}
                        className="opacity-30 hover:opacity-100 transition-opacity"
                      >
                        کپی
                      </button>
                    )}
                  </a>
                ))}
              </div>
            )}

            {/* City & Categories */}
            <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-gray-400">
              {supplier.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-brand shrink-0" />
                  <span>{supplier.city}</span>
                </div>
              )}
              {supplier.categories && supplier.categories.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {supplier.categories.slice(0, 3).map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.25 rounded-md bg-brand/10 dark:bg-brand/15 text-brand text-[9px] font-black"
                    >
                      {cat}
                    </span>
                  ))}
                  {supplier.categories.length > 3 && (
                    <span className="text-[9px]">+{toPersianDigits(supplier.categories.length - 3)}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(supplier);
                }}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
                title="ویرایش"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive(supplier);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  supplier.isActive === false
                    ? 'text-stone-500 hover:text-emerald-600 hover:bg-emerald-500/10'
                    : 'text-stone-500 hover:text-rose-600 hover:bg-rose-500/10'
                }}`}
                title={supplier.isActive === false ? 'فعال کنید' : 'غیرفعال کنید'}
              >
                {supplier.isActive === false ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(supplier);
                }}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Purchase Stats Summary */}
        {(supplier.totalPurchases !== undefined || supplier.orderCount !== undefined) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {supplier.totalPurchases !== undefined && supplier.totalPurchases > 0 && (
              <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
                <span className="text-[10px] text-stone-500 dark:text-gray-400 block">کل خرید:</span>
                <div className="font-black text-xs sm:text-sm font-mono text-stone-800 dark:text-gray-300 truncate text-left" dir="ltr">
                  {formatToman(supplier.totalPurchases)}
                </div>
              </div>
            )}
            {supplier.orderCount !== undefined && supplier.orderCount > 0 && (
              <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
                <span className="text-[10px] text-stone-500 dark:text-gray-400 block">سفارشات:</span>
                <div className="font-black text-xs sm:text-sm font-mono text-stone-800 dark:text-gray-300 truncate text-left">
                  {toPersianDigits(supplier.orderCount)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
