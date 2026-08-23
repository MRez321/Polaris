import React from 'react';
import { InventoryManager } from '@/components/inventory/InventoryManager';
import { useData } from '@/context/DataContext';
import { useUI } from '@/context/UIContext';

const InventoryPage: React.FC = () => {
  const { items, categories, handleAddItem, handleUpdateItem, handleDeleteItem, handleCreateCategory } = useData();
  const { openQuickHandover } = useUI();

  return (
    <InventoryManager
      items={items}
      onAddItem={handleAddItem}
      onUpdateItem={handleUpdateItem}
      onDeleteItem={handleDeleteItem}
      onQuickHandoverItem={() => openQuickHandover()}
      categories={categories}
      onCreateCategory={handleCreateCategory}
    />
  );
};

export default InventoryPage;
