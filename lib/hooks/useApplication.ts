/**
 * React hooks for interacting with ApplicationRegistry contract
 * Wallet-based application system - no email required
 */

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import {
  uploadApplicationToIPFS,
  uploadDocumentToIPFS,
  fetchApplicationFromIPFS,
  type ApplicationMetadata,
  type IPFSUploadResult,
} from '@/lib/services/ipfsService';
import { ApplicationFormData } from '@/lib/constants/applicationSchema';
import { useSponsoredWrite } from './useSponsoredWrite';
import ApplicationRegistryABI from '@/lib/contracts/ApplicationRegistryABI.json';

const APPLICATION_REGISTRY_ADDRESS = process.env
  .NEXT_PUBLIC_APPLICATION_REGISTRY_ADDRESS as `0x${string}`;

// Application status enum (matches Solidity)
export enum ApplicationStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  CredentialIssued = 3,
}

// Credential type enum (matches Solidity)
export enum CredentialType {
  Doctor = 0,
  Pharmacist = 1,
}

export interface Application {
  applicationId: bigint;
  applicant: `0x${string}`;
  ipfsCid: string;
  credentialType: number;
  status: number;
  submittedAt: bigint;
  reviewedAt: bigint;
  reviewedBy: `0x${string}`;
  credentialTokenId: bigint;
  rejectionReason: string;
}

// Use the full ABI from the JSON file
const applicationRegistryABI = ApplicationRegistryABI;

/**
 * Submit a new application
 */
