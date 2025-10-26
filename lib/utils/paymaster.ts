import { base, createBaseAccountSDK } from '@base-org/account';
import { encodeFunctionData, numberToHex, Address } from 'viem';

// Infer the SDK type from the createBaseAccountSDK function
type BaseAccountSDK = ReturnType<typeof createBaseAccountSDK>;

export const CHAIN_ID = base.constants.CHAIN_IDS.baseSepolia;

/**
 * Type for wallet capabilities response
 */
interface WalletCapabilities {
  [chainId: number]: {
    paymasterService?: {
      supported: boolean;
    };
  };
}

/**
 * Check if the wallet supports paymaster services
 */
export async function checkPaymasterSupport(
  provider: ReturnType<BaseAccountSDK['getProvider']>,
  address: Address
): Promise<boolean> {
  try {
    const capabilities = await provider.request({
      method: 'wallet_getCapabilities',
      params: [address],
    }) as WalletCapabilities;

    const baseCapabilities = capabilities[CHAIN_ID];
    const isSupported = baseCapabilities?.paymasterService?.supported === true;

    console.log('[Paymaster] Support check:', {
      address,
      isSupported,
      capabilities: baseCapabilities,
    });

    return isSupported;
  } catch (error) {
    console.error('[Paymaster] Failed to check capabilities:', error);
    return false;
  }
}

/**
 * Get the paymaster service URL from environment
 */
export function getPaymasterUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_PAYMASTER_ENDPOINT_URL;

  if (!url) {
    console.warn('[Paymaster] NEXT_PUBLIC_PAYMASTER_ENDPOINT_URL not configured');
    return undefined;
  }

  return url;
}

/**
 * Prepare a sponsored transaction call
 */
export interface PrepareCallParams {
  to: Address;
  abi: any;
  functionName: string;
  args: any[];
  value?: bigint;
}

export function prepareCall(params: PrepareCallParams) {
  const { to, abi, functionName, args, value = 0n } = params;

  try {
    const data = encodeFunctionData({
      abi,
      functionName,
      args,
    });

    return {
      to,
      value: value === 0n ? '0x0' : numberToHex(value),
      data,
    };
  } catch (error) {
    console.error('[Paymaster] Failed to prepare call:', error);
    throw error;
  }
}

/**
 * Send a sponsored transaction using wallet_sendCalls
 */
export interface SendSponsoredCallParams {
  provider: ReturnType<BaseAccountSDK['getProvider']>;
  from: Address;
  calls: Array<{
    to: Address;
    value: string;
    data: `0x${string}`;
  }>;
  paymasterUrl: string;
}

export async function sendSponsoredTransaction(
  params: SendSponsoredCallParams
): Promise<string> {
  const { provider, from, calls, paymasterUrl } = params;

  console.log('[Paymaster] Sending sponsored transaction:', {
    from,
    callsCount: calls.length,
    paymasterUrl: paymasterUrl.substring(0, 50) + '...',
  });

  try {
    const result = await provider.request({
      method: 'wallet_sendCalls',
      params: [
        {
          version: '1.0',
          chainId: numberToHex(CHAIN_ID),
          from,
          calls,
          capabilities: {
            paymasterService: {
              url: paymasterUrl,
            },
          },
        },
      ],
    });

    console.log('[Paymaster] Transaction sent:', result);
    return result as string;
  } catch (error) {
    console.error('[Paymaster] Transaction failed:', error);
    throw error;
  }
}

/**
 * Check if paymaster is configured and available
 */
export function isPaymasterConfigured(): boolean {
  return !!getPaymasterUrl();
}
