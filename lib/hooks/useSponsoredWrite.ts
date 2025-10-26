import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { useBaseAccount } from '@/lib/contexts/BaseAccountContext';
import {
  checkPaymasterSupport,
  getPaymasterUrl,
  prepareCall,
  sendSponsoredTransaction,
  isPaymasterConfigured,
  type PrepareCallParams,
} from '@/lib/utils/paymaster';
import { Address } from 'viem';

export interface WriteContractParams {
  address: Address;
  abi: any;
  functionName: string;
  args: any[];
  value?: bigint;
}

/**
 * Custom hook that wraps wagmi's useWriteContract with automatic paymaster support.
 * Falls back to regular wagmi write if paymaster is unavailable.
 */
export function useSponsoredWrite() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { provider, isAvailable: isBaseAccountAvailable } = useBaseAccount();
  const { writeContractAsync: wagmiWrite, isPending: isWagmiPending } = useWriteContract();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const writeContractAsync = useCallback(
    async (params: WriteContractParams): Promise<`0x${string}`> => {
      setIsPending(true);
      setError(null);

      try {
        // Check if we can use sponsored transactions
        const paymasterUrl = getPaymasterUrl();
        const canUsePaymaster =
          isPaymasterConfigured() &&
          isBaseAccountAvailable &&
          provider &&
          address;

        console.log('[useSponsoredWrite] Transaction attempt:', {
          canUsePaymaster,
          hasPaymasterUrl: !!paymasterUrl,
          hasProvider: !!provider,
          hasAddress: !!address,
          function: params.functionName,
        });

        // If paymaster is available, try sponsored transaction
        if (canUsePaymaster && paymasterUrl && provider && address) {
          try {
            // Check if wallet supports paymaster
            const hasSupport = await checkPaymasterSupport(provider, address);

            if (hasSupport) {
              console.log('[useSponsoredWrite] Using sponsored transaction');

              // Prepare the call (convert 'address' to 'to')
              const call = prepareCall({
                to: params.address,
                abi: params.abi,
                functionName: params.functionName,
                args: params.args,
                value: params.value,
              });

              // Send sponsored transaction
              const result = await sendSponsoredTransaction({
                provider,
                from: address,
                calls: [call],
                paymasterUrl,
              });

              // Wait for transaction receipt
              if (publicClient) {
                const receipt = await publicClient.waitForTransactionReceipt({
                  hash: result as `0x${string}`,
                });
                console.log('[useSponsoredWrite] Sponsored transaction mined:', receipt.transactionHash);
                setIsPending(false);
                return receipt.transactionHash;
              }

              setIsPending(false);
              return result as `0x${string}`;
            } else {
              console.log('[useSponsoredWrite] Paymaster not supported, falling back to wagmi');
            }
          } catch (paymasterError) {
            console.warn('[useSponsoredWrite] Paymaster failed, falling back to wagmi:', paymasterError);
          }
        }

        // Fallback to regular wagmi write
        console.log('[useSponsoredWrite] Using regular wagmi transaction');
        const result = await wagmiWrite({
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
          value: params.value,
        });

        setIsPending(false);
        return result;
      } catch (err) {
        const error = err as Error;
        console.error('[useSponsoredWrite] Transaction failed:', error);
        setError(error);
        setIsPending(false);
        throw error;
      }
    },
    [address, provider, isBaseAccountAvailable, wagmiWrite, publicClient]
  );

  return {
    writeContractAsync,
    isPending: isPending || isWagmiPending,
    error,
  };
}
