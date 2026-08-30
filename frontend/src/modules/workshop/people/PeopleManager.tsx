import React, { useState } from 'react';
import {
  Users,
  Briefcase,
} from 'lucide-react';
import type {
  Seller,
  Consignment,
  PaymentRecord,
  ConsignmentReturn,
  Owner,
  StaffMember,
} from '@/types';
import { SellersManager } from '../sellers/SellersManager';
import { StaffManager } from '../staff/StaffManager';
import { toPersianDigits } from '@/utils/persian';

interface PeopleManagerProps {
  sellers: Seller[];
  consignments: Consignment[];
  payments: PaymentRecord[];
  returns: ConsignmentReturn[];
  onAddSeller: (data: Partial<Seller>) => void;
  onUpdateSeller: (id: string, data: Partial<Seller>) => void;
  onDeleteSeller: (id: string) => void;
  onQuickHandover?: (seller: Seller) => void;
  onQuickPayment?: (seller: Seller) => void;
  onSelectConsignment?: (c: Consignment) => void;
  owners: Owner[];
  staff: StaffMember[];
  onUpdateOwners: (owners: Owner[]) => void;
  onAddStaff: (data: Partial<StaffMember>) => void;
  onUpdateStaff: (id: string, data: Partial<StaffMember>) => void;
  onDeleteStaff: (id: string) => void;
  initialSubTab?: 'sellers' | 'staff';
}

export const PeopleManager: React.FC<PeopleManagerProps> = ({
  sellers,
  consignments,
  payments,
  returns,
  onAddSeller,
  onUpdateSeller,
  onDeleteSeller,
  onQuickHandover,
  onQuickPayment,
  onSelectConsignment,
  owners,
  staff,
  onUpdateOwners,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  initialSubTab = 'sellers',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sellers' | 'staff'>(initialSubTab);

  const subTabs = [
    {
      id: 'sellers' as const,
      label: 'فروشندگان',
      icon: Users,
      badge: sellers.length > 0 ? toPersianDigits(sellers.length) : undefined,
    },
    {
      id: 'staff' as const,
      label: 'کارکنان و صاحبان کارگاه',
      icon: Briefcase,
      badge: staff.length + owners.length > 0 ? toPersianDigits(staff.length + owners.length) : undefined,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* People Hub Unified Navigation Bar */}
      <div className="glass-panel p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#CEAE80] to-[#B59363] text-black flex items-center justify-center font-black shadow-md shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white">
              مرکز مدیریت اشخاص، فروشندگان و پرسنل کارگاه
            </h3>
            <p className="text-[10px] text-stone-500 dark:text-gray-400 hidden sm:block">
              پرونده فروشندگان راسته بازار، حساب‌های بانکی، پرسنل دوزندگی و شرکای کارگاه
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 dark:bg-black/40 border border-black/5 dark:border-white/5">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#CEAE80] text-black shadow-md font-black'
                    : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#A67C38] dark:text-[#CEAE80]'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-black/20 text-black' : 'bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-stone-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}
      {activeSubTab === 'sellers' && (
        <SellersManager
          sellers={sellers}
          consignments={consignments}
          payments={payments}
          returns={returns}
          onAddSeller={onAddSeller}
          onUpdateSeller={onUpdateSeller}
          onDeleteSeller={onDeleteSeller}
          onQuickHandover={onQuickHandover}
          onQuickPayment={onQuickPayment}
          onSelectConsignment={onSelectConsignment}
        />
      )}

      {activeSubTab === 'staff' && (
        <StaffManager
          owners={owners}
          staff={staff}
          onUpdateOwners={onUpdateOwners}
          onAddStaff={onAddStaff}
          onUpdateStaff={onUpdateStaff}
          onDeleteStaff={onDeleteStaff}
        />
      )}
    </div>
  );
};
