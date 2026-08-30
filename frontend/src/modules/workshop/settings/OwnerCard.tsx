import React, { useState } from 'react';
import type { Owner } from '@/types';
import {
  Phone,
  CreditCard,
  Copy,
  Check,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { SafeImage } from '@/components/common/SafeImage';

interface OwnerCardProps {
  owner: Owner;
  onEdit: (owner: Owner) => void;
  showEditButton?: boolean;
}

export const OwnerCard: React.FC<OwnerCardProps> = ({
  owner,
  onEdit,
  showEditButton = true,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!text) return;
    navigator.clipboard.writeText(text.replace(/[\s-]/g, ''));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const accounts = owner.bankAccounts || [];
  const maxInitialAccounts = 2;
  const visibleAccounts = isExpanded ? accounts : accounts.slice(0, maxInitialAccounts);
  const hasExtraAccounts = accounts.length > maxInitialAccounts;

  return (
    <div className="glass-card p-5 rounded-2xl border border-stone-200 dark:border-[#CEAE80]/30 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-4 hover:border-[#CEAE80]/50 transition-all">
      {/* Top Banner & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <SafeImage
            src={owner.avatarUrl}
            alt={owner.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#CEAE80] shadow-md shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h5 className="font-black text-base text-stone-900 dark:text-white">{owner.name}</h5>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 dark:bg-[#CEAE80]/20 text-amber-900 dark:text-[#CEAE80] font-black border border-amber-600/30 dark:border-[#CEAE80]/30">
                مالک و هم‌بنیان‌گذار
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-[#CEAE80] font-bold mt-0.5">{owner.role}</p>
            {owner.bio && (
              <p className="text-[11px] text-stone-600 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                {owner.bio}
              </p>
            )}
          </div>
        </div>

        {showEditButton && (
          <button
            onClick={() => onEdit(owner)}
            className="p-2 rounded-xl text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors shrink-0"
            title="ویرایش مشخصات هم‌بنیان‌گذار"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Phone Numbers: Clickable directly to call */}
      <div className="space-y-1.5 text-xs">
        <span className="text-[11px] text-stone-600 dark:text-gray-400 font-bold block">
          شماره‌های تماس و همراه:
        </span>
        <div className="flex flex-wrap gap-2">
          {(owner.phones || []).map((ph, idx) => {
            const pKey = `ph-${owner.id}-${idx}`;
            return (
              <div
                key={idx}
                className="flex items-center rounded-xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/10 hover:border-[#CEAE80] text-xs font-mono transition-all group overflow-hidden"
              >
                {/* Direct click-to-call link */}
                <a
                  href={`tel:${ph}`}
                  title="تماس فوری"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-stone-800 dark:text-stone-200 hover:text-amber-800 dark:hover:text-[#CEAE80] font-bold"
                  dir="ltr"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>{ph}</span>
                </a>

                {/* Inline copy button */}
                <button
                  type="button"
                  onClick={(e) => handleCopy(ph, pKey, e)}
                  className="px-2 py-1.5 border-r border-stone-200 dark:border-white/10 text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 transition-colors"
                  title="کپی شماره تماس"
                >
                  {copiedKey === pKey ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bank Accounts: Entire card & sheba box copyable on click */}
      <div className="space-y-2">
        <span className="text-[11px] text-stone-700 dark:text-stone-300 font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-[#CEAE80]" />
            <span>حساب‌های بانکی، کارت و شبا (جهت واریز و تسویه):</span>
          </span>
          <span className="text-[10px] text-stone-400 font-normal">
            (کلیک روی هر کادر = کپی خودکار)
          </span>
        </span>

        <div className="space-y-2">
          {visibleAccounts.map((acc, aIdx) => {
            const cKey = `card-${owner.id}-${aIdx}`;
            const sKey = `sheba-${owner.id}-${aIdx}`;
            const isCardCopied = copiedKey === cKey;
            const isShebaCopied = copiedKey === sKey;

            return (
              <div
                key={aIdx}
                className="p-3 rounded-xl bg-stone-50 dark:bg-[#161616] border border-stone-200 dark:border-white/10 space-y-2 transition-all hover:border-[#CEAE80]/40"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-amber-800 dark:text-[#CEAE80]">{acc.bankName}</span>
                  {acc.accountHolder && (
                    <span className="text-stone-500 dark:text-stone-400 text-[11px] font-medium">
                      به نام: {acc.accountHolder}
                    </span>
                  )}
                </div>

                {/* Entire Card box is clickable to copy */}
                {acc.cardNumber && (
                  <div
                    onClick={() => handleCopy(acc.cardNumber, cKey)}
                    className={`cursor-pointer group flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all select-none ${
                      isCardCopied
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-stone-100 dark:bg-black/50 border-stone-200 dark:border-white/5 hover:border-[#CEAE80] hover:bg-amber-500/10 dark:hover:bg-[#CEAE80]/15'
                    }`}
                    title="کلیک برای کپی شماره کارت"
                  >
                    <div className="flex items-center gap-2 text-xs font-mono text-stone-900 dark:text-white" dir="ltr">
                      <CreditCard className="w-4 h-4 text-[#CEAE80] group-hover:scale-110 transition-transform" />
                      <span className="font-black tracking-wider text-xs sm:text-sm">{acc.cardNumber}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 group-hover:text-amber-900 dark:group-hover:text-[#CEAE80]">
                      {isCardCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">کپی شد</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                          <span className="text-[11px]">کپی کارت</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Entire Sheba box is clickable to copy */}
                {acc.shebaNumber && (
                  <div
                    onClick={() => handleCopy(acc.shebaNumber, sKey)}
                    className={`cursor-pointer group flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all select-none ${
                      isShebaCopied
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-stone-100 dark:bg-black/50 border-stone-200 dark:border-white/5 hover:border-[#CEAE80] hover:bg-amber-500/10 dark:hover:bg-[#CEAE80]/15'
                    }`}
                    title="کلیک برای کپی شماره شبا"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono text-stone-700 dark:text-gray-300" dir="ltr">
                      <span className="text-stone-500 font-sans text-[10px] font-bold">شبا:</span>
                      <span className="truncate max-w-[190px] sm:max-w-xs font-bold">{acc.shebaNumber}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 group-hover:text-amber-900 dark:group-hover:text-[#CEAE80]">
                      {isShebaCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">کپی شد</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                          <span className="text-[11px]">کپی شبا</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Collapsible toggle if more than 2 accounts */}
        {hasExtraAccounts && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 px-3 rounded-xl bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-white/5"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#CEAE80]" />
                <span>بستن حساب‌های اضافه</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-[#CEAE80]" />
                <span>
                  نمایش {toPersianDigits(accounts.length - maxInitialAccounts)} حساب دیگر...
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
