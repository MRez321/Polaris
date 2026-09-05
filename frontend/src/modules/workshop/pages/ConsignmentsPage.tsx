import React, { useState } from 'react';
import { FileText, Undo2 } from 'lucide-react';
import { HandoverManager } from '@/modules/workshop/consignments/HandoverManager';
import { ReturnsSection } from '@/modules/workshop/consignments/ReturnsSection';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { toPersianDigits } from '@/utils/persian';

type ConsignmentsTab = 'invoices' | 'returns';

const ConsignmentsPage: React.FC = () => {
  const {
    consignments,
    sellers,
    items,
    returns,
    handleSubmitHandover,
    handleSubmitReturn,
    handleUpdateSeller,
    handleAddSeller,
    handleAddItem,
  } = useData();
  const { openQuickPayment, selectedConsignment, setSelectedConsignment } = useUI();
  const [activeTab, setActiveTab] = useState<ConsignmentsTab>('invoices');

  const tabs: { id: ConsignmentsTab; label: string; icon: React.ElementType; badge: number }[] = [
    { id: 'invoices', label: 'فاکتورها', icon: FileText, badge: consignments.length },
    { id: 'returns', label: 'مرجوعی‌ها', icon: Undo2, badge: returns.length },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Switcher Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 dark:bg-black/40 border border-black/5 dark:border-white/5 w-fit max-w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-brand text-brand-on shadow-md font-black'
                  : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-brand-ink'}`}
              />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  isActive
                    ? 'bg-black/20 text-black'
                    : 'bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-stone-300'
                }`}
              >
                {toPersianDigits(tab.badge)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'invoices' ? (
        <HandoverManager
          consignments={consignments}
          sellers={sellers}
          items={items}
          onSubmitHandover={handleSubmitHandover}
          onSubmitReturn={handleSubmitReturn}
          onUpdateSeller={handleUpdateSeller}
          onRecordPaymentForSeller={(sellerId) => openQuickPayment(sellerId)}
          selectedConsignmentForView={selectedConsignment}
          onClearSelectedConsignment={() => setSelectedConsignment(null)}
          onQuickCreateSeller={handleAddSeller}
          onQuickCreateItem={handleAddItem}
        />
      ) : (
        <ReturnsSection
          returns={returns}
          consignments={consignments}
          sellers={sellers}
          onSubmitReturn={handleSubmitReturn}
        />
      )}
    </div>
  );
};

export default ConsignmentsPage;
