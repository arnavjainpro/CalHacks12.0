"use client";

import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { createBaseAccountSDK, base } from '@base-org/account';

// Infer the SDK type from the createBaseAccountSDK function
type BaseAccountSDK = ReturnType<typeof createBaseAccountSDK>;

interface BaseAccountContextType {
  sdk: BaseAccountSDK | null;
  provider: any | null; // Provider type varies, using any for flexibility
  isAvailable: boolean;
}

const BaseAccountContext = createContext<BaseAccountContextType>({
  sdk: null,
  provider: null,
  isAvailable: false,
});

export function BaseAccountProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const contextValue = useMemo(() => {
    // Only initialize on client side after component is mounted
    if (typeof window === 'undefined' || !isMounted) {
      return {
        sdk: null,
        provider: null,
        isAvailable: false,
      };
    }

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
  }, [isMounted]);

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
