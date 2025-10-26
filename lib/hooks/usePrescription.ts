import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { CONTRACTS, type Prescription, PrescriptionStatus } from '@/lib/contracts/config';
import { useEffect, useState } from 'react';
import { parseEventLogs } from 'viem';
import { useSponsoredWrite } from './useSponsoredWrite';
import { fetchFromIPFS, type PrescriptionMetadata } from '@/lib/utils/ipfs';

/**
 * Hook to create a prescription (doctor only)
 * Now with sponsored gas support via Paymaster
 */
export function useCreatePrescription() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();
  const publicClient = usePublicClient();

  const createPrescription = async (
    patientDataHash: `0x${string}`,
    prescriptionDataHash: `0x${string}`,
    ipfsCid: string,
    validityDays: bigint,
    patientSecret: `0x${string}`
  ) => {
    console.log('[useCreatePrescription] Creating prescription with:');
    console.log('  - Patient Data Hash:', patientDataHash);
    console.log('  - Prescription Data Hash:', prescriptionDataHash);
    console.log('  - IPFS CID:', ipfsCid);
    console.log('  - Validity Days:', validityDays.toString());
    console.log('  - Patient Secret:', patientSecret);

    try {
      const txHash = await writeContractAsync({
        address: CONTRACTS.PrescriptionRegistry.address,
        abi: CONTRACTS.PrescriptionRegistry.abi,
        functionName: 'createPrescription',
        args: [patientDataHash, prescriptionDataHash, ipfsCid, validityDays, patientSecret],
      });
      console.log('[useCreatePrescription] Transaction hash:', txHash);

      // Wait for transaction receipt
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log('[useCreatePrescription] Transaction mined:', receipt);

      // Parse the PrescriptionCreated event from logs
      const logs = parseEventLogs({
        abi: CONTRACTS.PrescriptionRegistry.abi,
        logs: receipt.logs,
        eventName: 'PrescriptionCreated',
      });

      if (logs.length === 0) {
        throw new Error('PrescriptionCreated event not found in transaction logs');
      }

      const prescriptionId = (logs[0] as any).args.prescriptionId as bigint;
      console.log('[useCreatePrescription] Prescription ID:', prescriptionId.toString());

      return prescriptionId;
    } catch (err) {
      console.error('[useCreatePrescription] Error creating prescription:', err);
      throw err;
    }
  };

  return {
    createPrescription,
    isPending,
    error,
  };
}

/**
 * Hook to get doctor's own prescriptions
 */
