"use client";

import { useState } from 'react';
import { Application, ApplicationStatus } from '@/lib/hooks/useApplication';
import { ApplicationMetadata } from '@/lib/services/ipfsService';
import { DocumentViewer } from './DocumentViewer';

interface ApplicationDetailModalProps {
  application: Application;
  metadata: ApplicationMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function ApplicationDetailModal({
  application,
  metadata,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: ApplicationDetailModalProps) {
  const [activeDocument, setActiveDocument] = useState<{ cid: string; type: string } | null>(null);

  if (!isOpen) return null;

  const statusColor = {
    [ApplicationStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    [ApplicationStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    [ApplicationStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
    [ApplicationStatus.CredentialIssued]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
  }[application.status];

  const statusLabel = {
    [ApplicationStatus.Pending]: 'Pending',
    [ApplicationStatus.Approved]: 'Approved',
    [ApplicationStatus.Rejected]: 'Rejected',
    [ApplicationStatus.CredentialIssued]: 'Credential Issued',
  }[application.status];

  const credentialTypeLabel = application.credentialType === 0 ? 'Doctor' : 'Pharmacist';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Application Details
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Status Badge */}
            <div className="mb-6">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            {/* Application Info */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Application ID</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      #{application.applicationId.toString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Credential Type</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {credentialTypeLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Submitted</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {new Date(Number(application.submittedAt) * 1000).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Applicant Wallet</p>
                    <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                      {application.applicant.slice(0, 6)}...{application.applicant.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Info from IPFS */}
              {metadata && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {metadata.personalInfo.fullName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {metadata.personalInfo.phone || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Professional Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">License Number</p>
                        <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                          {metadata.credentials.licenseNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ⚠️ Verify against state database
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Specialty</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {metadata.credentials.specialty}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Institution</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {metadata.credentials.institution}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  {(metadata.documents.licenseDocument || metadata.documents.employmentProof) && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Supporting Documents
                      </h3>
                      <div className="space-y-2">
                        {metadata.documents.licenseDocument && (
                          <button
                            onClick={() =>
                              setActiveDocument({
                                cid: metadata.documents.licenseDocument!,
                                type: 'License Document',
                              })
                            }
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
                          >
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              📄 License Document
                            </span>
                            <span className="text-sm text-blue-600 dark:text-blue-400">View →</span>
                          </button>
                        )}
                        {metadata.documents.employmentProof && (
                          <button
                            onClick={() =>
                              setActiveDocument({
                                cid: metadata.documents.employmentProof!,
                                type: 'Employment Proof',
                              })
                            }
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
                          >
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              📄 Employment Proof
                            </span>
                            <span className="text-sm text-blue-600 dark:text-blue-400">View →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Rejection Info */}
              {application.status === ApplicationStatus.Rejected && application.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Rejection Reason
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {application.rejectionReason}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                    Rejected on {new Date(Number(application.reviewedAt) * 1000).toLocaleString()} by{' '}
                    {application.reviewedBy.slice(0, 6)}...{application.reviewedBy.slice(-4)}
                  </p>
                </div>
              )}

              {/* Credential Info */}
              {application.status === ApplicationStatus.CredentialIssued && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                    Credential Issued
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Token ID: #{application.credentialTokenId.toString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          {application.status === ApplicationStatus.Pending && (
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={onReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Reject
              </button>
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                Approve & Issue Credential
              </button>
            </div>
          )}
        </div>

        {/* Document Viewer Modal */}
        {activeDocument && (
          <div className="fixed inset-0 z-60 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[90vh]">
              <DocumentViewer
                cid={activeDocument.cid}
                documentType={activeDocument.type}
                onClose={() => setActiveDocument(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
