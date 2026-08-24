import React, { useState } from 'react';
import {
  CreditCard,
  Wrench,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import type {
  PaymentRecord,
  Seller,
  Consignment,
  Owner,
  StaffMember,
  DashboardStats,
  GarmentItem,
} from '../../types';
import { PaymentsManager } from '../payments/PaymentsManager';
import { WorkshopManager } from '../workshop/WorkshopManager';
import { FinancialReports } from '../analytics/FinancialReports';
import { toPersianDigits } from '../../utils/persian';

interface FinancesManagerProps {
  payments: PaymentRecord[];
  sellers: Seller[];
  consignments: Consignment[];
  onSubmitPayment: (data: any) => Promise<any>;
  preSelectedSellerId?: string;
  owners: Owner[];
  staff: StaffMember[];
  totalActiveDebt: number;
  todayPayments: number;
  stats: DashboardStats | null;
  items: GarmentItem[];
  initialSubTab?: 'payments' | 'workshop' | 'reports';
}

export const FinancesManager: React.FC<FinancesManagerProps> = ({
  payments,
  sellers,
  consignments,
  onSubmitPayment,
  preSelectedSellerId,
  owners,
  staff,
  totalActiveDebt,
  todayPayments,
  stats,
  items,
  initialSubTab = 'payments',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'payments' | 'workshop' | 'reports'>(initialSubTab);

  const subTabs = [
    {
      id: 'payments' as const,
      label: 'وجه‌های دریافتی',
      icon: CreditCard,
      badge: payments.length > 0 ? toPersianDigits(payments.length) : undefined,
    },
    {
      id: 'workshop' as const,
      label: 'هزینه‌ها و درآمد',
      icon: Wrench,
    },
    {
      id: 'reports' as const,
      label: 'گزارش‌های مالی',
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Financial Hub Unified Navigation Bar */}
      <div className="glass-panel p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#CEAE80] to-[#B59363] text-black flex items-center justify-center font-black shadow-md shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white">
              مرکز یکپارچه امور مالی، دریافتی‌ها و درآمد کارگاه
            </h3>
            <p className="text-[10px] text-stone-500 dark:text-gray-400 hidden sm:block">
              مدیریت تسویه‌ها، تحلیل بدهی‌های سنی، ثبت هزینه‌های تولید و تسهیم سود
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 dark:bg-black/40 border border-black/5 dark:border-white/5 overflow-x-auto max-w-full">
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
      {activeSubTab === 'payments' && (
        <PaymentsManager
          payments={payments}
          sellers={sellers}
          consignments={consignments}
          onSubmitPayment={onSubmitPayment}
          preSelectedSellerId={preSelectedSellerId}
        />
      )}

      {activeSubTab === 'workshop' && (
        <WorkshopManager
          owners={owners}
          staff={staff}
          totalActiveDebt={totalActiveDebt}
          todayPayments={todayPayments}
        />
      )}

      {activeSubTab === 'reports' && stats && (
        <FinancialReports
          stats={stats}
          sellers={sellers}
          consignments={consignments}
          payments={payments}
          items={items}
        />
      )}
    </div>
  );
};
