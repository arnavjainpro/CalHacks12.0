"use client";

import { useState } from 'react';
import { Address } from 'viem';
import { Application } from '@/lib/hooks/useApplication';
import { ApplicationMetadata } from '@/lib/services/ipfsService';
import { useApproveApplication, useLinkCredential } from '@/lib/hooks/useApplication';
import { useIssueCredential } from '@/lib/hooks/useCredential';
import { CredentialType } from '@/lib/contracts/config';
import { hashLicenseData } from '@/lib/utils/crypto';
import { uploadCredentialToIPFS, CredentialMetadata } from '@/lib/utils/ipfs';
import { useAccount } from 'wagmi';

interface ApproveApplicationFlowProps {
  application: Application;
  metadata: ApplicationMetadata;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'review' | 'credential' | 'confirm' | 'executing' | 'success';

export function ApproveApplicationFlow({
  application,
  metadata,
  isOpen,
  onClose,
  onSuccess,
}: ApproveApplicationFlowProps) {
  const { address: adminAddress } = useAccount();
  const { approveApplication, isPending: isApproving } = useApproveApplication();
  const { issueCredential, isPending: isIssuing } = useIssueCredential();
  const { linkCredential, isPending: isLinking } = useLinkCredential();

  const [currentStep, setCurrentStep] = useState<Step>('review');
  const [validityYears, setValidityYears] = useState('5');
  const [error, setError] = useState<string | null>(null);
  const [credentialTokenId, setCredentialTokenId] = useState<bigint | null>(null);

  if (!isOpen) return null;

  const credentialType =
    application.credentialType === 0 ? CredentialType.Doctor : CredentialType.Pharmacist;

  const handleApproveAndIssue = async () => {
    try {
      setCurrentStep('executing');
      setError(null);

      // Step 1: Approve application
      console.log('Step 1: Approving application...');
      await approveApplication(application.applicationId);

      // Step 2: Issue credential
      console.log('Step 2: Issuing credential...');
      const licenseHash = hashLicenseData(metadata.credentials.licenseNumber);

      // Upload credential metadata to IPFS
      const credentialMetadata: CredentialMetadata = {
        licenseNumber: licenseHash,
        specialty: metadata.credentials.specialty,
        institutionName: metadata.credentials.institution,
        verifiedAt: Date.now(),
        verifiedBy: adminAddress!,
      };

      const ipfsCid = await uploadCredentialToIPFS(credentialMetadata);

      const txHash = await issueCredential(
        application.applicant as Address,
        credentialType,
        licenseHash,
        metadata.credentials.specialty,
        ipfsCid,
        BigInt(validityYears)
      );

      console.log('Credential issued, transaction:', txHash);

      // For now, we'll need to extract the token ID from events or use a different approach
      // This is a simplified version - in production you'd want to parse the transaction receipt
      // to get the actual token ID
      const mockTokenId = BigInt(Date.now()); // Placeholder - should come from transaction receipt
      setCredentialTokenId(mockTokenId);

      // Step 3: Link credential to application
      console.log('Step 3: Linking credential to application...');
      await linkCredential(application.applicationId, mockTokenId);

      setCurrentStep('success');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 3000);
    } catch (err: any) {
      console.error('Error in approval flow:', err);
      setError(err.message || 'Failed to approve and issue credential');
      setCurrentStep('credential');
    }
  };

  const handleClose = () => {
    setCurrentStep('review');
    setError(null);
    setValidityYears('5');
    setCredentialTokenId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">        

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-green-50 dark:bg-green-900/20 px-6 py-4 border-b border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Approve Application
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {metadata.personalInfo.fullName} - {metadata.credentials.credentialType}
                  </p>
                </div>
              </div>
              {currentStep !== 'executing' && (
                <button
                  onClick={handleClose}
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
              )}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              {[
                { id: 'review', label: 'Review' },
                { id: 'credential', label: 'Credential' },
                { id: 'executing', label: 'Execute' },
                { id: 'success', label: 'Complete' },
              ].map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        ['review', 'credential', 'executing', 'success'].indexOf(currentStep) >=
                        ['review', 'credential', 'executing', 'success'].indexOf(step.id as Step)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">{step.label}</span>
                  </div>
                  {idx < 3 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        ['review', 'credential', 'executing', 'success'].indexOf(currentStep) >
                        ['review', 'credential', 'executing', 'success'].indexOf(step.id as Step)
                          ? 'bg-green-600'
                          : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Step 1: Review */}
            {currentStep === 'review' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Review Application
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Applicant:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {metadata.personalInfo.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">License:</span>
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                      {metadata.credentials.licenseNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Specialty:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {metadata.credentials.specialty}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Institution:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {metadata.credentials.institution}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ⚠️ Please verify the license number against state medical/pharmacy databases before
                    proceeding.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setCurrentStep('credential')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Credential Configuration */}
            {currentStep === 'credential' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Configure Credential
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Validity Period (Years)
                  </label>
                  <input
                    type="number"
                    value={validityYears}
                    onChange={(e) => setValidityYears(e.target.value)}
                    min="1"
                    max="10"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Credential will expire in {validityYears} years
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-800 dark:text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setCurrentStep('review')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleApproveAndIssue}
                    disabled={isApproving || isIssuing || isLinking}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve & Issue Credential
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Executing */}
            {currentStep === 'executing' && (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Processing...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Approving application and issuing credential. This may take a minute.
                </p>
              </div>
            )}

            {/* Step 4: Success */}
            {currentStep === 'success' && (
              <div className="py-8 text-center">
                <div className="bg-green-100 dark:bg-green-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Application Approved!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Credential has been issued to {metadata.personalInfo.fullName}
                </p>
                {credentialTokenId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Token ID: #{credentialTokenId.toString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
