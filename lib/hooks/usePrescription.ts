import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { CONTRACTS, type Prescription, PrescriptionStatus } from '@/lib/contracts/config';

/**
 * Hook to create a prescription (doctor only)
 */
export function useCreatePrescription() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const createPrescription = async (
    patientDataHash: `0x${string}`,
    prescriptionDataHash: `0x${string}`,
    ipfsCid: string,
    validityDays: bigint,
    patientSecret: `0x${string}`
  ) => {
    return await writeContractAsync({
      address: CONTRACTS.PrescriptionRegistry.address,
      abi: CONTRACTS.PrescriptionRegistry.abi,
      functionName: 'createPrescription',
      args: [patientDataHash, prescriptionDataHash, ipfsCid, validityDays, patientSecret],
    });
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
    query: {
      enabled: !!address,
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
 * Hook to get pharmacist's own dispensals
 */
export function useMyDispensals() {
  const { address } = useAccount();

  const { data: dispensalIds, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.PrescriptionRegistry.address,
    abi: CONTRACTS.PrescriptionRegistry.abi,
    functionName: 'getMyDispensals',
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
 */
export function useDispensePrescription() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const dispensePrescription = async (
    prescriptionId: bigint,
    providedPatientHash: `0x${string}`,
    providedPrescriptionHash: `0x${string}`
  ) => {
    return await writeContractAsync({
      address: CONTRACTS.PrescriptionRegistry.address,
      abi: CONTRACTS.PrescriptionRegistry.abi,
      functionName: 'dispensePrescription',
      args: [prescriptionId, providedPatientHash, providedPrescriptionHash],
    });
  };

  return {
    dispensePrescription,
    isPending,
    error,
  };
}

/**
 * Hook to cancel a prescription (doctor only)
 */
export function useCancelPrescription() {
  const { writeContractAsync, isPending, error } = useWriteContract();

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
