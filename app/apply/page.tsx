"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyApplication, useSubmitApplication, ApplicationStatus } from '@/lib/hooks/useApplication';
import {
  ApplicationFormData,
  validateApplicationForm,
  validateFileUpload,
  sanitizeFormData,
  getSpecialtyOptions,
  type CredentialType,
} from '@/lib/constants/applicationSchema';

export default function ApplyPage() {
  const { isConnected } = useAccount();
  const { application, metadata, isLoading: applicationLoading } = useMyApplication();
  const { submitApplication, isUploading, isSuccess, error } = useSubmitApplication();

  const [formData, setFormData] = useState<Partial<ApplicationFormData>>({
    credentialType: 'Doctor',
    agreeToTerms: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof ApplicationFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleFileChange = (field: 'licenseDocument' | 'employmentProof', file: File | null) => {
    if (file) {
      const error = validateFileUpload(file, false);
      if (error) {
        setValidationErrors((prev) => ({ ...prev, [field]: error }));
        return;
      }
    }
    handleInputChange(field, file || undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const errors = validateApplicationForm(formData);
    if (errors.length > 0) {
      const errorMap = errors.reduce((acc, err) => {
        acc[err.field] = err.message;
        return acc;
      }, {} as Record<string, string>);
      setValidationErrors(errorMap);
      return;
    }

    try {
      setIsSubmitting(true);
      const sanitizedData = sanitizeFormData(formData as ApplicationFormData);
      await submitApplication(sanitizedData);
      // Component will re-render with new application status
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const specialtyOptions = formData.credentialType
    ? getSpecialtyOptions(formData.credentialType as CredentialType)
    : [];

  // Loading state
  if (isConnected && applicationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading application status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MedChain
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/apply/status"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Check Status
              </Link>
              <WalletStatus />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Healthcare Provider Credential Application
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Join the decentralized healthcare network
            </p>
          </div>

          {/* NOT CONNECTED STATE */}
          {!isConnected && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet to Apply</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You need to connect your Web3 wallet to submit a credential application.
                Your wallet address will be used to issue your credential after approval.
              </p>
              <div className="flex justify-center">
                <WalletStatus />
              </div>
              <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Don't have a wallet?
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  We recommend using Coinbase Smart Wallet - it only takes a minute to set up!
                </p>
              </div>
            </div>
          )}

          {/* EXISTING APPLICATION - PENDING */}
          {isConnected && application && application.status === ApplicationStatus.Pending && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold mb-4">Application Under Review</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Your application is currently being reviewed by our verification team.
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Submitted</p>
                      <p className="font-semibold">
                        {new Date(Number(application.submittedAt) * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <p className="font-semibold text-yellow-600">Pending Review</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                      <p className="font-semibold">{metadata?.personalInfo.fullName}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  This typically takes 2-3 business days. Check your status anytime by connecting your wallet.
                </p>
              </div>
            </div>
          )}

          {/* EXISTING APPLICATION - APPROVED */}
          {isConnected && application && application.status === ApplicationStatus.Approved && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold mb-4 text-green-600">Application Approved!</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Congratulations! Your application has been approved.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
                  <p className="text-green-800 dark:text-green-200">
                    Your credential is being issued to your wallet. You'll be able to access your
                    dashboard once the credential transaction is confirmed on the blockchain.
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  Approved on {new Date(Number(application.reviewedAt) * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* EXISTING APPLICATION - REJECTED */}
          {isConnected && application && application.status === ApplicationStatus.Rejected && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold mb-4 text-red-600">Application Not Approved</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Unfortunately, your application was not approved at this time.
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6 text-left">
                  <p className="font-semibold text-red-900 dark:text-red-100 mb-2">Reason:</p>
                  <p className="text-red-800 dark:text-red-200">
                    {application.rejectionReason || 'No reason provided'}
                  </p>
                </div>
                <Link
                  href="/apply/status"
                  className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  Reapply with Corrections
                </Link>
                <p className="text-sm text-gray-500 mt-4">
                  You can submit a new application addressing the concerns raised.
                </p>
              </div>
            </div>
          )}

          {/* EXISTING APPLICATION - CREDENTIAL ISSUED */}
          {isConnected && application && application.status === ApplicationStatus.CredentialIssued && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-4 text-green-600">Credential Issued!</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Your healthcare provider credential has been successfully issued to your wallet.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Credential ID</p>
                      <p className="font-semibold text-green-800 dark:text-green-200">
                        #{application.credentialTokenId.toString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-semibold text-green-800 dark:text-green-200">
                        {application.credentialType === 0 ? 'Doctor' : 'Pharmacist'}
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  href={application.credentialType === 0 ? '/doctor' : '/pharmacist'}
                  className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Go to Dashboard →
                </Link>
              </div>
            </div>
          )}

          {/* NEW APPLICATION FORM */}
          {isConnected && !application && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Credential Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Credential Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleInputChange('credentialType', 'Doctor')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.credentialType === 'Doctor'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      <div className="text-3xl mb-2">🩺</div>
                      <div className="font-semibold">Doctor</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('credentialType', 'Pharmacist')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.credentialType === 'Pharmacist'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      <div className="text-3xl mb-2">💊</div>
                      <div className="font-semibold">Pharmacist</div>
                    </button>
                  </div>
                  {validationErrors.credentialType && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.credentialType}</p>
                  )}
                </div>

                {/* Personal Information */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h2 className="text-xl font-semibold mb-4">Personal Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.fullName || ''}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-gray-700"
                        placeholder="Dr. Jane Smith"
                      />
                      {validationErrors.fullName && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-gray-700"
                        placeholder="+1 (555) 123-4567"
                      />
                      {validationErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h2 className="text-xl font-semibold mb-4">Professional Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        License Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.licenseNumber || ''}
                        onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-gray-700"
                        placeholder="MD123456"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Will be verified by admin team against state databases
                      </p>
                      {validationErrors.licenseNumber && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.licenseNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Specialty <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.specialty || ''}
                        onChange={(e) => handleInputChange('specialty', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-gray-700"
                      >
                        <option value="">Select specialty...</option>
                        {specialtyOptions.map((specialty) => (
                          <option key={specialty} value={specialty}>
                            {specialty}
                          </option>
                        ))}
                      </select>
                      {validationErrors.specialty && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.specialty}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Institution <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.institution || ''}
                        onChange={(e) => handleInputChange('institution', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-gray-700"
                        placeholder="General Hospital"
                      />
                      {validationErrors.institution && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.institution}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Uploads */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h2 className="text-xl font-semibold mb-4">Supporting Documents</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        License Document (Optional)
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleFileChange('licenseDocument', e.target.files?.[0] || null)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, JPEG, PNG, or WebP (max 10MB)
                      </p>
                      {validationErrors.licenseDocument && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.licenseDocument}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Employment Proof (Optional)
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleFileChange('employmentProof', e.target.files?.[0] || null)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, JPEG, PNG, or WebP (max 10MB)
                      </p>
                      {validationErrors.employmentProof && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.employmentProof}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.agreeToTerms || false}
                      onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      I agree to the terms and conditions and confirm that all information provided is accurate
                      and truthful. <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {validationErrors.agreeToTerms && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.agreeToTerms}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || isUploading ? 'Submitting Application...' : 'Submit Application'}
                  </button>

                  {error && (
                    <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
                  )}

                  {isSuccess && (
                    <p className="text-green-600 text-sm mt-2 text-center">
                      Application submitted successfully!
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Info Box */}
          {isConnected && !application && (
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What happens next?
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>Your application will be reviewed by our verification team (typically 2-3 business days)</li>
                <li>Admin will verify your license number against state databases</li>
                <li>If approved, your credential (Soul-Bound Token) will be issued to your wallet</li>
                <li>You'll gain access to your healthcare provider dashboard</li>
                <li>Check your status anytime by connecting your wallet</li>
              </ol>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
