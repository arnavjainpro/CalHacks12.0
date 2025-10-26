"use client";

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyApplication, ApplicationStatus } from '@/lib/hooks/useApplication';

export default function ApplicationStatusPage() {
  const { isConnected } = useAccount();
  const { application, metadata, isLoading } = useMyApplication();

  // Loading state
  if (isConnected && isLoading) {
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
                href="/apply"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Apply
              </Link>
              <WalletStatus />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Application Status
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Check the status of your credential application
            </p>
          </div>

          {/* NOT CONNECTED STATE */}
          {!isConnected && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Connect your wallet to view your application status
              </p>
              <div className="flex justify-center">
                <WalletStatus />
              </div>
            </div>
          )}

          {/* NO APPLICATION FOUND */}
          {isConnected && !application && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-2xl font-bold mb-4">No Application Found</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You haven't submitted a credential application yet.
              </p>
              <Link
                href="/apply"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Apply Now →
              </Link>
            </div>
          )}

          {/* PENDING APPLICATION */}
          {isConnected && application && application.status === ApplicationStatus.Pending && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold mb-2">Application Under Review</h2>
                <p className="text-yellow-600 font-semibold">Status: Pending Review</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Submitted</p>
                    <p className="font-semibold">
                      {new Date(Number(application.submittedAt) * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Credential Type</p>
                    <p className="font-semibold">
                      {application.credentialType === 0 ? 'Doctor' : 'Pharmacist'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Name</p>
                    <p className="font-semibold">{metadata?.personalInfo.fullName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Specialty</p>
                    <p className="font-semibold">{metadata?.credentials.specialty}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <p className="text-blue-800 dark:text-blue-200 text-center">
                  Your application is being reviewed by our verification team. This typically takes 2-3 business days.
                  You'll be notified once a decision has been made.
                </p>
              </div>
            </div>
          )}

          {/* APPROVED APPLICATION */}
          {isConnected && application && application.status === ApplicationStatus.Approved && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold mb-2 text-green-600">Application Approved!</h2>
                <p className="text-green-600 font-semibold">Status: Approved</p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Submitted</p>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      {new Date(Number(application.submittedAt) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Approved</p>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      {new Date(Number(application.reviewedAt) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Credential Type</p>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      {application.credentialType === 0 ? 'Doctor' : 'Pharmacist'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <p className="text-blue-800 dark:text-blue-200 text-center mb-2">
                  <strong>Congratulations!</strong> Your application has been approved.
                </p>
                <p className="text-blue-800 dark:text-blue-200 text-center text-sm">
                  Your credential is being issued to your wallet. You'll be able to access your dashboard once the
                  credential transaction is confirmed on the blockchain.
                </p>
              </div>
            </div>
          )}

          {/* REJECTED APPLICATION */}
          {isConnected && application && application.status === ApplicationStatus.Rejected && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold mb-2 text-red-600">Application Not Approved</h2>
                <p className="text-red-600 font-semibold">Status: Rejected</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Submitted</p>
                    <p className="font-semibold">
                      {new Date(Number(application.submittedAt) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Reviewed</p>
                    <p className="font-semibold">
                      {new Date(Number(application.reviewedAt) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
                <p className="font-semibold text-red-900 dark:text-red-100 mb-2">Reason for Rejection:</p>
                <p className="text-red-800 dark:text-red-200">
                  {application.rejectionReason || 'No specific reason provided.'}
                </p>
              </div>

              <div className="text-center">
                <Link
                  href="/apply"
                  className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  Reapply with Corrections
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  You can submit a new application addressing the concerns raised above.
                </p>
              </div>
            </div>
          )}

          {/* CREDENTIAL ISSUED */}
          {isConnected && application && application.status === ApplicationStatus.CredentialIssued && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2 text-green-600">Credential Issued!</h2>
                <p className="text-green-600 font-semibold">Status: Active</p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Credential ID</p>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      #{application.credentialTokenId.toString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Type</p>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      {application.credentialType === 0 ? 'Doctor' : 'Pharmacist'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Issued To</p>
                    <p className="font-semibold text-green-800 dark:text-green-200 break-all">
                      {metadata?.personalInfo.fullName}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Specialty</p>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      {metadata?.credentials.specialty}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Link
                  href={application.credentialType === 0 ? '/doctor' : '/pharmacist'}
                  className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Go to Dashboard →
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Your credential has been issued to your wallet. Start using the MedChain system!
                </p>
              </div>
            </div>
          )}

          {/* Back to Home */}
          <div className="text-center mt-8">
            <Link
              href="/"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
