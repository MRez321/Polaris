import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Consignment, Seller } from '@/types';

interface UIContextValue {
  // Quick Handover modal
  quickHandoverOpen: boolean;
  quickHandoverSeller: Seller | null;
  openQuickHandover: (seller?: Seller | null) => void;
  closeQuickHandover: () => void;

  // Quick Payment modal
  quickPaymentOpen: boolean;
  quickPaymentSellerId: string | undefined;
  openQuickPayment: (seller?: Seller | string) => void;
  closeQuickPayment: () => void;

  // Consignment detail view
  selectedConsignment: Consignment | null;
  setSelectedConsignment: (c: Consignment | null) => void;

  // PWA install modal
  pwaModalOpen: boolean;
  setPwaModalOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quickHandoverOpen, setQuickHandoverOpen] = useState(false);
  const [quickHandoverSeller, setQuickHandoverSeller] = useState<Seller | null>(null);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [quickPaymentSellerId, setQuickPaymentSellerId] = useState<string | undefined>(undefined);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);

  const openQuickHandover = useCallback((seller?: Seller | null) => {
    setQuickHandoverSeller(seller ?? null);
    setQuickHandoverOpen(true);
  }, []);

  const closeQuickHandover = useCallback(() => {
    setQuickHandoverOpen(false);
    setQuickHandoverSeller(null);
  }, []);

  const openQuickPayment = useCallback((seller?: Seller | string) => {
    const sId = typeof seller === 'string' ? seller : seller?.id;
    setQuickPaymentSellerId(sId);
    setQuickPaymentOpen(true);
  }, []);

  const closeQuickPayment = useCallback(() => {
    setQuickPaymentOpen(false);
    setQuickPaymentSellerId(undefined);
  }, []);

  return (
    <UIContext.Provider
      value={{
        quickHandoverOpen,
        quickHandoverSeller,
        openQuickHandover,
        closeQuickHandover,
        quickPaymentOpen,
        quickPaymentSellerId,
        openQuickPayment,
        closeQuickPayment,
        selectedConsignment,
        setSelectedConsignment,
        pwaModalOpen,
        setPwaModalOpen,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
