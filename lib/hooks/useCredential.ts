import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { CONTRACTS, CredentialType, type Credential } from '@/lib/contracts/config';
import { Address } from 'viem';

/**
 * Hook to get the current user's credential
 */
export function useMyCredential() {
  const { address } = useAccount();

  const { data: credential, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.MedicalCredentialSBT.address,
    abi: CONTRACTS.MedicalCredentialSBT.abi,
    functionName: 'getMyCredential',
    query: {
      enabled: !!address,
    },
  });

  return {
    credential: credential as Credential | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check if user has a valid credential of a specific type
 */
export function useHasValidCredential(credentialType?: CredentialType) {
  const { address } = useAccount();

  const { data: hasValidCredential, isLoading } = useReadContract({
    address: CONTRACTS.MedicalCredentialSBT.address,
    abi: CONTRACTS.MedicalCredentialSBT.abi,
    functionName: 'hasValidCredential',
    args: [address!, credentialType ?? CredentialType.Doctor],
    query: {
      enabled: !!address && credentialType !== undefined,
    },
  });

  return {
    hasValidCredential: hasValidCredential as boolean | undefined,
    isLoading,
  };
}

/**
 * Hook to get credential by token ID
 */
export function useCredentialByTokenId(tokenId?: bigint) {
  const { data: credential, isLoading, error } = useReadContract({
    address: CONTRACTS.MedicalCredentialSBT.address,
    abi: CONTRACTS.MedicalCredentialSBT.abi,
    functionName: 'getCredential',
    args: [tokenId!],
    query: {
      enabled: !!tokenId && tokenId > 0n,
    },
  });

  return {
    credential: credential as Credential | undefined,
    isLoading,
    error,
  };
}

/**
 * Hook to issue a new credential (admin only)
 */
export function useIssueCredential() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const issueCredential = async (
    holder: Address,
    credentialType: CredentialType,
    licenseHash: string,
    specialty: string,
    metadataURI: string,
    validityYears: bigint
  ) => {
    return await writeContractAsync({
      address: CONTRACTS.MedicalCredentialSBT.address,
      abi: CONTRACTS.MedicalCredentialSBT.abi,
      functionName: 'issueCredential',
      args: [holder, credentialType, licenseHash, specialty, metadataURI, validityYears],
    });
  };

  return {
    issueCredential,
    isPending,
    error,
  };
}

/**
 * Hook to revoke a credential (admin only)
 */
export function useRevokeCredential() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const revokeCredential = async (tokenId: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.MedicalCredentialSBT.address,
      abi: CONTRACTS.MedicalCredentialSBT.abi,
      functionName: 'revokeCredential',
      args: [tokenId],
    });
  };

  return {
    revokeCredential,
    isPending,
    error,
  };
}

/**
 * Hook to get total supply of credentials
 */
export function useTotalCredentials() {
  const { data: totalSupply, isLoading } = useReadContract({
    address: CONTRACTS.MedicalCredentialSBT.address,
    abi: CONTRACTS.MedicalCredentialSBT.abi,
    functionName: 'totalSupply',
  });

  return {
    totalSupply: totalSupply as bigint | undefined,
    isLoading,
  };
}

/**
 * Hook to check if a credential is valid
 */
export function useIsCredentialValid(tokenId?: bigint) {
  const { data: isValid, isLoading } = useReadContract({
    address: CONTRACTS.MedicalCredentialSBT.address,
    abi: CONTRACTS.MedicalCredentialSBT.abi,
    functionName: 'isCredentialValid',
    args: [tokenId!],
    query: {
      enabled: !!tokenId && tokenId > 0n,
    },
  });

  return {
    isValid: isValid as boolean | undefined,
    isLoading,
  };
}
