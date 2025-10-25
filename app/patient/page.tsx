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

  const getStatusBadge = (status: PrescriptionStatus) => {
    const badges = {
      [PrescriptionStatus.Active]: 'bg-green-100 text-green-800',
      [PrescriptionStatus.Dispensed]: 'bg-blue-100 text-blue-800',
      [PrescriptionStatus.Cancelled]: 'bg-red-100 text-red-800',
      [PrescriptionStatus.Expired]: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      [PrescriptionStatus.Active]: 'Active - Ready to Dispense',
      [PrescriptionStatus.Dispensed]: 'Dispensed',
      [PrescriptionStatus.Cancelled]: 'Cancelled',
      [PrescriptionStatus.Expired]: 'Expired',
    };
    return (
      <span className={`px-3 py-1 rounded text-sm font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (step === 'view' && metadata && prescription) {
    const isExpired = BigInt(Date.now()) > prescription.expiresAt * 1000n;
    const isActive = prescription.status === PrescriptionStatus.Active;

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">MedChain</Link>
            <WalletStatus />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <button
                onClick={() => {
                  setStep('scan');
                  setQrData(null);
                  setMetadata(null);
                }}
                className="text-blue-600 hover:underline"
              >
                ← Scan Different Prescription
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Your Prescription</h2>
                {getStatusBadge(prescription.status)}
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Patient Information</h3>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <span className="text-sm text-gray-600">Name:</span>
                      <p className="font-medium">{metadata.patientName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Date of Birth:</span>
                      <p className="font-medium">{metadata.patientDOB}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Medication</h3>
                  <div className="space-y-2 bg-blue-50 p-4 rounded-lg">
                    <div>
                      <span className="text-sm text-gray-600">Drug:</span>
                      <p className="font-medium text-lg">{metadata.medication}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Dosage:</span>
                      <p className="font-medium">{metadata.dosage}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Quantity:</span>
                      <p className="font-medium">{metadata.quantity}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Refills Remaining:</span>
                      <p className="font-medium">{metadata.refills}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Instructions</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p>{metadata.instructions}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Prescription Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prescription ID:</span>
                      <span className="font-medium">#{prescription.prescriptionId.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issued:</span>
                      <span className="font-medium">
                        {new Date(Number(prescription.issuedAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium">
                        {new Date(Number(prescription.expiresAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    {prescription.status === PrescriptionStatus.Dispensed && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dispensed On:</span>
                        <span className="font-medium">
                          {new Date(Number(prescription.dispensedAt) * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {isActive && !isExpired && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      ✓ This prescription is active and can be dispensed at any pharmacy.
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      Show this QR code to the pharmacist to have your prescription filled.
                    </p>
                  </div>
                )}

                {isExpired && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-medium">
                      ⚠️ This prescription has expired.
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      Please contact your doctor for a new prescription.
                    </p>
                  </div>
                )}

                {prescription.status === PrescriptionStatus.Cancelled && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-medium">
                      ⚠️ This prescription has been cancelled by your doctor.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">MedChain</Link>
          <WalletStatus />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold">Patient Portal</h1>
            <p className="text-gray-600 mt-2">
              Scan your prescription QR code to view details (no wallet required)
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Scan Your QR Code</h2>
              <p className="text-sm text-gray-600">
                Position your prescription QR code within the camera frame
              </p>
            </div>

            <div className="aspect-square max-w-md mx-auto bg-gray-100 rounded-lg overflow-hidden">
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
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error}
              </div>
            )}

            {(isProcessing || isLoading) && (
              <div className="mt-6 text-center">
                <p className="text-gray-600">Loading prescription...</p>
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Privacy Note:</strong> Your prescription data is encrypted and stored securely. Only you (with your QR code) and authorized healthcare providers can access it.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
