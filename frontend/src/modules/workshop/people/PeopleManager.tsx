import React from 'react';

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

/**
 * PeopleManager — renders either the SellersManager or StaffManager based on
 * the initialSubTab prop. Used by PeoplePage for /console/people/sellers and
 * /console/people/staff routes. The tabbed navigation was removed: each
 * category now has its own dedicated route and sidebar menu item.
 */
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
  return (
    <div className="space-y-6" dir="rtl">
      {initialSubTab === 'sellers' && (
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

      {initialSubTab === 'staff' && (
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
