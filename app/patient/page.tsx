"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Scanner } from '@yudiel/react-qr-scanner';
import { WalletStatus } from '@/components/WalletStatus';
import { usePrescriptionWithProof } from '@/lib/hooks/usePrescription';
import { PrescriptionStatus } from '@/lib/contracts/config';
import { decodePrescriptionQR } from '@/lib/utils/qr';
import { fetchFromIPFS, PrescriptionMetadata } from '@/lib/utils/ipfs';
import { deriveEncryptionKey, decryptData } from '@/lib/utils/crypto';

export default function PatientPortal() {
  const [step, setStep] = useState<'scan' | 'view'>('scan');
  const [qrData, setQrData] = useState<any>(null);
  const [metadata, setMetadata] = useState<PrescriptionMetadata | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { prescription, isLoading } = usePrescriptionWithProof(
    qrData ? BigInt(qrData.prescriptionId) : undefined,
    qrData?.patientSecret
  );

  const handleScan = async (result: string) => {
    try {
      setError('');
      setIsProcessing(true);

      // Decode QR code
      const decoded = decodePrescriptionQR(result);
      setQrData(decoded);

      // Wait for prescription data to load via hook
      // This is a simplified version - in production you'd handle this better
      setTimeout(async () => {
        if (prescription) {
          // Fetch metadata from IPFS
          const ipfsData = await fetchFromIPFS<PrescriptionMetadata>(prescription.ipfsCid);

          // Decrypt patient data
          const encryptionKey = deriveEncryptionKey(decoded.patientSecret as `0x${string}`);
          const decryptedMetadata = {
            ...ipfsData,
            patientName: decryptData(ipfsData.patientName, encryptionKey),
            patientDOB: decryptData(ipfsData.patientDOB, encryptionKey),
            patientID: decryptData(ipfsData.patientID, encryptionKey),
          };

          setMetadata(decryptedMetadata);
          setStep('view');
        }
      }, 2000);
    } catch (err: any) {
      console.error('Error scanning QR code:', err);
      setError(err.message || 'Failed to scan QR code');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Enhanced status badge with gradients and icons (preserves all logic)
  const getStatusBadge = (status: PrescriptionStatus) => {
    const badges = {
      [PrescriptionStatus.Active]: {
        className: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:text-green-200 border-2 border-green-300',
        label: 'Active - Ready to Dispense',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      [PrescriptionStatus.Dispensed]: {
        className: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:text-blue-200 border-2 border-blue-300',
        label: 'Dispensed',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
      },
      [PrescriptionStatus.Cancelled]: {
        className: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:text-red-200 border-2 border-red-300',
        label: 'Cancelled',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      },
      [PrescriptionStatus.Expired]: {
        className: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:text-gray-200 border-2 border-gray-300',
        label: 'Expired',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    };
    
    const badge = badges[status];
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${badge.className}`}>
        {badge.icon}
        <span>{badge.label}</span>
      </span>
    );
  };

  // ✅ PRESCRIPTION VIEW UI - Backend hooks completely preserved
  if (step === 'view' && metadata && prescription) {
    const isExpired = BigInt(Date.now()) > prescription.expiresAt * 1000n;
    const isActive = prescription.status === PrescriptionStatus.Active;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Enhanced Header */}
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg" aria-label="Go to home">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg" aria-hidden="true">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => {
                  setStep('scan');
                  setQrData(null);
                  setMetadata(null);
                }}
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-300 font-medium hover:gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Scan Different Prescription</span>
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-900 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Prescription</h2>
                  </div>
                  {getStatusBadge(prescription.status)}
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Patient Information */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Patient Information</h3>
                  </div>
                  <div className="space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Name:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{metadata.patientName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Date of Birth:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{metadata.patientDOB}</p>
                    </div>
                  </div>
                </div>

                {/* Medication */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg flex items-center justify-center">
                      <span className="text-lg" role="img" aria-label="Medication">💊</span>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Medication</h3>
                  </div>
                  <div className="space-y-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 p-5 rounded-xl border border-green-200">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Drug:</span>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-xl">{metadata.medication}</p>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Dosage:</span>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{metadata.dosage}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Quantity:</span>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{metadata.quantity}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Refills:</span>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{metadata.refills} remaining</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Instructions</h3>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
                    <p className="text-gray-900 dark:text-gray-100">{metadata.instructions}</p>
                  </div>
                </div>

                {/* Prescription Details */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Prescription Details</h3>
                  </div>
                  <div className="space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">Prescription ID:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">#{prescription.prescriptionId.toString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">Issued:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {new Date(Number(prescription.issuedAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">Expires:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {new Date(Number(prescription.expiresAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    {prescription.status === PrescriptionStatus.Dispensed && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">Dispensed On:</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {new Date(Number(prescription.dispensedAt) * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Messages */}
                {isActive && !isExpired && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 border-2 border-green-300 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-green-900 dark:text-green-100 font-bold text-lg mb-1">
                          ✓ Prescription Active
                        </p>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          This prescription is active and can be dispensed at any pharmacy. Show this QR code to the pharmacist to have your prescription filled.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isExpired && (
                  <div className="bg-gradient-to-r from-red-50 dark:from-red-900/30 to-red-100 border-2 border-red-300 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-red-900 dark:text-red-100 font-bold text-lg mb-1">
                          ⚠️ Prescription Expired
                        </p>
                        <p className="text-sm text-red-800 dark:text-red-200">
                          This prescription has expired. Please contact your doctor for a new prescription.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {prescription.status === PrescriptionStatus.Cancelled && (
                  <div className="bg-gradient-to-r from-red-50 dark:from-red-900/30 to-red-100 border-2 border-red-300 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-red-900 dark:text-red-100 font-bold text-lg mb-1">
                          ⚠️ Prescription Cancelled
                        </p>
                        <p className="text-sm text-red-800 dark:text-red-200">
                          This prescription has been cancelled by your doctor.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ✅ SCANNER VIEW UI - Backend logic completely preserved: handleScan(), usePrescriptionWithProof()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg" aria-label="Go to home">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg" aria-hidden="true">M</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">MedChain</span>
            </Link>
            <WalletStatus />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-300 mb-6 font-medium hover:gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg" aria-label="Back to home">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </Link>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl" role="img" aria-label="Patient">🧑‍⚕️</span>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Patient Portal</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Scan your prescription QR code to view details
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-900 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Your QR Code</h2>
              </div>
            </div>
            
            <div className="p-6 sm:p-8">
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Position your prescription QR code within the camera frame to view your prescription details securely
              </p>

              {/* Enhanced QR Scanner */}
              <div className="aspect-square max-w-lg mx-auto bg-black rounded-2xl overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-2xl">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      handleScan(result[0].rawValue);
                    }
                  }}
                  onError={(error) => {
                    console.error('Scanner error:', error);
                    setError('Camera access denied or not available');
                  }}
                  formats={['qr_code']}
                  constraints={{
                    facingMode: 'environment',
                  }}
                />
              </div>

              {error && (
                <div className="mt-6 bg-gradient-to-r from-red-50 dark:from-red-900/30 to-red-100 border-2 border-red-300 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-red-900 dark:text-red-100 font-bold mb-1">Scanner Error</p>
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {(isProcessing || isLoading) && (
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-900 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-5" role="status" aria-live="polite">
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">Loading prescription...</p>
                  </div>
                </div>
              )}

              <div className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">Privacy & Security</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Your prescription data is encrypted end-to-end and stored securely on the blockchain. Only you (with your QR code) and authorized healthcare providers can access it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How to Use */}
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Allow Camera</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Grant camera permission when prompted by your browser</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Position QR Code</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Center your prescription QR code in the camera view</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700 p-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">View Details</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Automatic scan will display your prescription information</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
