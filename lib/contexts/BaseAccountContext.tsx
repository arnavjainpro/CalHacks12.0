"use client";

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { createBaseAccountSDK, base } from '@base-org/account';
import type { BaseAccountSDK } from '@base-org/account';

interface BaseAccountContextType {
  sdk: BaseAccountSDK | null;
  provider: ReturnType<BaseAccountSDK['getProvider']> | null;
  isAvailable: boolean;
}

const BaseAccountContext = createContext<BaseAccountContextType>({
  sdk: null,
  provider: null,
  isAvailable: false,
});

export function BaseAccountProvider({ children }: { children: ReactNode }) {
  const contextValue = useMemo(() => {
    try {
      // Initialize Base Account SDK
      const sdk = createBaseAccountSDK({
        appName: 'MedChain',
        appLogoUrl: 'https://base.org/logo.png',
        appChainIds: [base.constants.CHAIN_IDS.baseSepolia],
      });

      const provider = sdk.getProvider();

      return {
        sdk,
        provider,
        isAvailable: true,
      };
    } catch (error) {
      console.error('[BaseAccountProvider] Failed to initialize SDK:', error);
      return {
        sdk: null,
        provider: null,
        isAvailable: false,
      };
    }
  }, []);

  return (
    <BaseAccountContext.Provider value={contextValue}>
      {children}
    </BaseAccountContext.Provider>
  );
}

export function useBaseAccount() {
  const context = useContext(BaseAccountContext);
  if (!context) {
    throw new Error('useBaseAccount must be used within BaseAccountProvider');
  }
  return context;
}