export function useMyPrescriptions() {
  const { address } = useAccount();

  const { data: prescriptionIds, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'getMyPrescriptions',
    account: address,
    query: {
      enabled: !!address,
    },
  });

  useEffect(() => {
    console.log('[useMyPrescriptions] Address:', address);
    console.log('[useMyPrescriptions] Loading:', isLoading);
    console.log('[useMyPrescriptions] Error:', error);
    console.log('[useMyPrescriptions] Prescription IDs:', prescriptionIds);
    if (prescriptionIds) {
      console.log('[useMyPrescriptions] Count:', (prescriptionIds as bigint[]).length);
    }
  }, [address, prescriptionIds, isLoading, error]);

  return {
    prescriptionIds: prescriptionIds as bigint[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get pharmacist's own dispensals
 */
export function useMyDispensals() {
  const { address } = useAccount();

  const { data: dispensalIds, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'getMyDispensals',
    account: address,
    query: {
      enabled: !!address,
    },
  });

  return {
    dispensalIds: dispensalIds as bigint[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get prescription as doctor
 */
export function usePrescriptionAsDoctor(prescriptionId?: bigint) {
  const { address } = useAccount();

  const { data: prescription, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'getPrescriptionAsDoctor',
    args: [prescriptionId!],
    account: address,
    query: {
      enabled: !!address && !!prescriptionId && prescriptionId > 0n,
    },
  });

  return {
    prescription: prescription as Prescription | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get prescription with patient proof (no wallet required)
 */
export function usePrescriptionWithProof(
  prescriptionId?: bigint,
  patientSecret?: `0x${string}`
) {
  const { data: prescription, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'getPrescriptionWithProof',
    args: [prescriptionId!, patientSecret!],
    query: {
      enabled: !!prescriptionId && !!patientSecret && prescriptionId > 0n,
    },
  });

  return {
    prescription: prescription as Prescription | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to verify prescription for dispensing (pharmacist)
 */
export function useVerifyPrescription(
  prescriptionId?: bigint,
  patientHash?: `0x${string}`,
  prescriptionHash?: `0x${string}`
) {
  const { address } = useAccount();

  const { data: prescription, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'verifyPrescriptionForDispensing',
    args: [prescriptionId!, patientHash!, prescriptionHash!],
    account: address,
    query: {
      enabled:
        !!address &&
        !!prescriptionId &&
        !!patientHash &&
        !!prescriptionHash &&
        prescriptionId > 0n,
    },
  });

  useEffect(() => {
    console.log('[useVerifyPrescription] Pharmacist Address:', address);
    console.log('[useVerifyPrescription] Prescription ID:', prescriptionId?.toString());
    console.log('[useVerifyPrescription] Patient Hash:', patientHash);
    console.log('[useVerifyPrescription] Prescription Hash:', prescriptionHash);
    console.log('[useVerifyPrescription] Loading:', isLoading);
    console.log('[useVerifyPrescription] Error:', error);
    console.log('[useVerifyPrescription] Verified Prescription:', prescription);
  }, [address, prescriptionId, patientHash, prescriptionHash, isLoading, error, prescription]);

  return {
    prescription: prescription as Prescription | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check if prescription is dispensable
 */
export function useIsPrescriptionDispensable(
  prescriptionId?: bigint,
  patientHash?: `0x${string}`,
  prescriptionHash?: `0x${string}`
) {
  const { address } = useAccount();

  const { data: isDispensable, isLoading } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'isPrescriptionDispensable',
    args: [prescriptionId!, patientHash!, prescriptionHash!],
    query: {
      enabled:
        !!address &&
        !!prescriptionId &&
        !!patientHash &&
        !!prescriptionHash &&
        prescriptionId > 0n,
    },
  });

  return {
    isDispensable: isDispensable as boolean | undefined,
    isLoading,
  };
}

/**
 * Hook to dispense a prescription (pharmacist only)
 * Now with sponsored gas support via Paymaster
 */
export function useDispensePrescription() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();

  const dispensePrescription = async (
    prescriptionId: bigint,
    providedPatientHash: `0x${string}`,
    providedPrescriptionHash: `0x${string}`
  ) => {
    console.log('[useDispensePrescription] Dispensing prescription:');
    console.log('  - Prescription ID:', prescriptionId.toString());
    console.log('  - Patient Hash:', providedPatientHash);
    console.log('  - Prescription Hash:', providedPrescriptionHash);

    try {
      const result = await writeContractAsync({
        address: CONTRACTS.PrescriptionRegistry.address,
        abi: CONTRACTS.PrescriptionRegistry.abi,
        functionName: 'dispensePrescription',
        args: [prescriptionId, providedPatientHash, providedPrescriptionHash],
      });
      console.log('[useDispensePrescription] Success! Transaction hash:', result);
      return result;
    } catch (err) {
      console.error('[useDispensePrescription] Error dispensing prescription:', err);
      throw err;
    }
  };

  return {
    dispensePrescription,
    isPending,
    error,
  };
}

/**
 * Hook to cancel a prescription (doctor only)
 * Now with sponsored gas support via Paymaster
 */
export function useCancelPrescription() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();

  const cancelPrescription = async (prescriptionId: bigint, reason: string) => {
    return await writeContractAsync({
      address: CONTRACTS.PrescriptionRegistry.address,
      abi: CONTRACTS.PrescriptionRegistry.abi,
      functionName: 'cancelPrescription',
      args: [prescriptionId, reason],
    });
  };

  return {
    cancelPrescription,
    isPending,
    error,
  };
}

/**
 * Hook to get total prescriptions
 */
export function useTotalPrescriptions() {
  const { data: totalPrescriptions, isLoading } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'totalPrescriptions',
  });

  return {
    totalPrescriptions: totalPrescriptions as bigint | undefined,
    isLoading,
  };
}

/**
 * Hook to batch get prescription statuses
 */
export function useBatchPrescriptionStatus(prescriptionIds: bigint[]) {
  const { data: statuses, isLoading } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'batchGetPrescriptionStatus',
    args: [prescriptionIds],
    query: {
      enabled: prescriptionIds.length > 0,
    },
  });

  return {
    statuses: statuses as PrescriptionStatus[] | undefined,
    isLoading,
  };
}