export function useSubmitApplication() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const submitApplication = async (formData: ApplicationFormData) => {
    try {
      setIsUploading(true);
      setUploadError(null);

      // Generate unique application ID
      const applicationId = `app-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Upload documents to IPFS first
      const documentCIDs: { licenseDocument?: string; employmentProof?: string } = {};

      if (formData.licenseDocument) {
        const result = await uploadDocumentToIPFS(formData.licenseDocument, {
          applicationId,
          documentType: 'license',
        });
        documentCIDs.licenseDocument = result.cid;
      }

      if (formData.employmentProof) {
        const result = await uploadDocumentToIPFS(formData.employmentProof, {
          applicationId,
          documentType: 'employment',
        });
        documentCIDs.employmentProof = result.cid;
      }

      // Prepare metadata (NO EMAIL)
      const metadata: ApplicationMetadata = {
        applicationId,
        personalInfo: {
          fullName: formData.fullName,
          phone: formData.phone || '',
        },
        credentials: {
          licenseNumber: formData.licenseNumber, // PLAINTEXT for admin verification
          specialty: formData.specialty,
          institution: formData.institution,
          credentialType: formData.credentialType,
        },
        documents: documentCIDs,
        submittedAt: Date.now(),
      };

      // Upload metadata to IPFS
      const { cid } = await uploadApplicationToIPFS(metadata);

      // Submit to blockchain
      const credentialTypeEnum =
        formData.credentialType === 'Doctor' ? CredentialType.Doctor : CredentialType.Pharmacist;

      const txHash = await writeContractAsync({
        address: APPLICATION_REGISTRY_ADDRESS,
        abi: applicationRegistryABI,
        functionName: 'submitApplication',
        args: [cid, credentialTypeEnum],
      });

      setHash(txHash);
      setIsUploading(false);
    } catch (err) {
      console.error('Application submission error:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to submit application');
      setIsUploading(false);
      throw err;
    }
  };

  return {
    submitApplication,
    isUploading: isUploading || isPending || isConfirming,
    isSuccess,
    error: uploadError || (error?.message ?? null),
    hash,
  };
}

/**
 * Get current user's application (if any)
 */
export function useMyApplication() {
  const { address } = useAccount();

  const {
    data: application,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: APPLICATION_REGISTRY_ADDRESS,
    abi: applicationRegistryABI,
    functionName: 'getApplicationByApplicant',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const [metadata, setMetadata] = useState<ApplicationMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Type-safe application data
  const typedApplication = application as Application | undefined;

  useEffect(() => {
    if (typedApplication && typedApplication.ipfsCid) {
      setIsLoadingMetadata(true);
      fetchApplicationFromIPFS(typedApplication.ipfsCid)
        .then(setMetadata)
        .catch((err) => {
          console.error('Failed to fetch IPFS metadata:', err);
          setMetadata(null);
        })
        .finally(() => setIsLoadingMetadata(false));
    }
  }, [typedApplication]);

  return {
    application: typedApplication,
    metadata,
    isLoading: isLoading || isLoadingMetadata,
    error,
    refetch,
  };
}

/**
 * Get application by ID (admin use)
 */
export function useApplication(applicationId: bigint | undefined) {
  const {
    data: application,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: APPLICATION_REGISTRY_ADDRESS,
    abi: applicationRegistryABI,
    functionName: 'getApplication',
    args: applicationId !== undefined ? [applicationId] : undefined,
    query: {
      enabled: applicationId !== undefined,
    },
  });

  const [metadata, setMetadata] = useState<ApplicationMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Type-safe application data
  const typedApplication = application as Application | undefined;

  useEffect(() => {
    if (typedApplication && typedApplication.ipfsCid) {
      setIsLoadingMetadata(true);
      fetchApplicationFromIPFS(typedApplication.ipfsCid)
        .then(setMetadata)
        .catch(console.error)
        .finally(() => setIsLoadingMetadata(false));
    }
  }, [typedApplication]);

  return {
    application: typedApplication,
    metadata,
    isLoading: isLoading || isLoadingMetadata,
    error,
    refetch,
  };
}

/**
 * Get application by address (admin use)
 */
export function useApplicationByAddress(address: `0x${string}` | undefined) {
  const {
    data: application,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: APPLICATION_REGISTRY_ADDRESS,
    abi: applicationRegistryABI,
    functionName: 'getApplicationByApplicant',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const [metadata, setMetadata] = useState<ApplicationMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Type-safe application data
  const typedApplication = application as Application | undefined;

  useEffect(() => {
    if (typedApplication && typedApplication.ipfsCid) {
      setIsLoadingMetadata(true);
      fetchApplicationFromIPFS(typedApplication.ipfsCid)
        .then(setMetadata)
        .catch(console.error)
        .finally(() => setIsLoadingMetadata(false));
    }
  }, [typedApplication]);

  return {
    application: typedApplication,
    metadata,
    isLoading: isLoading || isLoadingMetadata,
    error,
    refetch,
  };
}

/**
 * Check if current user has an application
 */
export function useHasApplication() {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContract({
    address: APPLICATION_REGISTRY_ADDRESS,
    abi: applicationRegistryABI,
    functionName: 'hasApplication',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    hasApplication: data ?? false,
    isLoading,
    error,
  };
}

/**
 * Get applications by status (for admin dashboard)
 */
export function useApplicationsByStatus(
  status: ApplicationStatus,
  limit: number = 10,
  offset: number = 0
) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: APPLICATION_REGISTRY_ADDRESS,
    abi: applicationRegistryABI,
    functionName: 'getApplicationIdsByStatus',
    args: [status, BigInt(limit), BigInt(offset)],
  });

  const [applicationIds, totalCount] = (data as [bigint[], bigint]) || [[], BigInt(0)];

  return {
    applicationIds,
    totalCount: Number(totalCount),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Approve application (admin only)
 */
export function useApproveApplication() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approveApplication = async (applicationId: bigint) => {
    const txHash = await writeContractAsync({
      address: APPLICATION_REGISTRY_ADDRESS,
      abi: applicationRegistryABI,
      functionName: 'approveApplication',
      args: [applicationId],
    });
    setHash(txHash);
  };

  return {
    approveApplication,
    isPending: isPending || isConfirming,
    isSuccess,
    error: error?.message ?? null,
    hash,
  };
}

/**
 * Reject application (admin only)
 */
export function useRejectApplication() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const rejectApplication = async (applicationId: bigint, reason: string) => {
    const txHash = await writeContractAsync({
      address: APPLICATION_REGISTRY_ADDRESS,
      abi: applicationRegistryABI,
      functionName: 'rejectApplication',
      args: [applicationId, reason],
    });
    setHash(txHash);
  };

  return {
    rejectApplication,
    isPending: isPending || isConfirming,
    isSuccess,
    error: error?.message ?? null,
    hash,
  };
}

/**
 * Link credential to application (admin only)
 */
export function useLinkCredential() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const linkCredential = async (applicationId: bigint, credentialTokenId: bigint) => {
    const txHash = await writeContractAsync({
      address: APPLICATION_REGISTRY_ADDRESS,
      abi: applicationRegistryABI,
      functionName: 'linkCredentialToApplication',
      args: [applicationId, credentialTokenId],
    });
    setHash(txHash);
  };

  return {
    linkCredential,
    isPending: isPending || isConfirming,
    isSuccess,
    error: error?.message ?? null,
    hash,
  };
}

/**
 * Reapply after rejection
 */
export function useReapply() {
  const { writeContractAsync, isPending, error } = useSponsoredWrite();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const reapply = async (formData: ApplicationFormData) => {
    try {
      setIsUploading(true);
      setUploadError(null);

      // Generate unique application ID
      const applicationId = `app-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Upload documents to IPFS
      const documentCIDs: { licenseDocument?: string; employmentProof?: string } = {};

      if (formData.licenseDocument) {
        const result = await uploadDocumentToIPFS(formData.licenseDocument, {
          applicationId,
          documentType: 'license',
        });
        documentCIDs.licenseDocument = result.cid;
      }

      if (formData.employmentProof) {
        const result = await uploadDocumentToIPFS(formData.employmentProof, {
          applicationId,
          documentType: 'employment',
        });
        documentCIDs.employmentProof = result.cid;
      }

      // Prepare metadata
      const metadata: ApplicationMetadata = {
        applicationId,
        personalInfo: {
          fullName: formData.fullName,
          phone: formData.phone || '',
        },
        credentials: {
          licenseNumber: formData.licenseNumber,
          specialty: formData.specialty,
          institution: formData.institution,
          credentialType: formData.credentialType,
        },
        documents: documentCIDs,
        submittedAt: Date.now(),
      };

      // Upload metadata to IPFS
      const { cid } = await uploadApplicationToIPFS(metadata);

      // Reapply on blockchain
      const credentialTypeEnum =
        formData.credentialType === 'Doctor' ? CredentialType.Doctor : CredentialType.Pharmacist;

      const txHash = await writeContractAsync({
        address: APPLICATION_REGISTRY_ADDRESS,
        abi: applicationRegistryABI,
        functionName: 'reapply',
        args: [cid, credentialTypeEnum],
      });

      setHash(txHash);
      setIsUploading(false);
    } catch (err) {
      console.error('Reapplication error:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to reapply');
      setIsUploading(false);
      throw err;
    }
  };

  return {
    reapply,
    isUploading: isUploading || isPending || isConfirming,
    isSuccess,
    error: uploadError || (error?.message ?? null),
    hash,
  };
}

/**
 * Get total number of applications
 */
export function useTotalApplications() {
  const { data, isLoading, error } = useReadContract({
    address: APPLICATION_REGISTRY_ADDRESS,
    abi: applicationRegistryABI,
    functionName: 'getTotalApplications',
  });

  return {
    totalApplications: data ? Number(data) : 0,
    isLoading,
    error,
  };
}
