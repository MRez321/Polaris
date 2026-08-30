import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PeopleManager } from '@/modules/workshop/people/PeopleManager';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';

const PeoplePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    sellers,
    consignments,
    payments,
    returns,
    owners,
    staffMembers,
    handleAddSeller,
    handleUpdateSeller,
    handleDeleteSeller,
    handleUpdateOwners,
    handleAddStaff,
    handleUpdateStaff,
    handleDeleteStaff,
  } = useData();
  const { openQuickHandover, openQuickPayment, setSelectedConsignment } = useUI();

  const initialSubTab = location.pathname.endsWith('/staff') ? 'staff' : 'sellers';

  return (
    <PeopleManager
      sellers={sellers}
      consignments={consignments}
      payments={payments}
      returns={returns}
      onAddSeller={handleAddSeller}
      onUpdateSeller={handleUpdateSeller}
      onDeleteSeller={handleDeleteSeller}
      onQuickHandover={(s) => openQuickHandover(s)}
      onQuickPayment={(s) => openQuickPayment(s)}
      onSelectConsignment={(c) => {
        setSelectedConsignment(c);
        navigate('/workshop/consignments');
      }}
      owners={owners}
      staff={staffMembers}
      onUpdateOwners={handleUpdateOwners}
      onAddStaff={handleAddStaff}
      onUpdateStaff={handleUpdateStaff}
      onDeleteStaff={handleDeleteStaff}
      initialSubTab={initialSubTab}
    />
  );
};

export default PeoplePage;