/**
 * Hook to get patient prescription history (doctor only, for abuse detection)
 */
export function usePatientPrescriptionHistory(patientDataHash?: `0x${string}`) {
  const { address } = useAccount();

  const { data: prescriptionIds, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'getPatientPrescriptionHistory',
    args: [patientDataHash!],
    account: address,
    query: {
      enabled: !!address && !!patientDataHash && patientDataHash !== '0x',
    },
  });

  return {
    prescriptionIds: prescriptionIds as bigint[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get prescription as pharmacist using verification
 * This requires both patient hash and prescription hash for security
 */
export function usePrescriptionAsPharmacist(
  prescriptionId?: bigint,
  patientHash?: `0x${string}`,
  prescriptionHash?: `0x${string}`
) {
  const { address } = useAccount();

  const { data: prescription, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'verifyPrescriptionForDispensing',
    args: [prescriptionId!, patientHash!, prescriptionHash!],
    account: address,
    query: {
      enabled:
        !!address &&
        !!prescriptionId &&
        !!patientHash &&
        !!prescriptionHash &&
        prescriptionId > 0n &&
        patientHash !== '0x' &&
        prescriptionHash !== '0x',
    },
  });

  return {
    prescription: prescription as Prescription | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Extended Prescription type with IPFS metadata
 */
export interface PrescriptionWithMetadata extends Prescription {
  metadata?: PrescriptionMetadata;
}

/**
 * Hook to batch get full prescription details by IDs
 * This is for doctors/pharmacists who have access to patient history
 * Now fetches IPFS metadata for complete prescription information
 */
export function useBatchPrescriptionDetails(prescriptionIds: bigint[]) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [prescriptions, setPrescriptions] = useState<PrescriptionWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Convert array to string for stable comparison
  const idsKey = prescriptionIds.map(id => id.toString()).join(',');

  useEffect(() => {
    const fetchPrescriptions = async () => {
      if (!prescriptionIds || prescriptionIds.length === 0 || !publicClient || !address) {
        setPrescriptions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          prescriptionIds.map(async (id) => {
            try {
              // Try to read as doctor first
              const result = await publicClient.readContract({
                address: CONTRACTS.PrescriptionRegistry.address,
                abi: CONTRACTS.PrescriptionRegistry.abi,
                functionName: 'getPrescriptionAsDoctor',
                args: [id],
                account: address,
              });
              const prescription = result as Prescription;

              // Fetch IPFS metadata if CID exists
              if (prescription.ipfsCid && prescription.ipfsCid !== '') {
                try {
                  console.log(`[useBatchPrescriptionDetails] Fetching IPFS data for CID: ${prescription.ipfsCid}`);
                  const metadata = await fetchFromIPFS<PrescriptionMetadata>(prescription.ipfsCid);
                  console.log(`[useBatchPrescriptionDetails] Metadata fetched:`, metadata);
                  return { ...prescription, metadata } as PrescriptionWithMetadata;
                } catch (ipfsErr) {
                  console.warn(`Failed to fetch IPFS data for prescription ${id}:`, ipfsErr);
                  // Return prescription without metadata if IPFS fetch fails
                  return prescription as PrescriptionWithMetadata;
                }
              }

              return prescription as PrescriptionWithMetadata;
            } catch (err) {
              console.warn(`Failed to fetch prescription ${id}:`, err);
              return null;
            }
          })
        );

        // Filter out failed fetches
        const validPrescriptions = results.filter((p): p is PrescriptionWithMetadata => p !== null);
        console.log(`[useBatchPrescriptionDetails] Fetched ${validPrescriptions.length} prescriptions with metadata`);
        setPrescriptions(validPrescriptions);
      } catch (err) {
        console.error('Error fetching prescriptions:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, publicClient, address]); // Use idsKey instead of prescriptionIds array

  return {
    prescriptions,
    isLoading,
    error,
  };
}
