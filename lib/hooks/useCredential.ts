import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS, CredentialType, type Credential } from '@/lib/contracts/config';
import { Address } from 'viem';
import { useEffect } from 'react';
import { useSponsoredWrite } from './useSponsoredWrite';

/**
 * Hook to get the current user's credential
 */
export function useMyCredential() {
  const { address } = useAccount();

  // First, try to get the token ID for this address
  const { data: tokenId } = useReadContract({
    address: CONTRACTS.MedicalCredentialSBT.address,
    abi: CONTRACTS.MedicalCredentialSBT.abi,
    functionName: 'getHolderTokenId',
    args: [address!],
    query: {
      enabled: !!address,
    },
  });

  // Then get the credential using the token ID
  const { data: credential, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.MedicalCredentialSBT.address,
    abi: CONTRACTS.MedicalCredentialSBT.abi,
    functionName: 'getCredential',
    args: [tokenId!],
    query: {
      enabled: !!address && !!tokenId && tokenId > 0n,
    },
  });

  useEffect(() => {
    console.log('[useMyCredential] Address:', address);
    console.log('[useMyCredential] Token ID from mapping:', tokenId?.toString());
    console.log('[useMyCredential] Loading:', isLoading);
    console.log('[useMyCredential] Error:', error);
    console.log('[useMyCredential] Credential:', credential);
    if (credential) {
      const cred = credential as Credential;
      console.log('[useMyCredential] Credential Type:', cred.credentialType === CredentialType.Doctor ? 'Doctor' : cred.credentialType === CredentialType.Pharmacist ? 'Pharmacist' : 'Unknown');
      console.log('[useMyCredential] Is Active:', cred.isActive);
      console.log('[useMyCredential] Expires At:', new Date(Number(cred.expiresAt) * 1000).toISOString());
      console.log('[useMyCredential] Specialty:', cred.specialty);
    }
  }, [address, tokenId, credential, isLoading, error]);

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

  useEffect(() => {
    console.log('[useHasValidCredential] Address:', address);
    console.log('[useHasValidCredential] Checking Type:', credentialType === CredentialType.Doctor ? 'Doctor' : credentialType === CredentialType.Pharmacist ? 'Pharmacist' : 'Undefined');
    console.log('[useHasValidCredential] Loading:', isLoading);
    console.log('[useHasValidCredential] Has Valid Credential:', hasValidCredential);
  }, [address, credentialType, hasValidCredential, isLoading]);

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
 * Now with sponsored gas support via Paymaster
 */
export function useIssueCredential() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();

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
 * Now with sponsored gas support via Paymaster
 */
export function useRevokeCredential() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();

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
