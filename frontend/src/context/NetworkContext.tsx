import React, { createContext, useContext } from 'react';
import { useNetworkStatus, type NetworkStatus } from '@/hooks/useNetworkStatus';

const NetworkContext = createContext<NetworkStatus | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const networkStatus = useNetworkStatus();
  return <NetworkContext.Provider value={networkStatus}>{children}</NetworkContext.Provider>;
};

export function useNetwork(): NetworkStatus {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}
