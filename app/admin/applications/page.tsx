"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletStatus } from '@/components/WalletStatus';
import { ApplicationStatus, useApplicationsByStatus, useApplication } from '@/lib/hooks/useApplication';
import { useApplicationWithMetadata } from '@/lib/hooks/useAdminApplications';
import { ApplicationDetailModal } from '@/components/admin/ApplicationDetailModal';
import { RejectApplicationModal } from '@/components/admin/RejectApplicationModal';
import { ApproveApplicationFlow } from '@/components/admin/ApproveApplicationFlow';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'issued' | 'all';

export default function ApplicationsReviewPage() {
  const { address, isConnected } = useAccount();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedApplicationId, setSelectedApplicationId] = useState<bigint | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveFlow, setShowApproveFlow] = useState(false);

  // Determine which status to fetch based on filter
  const getStatusForFilter = (filter: StatusFilter): ApplicationStatus | undefined => {
    switch (filter) {
      case 'pending':
        return ApplicationStatus.Pending;
      case 'approved':
        return ApplicationStatus.Approved;
      case 'rejected':
        return ApplicationStatus.Rejected;
      case 'issued':
        return ApplicationStatus.CredentialIssued;
      default:
        return undefined;
    }
  };

  const status = getStatusForFilter(statusFilter);
  const {
    applicationIds,
    totalCount,
    isLoading,
    error,
    refetch,
  } = useApplicationsByStatus(status !== undefined ? status : ApplicationStatus.Pending, 50, 0);

  // Get selected application details
  const {
    application: selectedApp,
    metadata: selectedMetadata,
    isLoading: isLoadingDetails,
    error: detailsError
  } = useApplicationWithMetadata(
    selectedApplicationId || undefined
  );

  const handleViewDetails = (applicationId: bigint) => {
    console.log('[Admin Applications] View Details clicked for:', applicationId.toString());
    setSelectedApplicationId(applicationId);
    setShowDetailModal(true);
  };

  // Debug logging
  console.log('[Admin Applications] State:', {
    selectedApplicationId: selectedApplicationId?.toString(),
    hasSelectedApp: !!selectedApp,
    hasSelectedMetadata: !!selectedMetadata,
    isLoadingDetails,
    detailsError: detailsError?.message,
    showDetailModal,
  });

  const handleApprove = () => {
    setShowDetailModal(false);
    setShowApproveFlow(true);
  };

  const handleReject = () => {
    setShowDetailModal(false);
    setShowRejectModal(true);
  };

  const handleSuccess = () => {
    refetch();
    setSelectedApplicationId(null);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              MedChain
            </Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Please connect your admin wallet to access the applications dashboard.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              MedChain
            </Link>
            <nav className="flex gap-4">
              <Link
                href="/admin"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/applications"
                className="text-sm text-blue-600 dark:text-blue-400 font-medium"
              >
                Applications
              </Link>
            </nav>
          </div>
          <WalletStatus />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
              Application Review
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Review and manage healthcare provider credential applications
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[
              { id: 'pending' as const, label: 'Pending', color: 'yellow' },
              { id: 'approved' as const, label: 'Approved', color: 'green' },
              { id: 'rejected' as const, label: 'Rejected', color: 'red' },
              { id: 'issued' as const, label: 'Credential Issued', color: 'blue' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? `bg-${tab.color}-600 text-white`
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Applications List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Applications ({totalCount})
                </h2>
                <button
                  onClick={() => refetch()}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Loading applications...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="text-red-600 dark:text-red-400">Error loading applications</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Try Again
                  </button>
                </div>
              ) : !applicationIds || applicationIds.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-300">No applications found</p>
                </div>
              ) : (
                applicationIds.map((appId) => (
                  <ApplicationListItem
                    key={appId.toString()}
                    applicationId={appId}
                    onViewDetails={() => handleViewDetails(appId)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showDetailModal && selectedApplicationId && (
        <>
          {detailsError ? (
            // Error modal
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-8 shadow-xl max-w-lg w-full">
                <div className="text-center">
                  <div className="text-red-600 dark:text-red-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-red-600 dark:text-red-400 mb-4">
                    Failed to load application details
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {detailsError.message || 'An error occurred'}
                  </p>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedApplicationId(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : isLoadingDetails || !selectedApp || !selectedMetadata ? (
            // Loading modal
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-8 shadow-xl max-w-lg w-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Loading application details...</p>
                </div>
              </div>
            </div>
          ) : (
            // Application detail modal
            <ApplicationDetailModal
              application={selectedApp}
              metadata={selectedMetadata}
              isOpen={showDetailModal}
              onClose={() => {
                setShowDetailModal(false);
                setSelectedApplicationId(null);
              }}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApp && selectedMetadata && (
        <RejectApplicationModal
          applicationId={selectedApp.applicationId}
          applicantName={selectedMetadata.personalInfo.fullName}
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedApplicationId(null);
          }}
          onSuccess={handleSuccess}
        />
      )}

      {/* Approve Flow */}
      {showApproveFlow && selectedApp && selectedMetadata && (
        <ApproveApplicationFlow
          application={selectedApp}
          metadata={selectedMetadata}
          isOpen={showApproveFlow}
          onClose={() => {
            setShowApproveFlow(false);
            setSelectedApplicationId(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function ApplicationListItem({
  applicationId,
  onViewDetails,
}: {
  applicationId: bigint;
  onViewDetails: () => void;
}) {
  const { application, metadata, isLoading } = useApplicationWithMetadata(applicationId);

  if (isLoading || !application) {
    return (
      <div className="p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = {
    [ApplicationStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    [ApplicationStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    [ApplicationStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
    [ApplicationStatus.CredentialIssued]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
  }[application.status];

  const credentialTypeLabel = application.credentialType === 0 ? 'Doctor' : 'Pharmacist';

  return (
    <div className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer" onClick={onViewDetails}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {metadata?.personalInfo.fullName || 'Loading...'}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
              {application.status === ApplicationStatus.Pending
                ? 'Pending'
                : application.status === ApplicationStatus.Approved
                ? 'Approved'
                : application.status === ApplicationStatus.Rejected
                ? 'Rejected'
                : 'Credential Issued'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>{credentialTypeLabel}</span>
            <span>•</span>
            <span>{metadata?.credentials.specialty || 'N/A'}</span>
            <span>•</span>
            <span>App #{applicationId.toString()}</span>
            <span>•</span>
            <span>{new Date(Number(application.submittedAt) * 1000).toLocaleDateString()}</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
