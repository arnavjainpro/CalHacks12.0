/**
 * Admin hooks for managing healthcare provider applications
 */

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  useApplicationsByStatus,
  useApplication,
  useApproveApplication,
  useRejectApplication,
  useLinkCredential,
  Application,
  ApplicationStatus,
} from './useApplication';
import { fetchApplicationFromIPFS, ApplicationMetadata } from '@/lib/services/ipfsService';

export interface ApplicationWithMetadata {
  application: Application;
  metadata: ApplicationMetadata | null;
  isLoadingMetadata: boolean;
  metadataError: Error | null;
}

/**
 * Hook to get applications with their IPFS metadata loaded
 */
export function useApplicationsWithMetadata(
  status: ApplicationStatus,
  limit: number = 10,
  offset: number = 0
) {
  const { applicationIds, totalCount, isLoading, error, refetch } = useApplicationsByStatus(
    status,
    limit,
    offset
  );

  const [applicationsWithMetadata, setApplicationsWithMetadata] = useState<
    ApplicationWithMetadata[]
  >([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  useEffect(() => {
    if (!applicationIds || applicationIds.length === 0) {
      setApplicationsWithMetadata([]);
      return;
    }

    const loadApplicationsWithMetadata = async () => {
      setIsLoadingMetadata(true);

      const promises = applicationIds.map(async (id) => {
        try {
          // This would need to be fetched from the contract
          // For now, we'll need to fetch them individually
          // In a real implementation, you might want to batch these calls
          return {
            id,
            metadata: null,
            isLoadingMetadata: true,
            metadataError: null,
          };
        } catch (err) {
          return {
            id,
            metadata: null,
            isLoadingMetadata: false,
            metadataError: err as Error,
          };
        }
      });

      setIsLoadingMetadata(false);
    };

    loadApplicationsWithMetadata();
  }, [applicationIds]);

  return {
    applications: applicationsWithMetadata,
    applicationIds,
    totalCount,
    isLoading: isLoading || isLoadingMetadata,
    error,
    refetch,
  };
}

/**
 * Hook to get a single application with its IPFS metadata
 */
export function useApplicationWithMetadata(applicationId: bigint | undefined) {
  const { application, isLoading, error, refetch } = useApplication(applicationId);
  const [metadata, setMetadata] = useState<ApplicationMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<Error | null>(null);

  console.log('[useApplicationWithMetadata]', {
    applicationId: applicationId?.toString(),
    hasApplication: !!application,
    isLoading,
    error: error?.message,
    ipfsCid: application?.ipfsCid,
    hasMetadata: !!metadata,
    isLoadingMetadata,
    metadataError: metadataError?.message,
  });

  useEffect(() => {
    console.log('[useApplicationWithMetadata] Effect triggered:', {
      hasApplication: !!application,
      ipfsCid: application?.ipfsCid,
    });

    if (!application || !application.ipfsCid) {
      setMetadata(null);
      return;
    }

    const loadMetadata = async () => {
      console.log('[useApplicationWithMetadata] Loading metadata from IPFS:', application.ipfsCid);
      setIsLoadingMetadata(true);
      setMetadataError(null);

      try {
        const data = await fetchApplicationFromIPFS(application.ipfsCid);
        console.log('[useApplicationWithMetadata] Metadata loaded:', data);
        setMetadata(data);
      } catch (err) {
        console.error('[useApplicationWithMetadata] Failed to load metadata:', err);
        setMetadataError(err as Error);
        setMetadata(null);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [application?.ipfsCid]);

  return {
    application,
    metadata,
    isLoading: isLoading || isLoadingMetadata,
    error: error || metadataError,
    refetch,
  };
}

/**
 * Hook for admin approval workflow
 * Combines approve + credential issuance
 */
export function useAdminApproval() {
  const { approveApplication, isPending: isApproving, error: approveError } = useApproveApplication();
  const { linkCredential, isPending: isLinking, error: linkError } = useLinkCredential();

  const [currentStep, setCurrentStep] = useState<'idle' | 'approving' | 'linking' | 'complete'>('idle');

  const approveAndLinkCredential = async (
    applicationId: bigint,
    credentialTokenId: bigint
  ) => {
    try {
      setCurrentStep('approving');
      await approveApplication(applicationId);

      setCurrentStep('linking');
      await linkCredential(applicationId, credentialTokenId);

      setCurrentStep('complete');
      return true;
    } catch (err) {
      setCurrentStep('idle');
      throw err;
    }
  };

  const reset = () => {
    setCurrentStep('idle');
  };

  return {
    approveAndLinkCredential,
    currentStep,
    isPending: isApproving || isLinking,
    error: approveError || linkError,
    reset,
  };
}

/**
 * Hook to batch fetch applications by IDs
 */
export function useBatchApplications(applicationIds: bigint[]) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!applicationIds || applicationIds.length === 0) {
      setApplications([]);
      return;
    }

    // In a real implementation, this would batch fetch from the contract
    // For now, this is a placeholder structure
    setIsLoading(false);
  }, [applicationIds]);

  return {
    applications,
    isLoading,
    error,
  };
}

/**
 * Hook to check if current user is admin (contract owner)
 */
export function useIsAdmin() {
  const { address } = useAccount();

  // TODO: Fetch contract owner from ApplicationRegistry
  // For now, return true if connected
  // In production, compare address with contract.owner()

  return {
    isAdmin: !!address,
    isLoading: false,
  };
}

/**
 * Export status enum for convenience
 */
export { ApplicationStatus };
