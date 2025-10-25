"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Scanner } from '@yudiel/react-qr-scanner';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { useDispensePrescription } from '@/lib/hooks/usePrescription';
import { CredentialType, PrescriptionStatus } from '@/lib/contracts/config';
import { decodePrescriptionQR } from '@/lib/utils/qr';
import { fetchFromIPFS, PrescriptionMetadata } from '@/lib/utils/ipfs';
import { deriveEncryptionKey, decryptData } from '@/lib/utils/crypto';

export default function DispensePrescription() {
  const { address, isConnected } = useAccount();
  const { credential, isLoading: isLoadingCredential } = useMyCredential();
  const { dispensePrescription, isPending } = useDispensePrescription();

  const [step, setStep] = useState<'scan' | 'verify' | 'dispense' | 'success'>('scan');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [qrData, setQrData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prescriptionData, setPrescriptionData] = useState<any>(null);
  const [metadata, setMetadata] = useState<PrescriptionMetadata | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const isPharmacist = credential?.credentialType === CredentialType.Pharmacist;

  const handleScan = async (result: string) => {
    try {
      setError('');
      setIsProcessing(true);

      // Decode QR code
      const decoded = decodePrescriptionQR(result);
      setQrData(decoded);

      // Fetch prescription from blockchain
      const response = await fetch('/api/verify-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionId: decoded.prescriptionId,
          patientDataHash: decoded.patientDataHash,
          prescriptionDataHash: decoded.prescriptionDataHash,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify prescription');
      }

      const prescription = await response.json();
      setPrescriptionData(prescription);

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
      setStep('verify');
    } catch (err) {
      console.error('Error scanning QR code:', err);
      setError((err as Error).message || 'Failed to scan QR code');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispense = async () => {
    if (!qrData) return;

    try {
      setError('');
      setIsProcessing(true);

      await dispensePrescription(
        BigInt(qrData.prescriptionId),
        qrData.patientDataHash,
        qrData.prescriptionDataHash
      );

      setStep('success');
    } catch (err) {
      console.error('Error dispensing prescription:', err);
      setError((err as Error).message || 'Failed to dispense prescription');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state while checking credential
  if (isConnected && isLoadingCredential) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold mb-2">Checking Credentials...</h2>
              <p className="text-gray-600">Please wait while we verify your access.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isConnected || !isPharmacist) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-600">Access Denied</h2>
            <p className="text-gray-600 mb-4">You need a valid Pharmacist credential to dispense prescriptions.</p>
            {!isConnected && (
              <p className="text-sm text-gray-500">Please connect your wallet above.</p>
            )}
            {isConnected && !isPharmacist && (
              <p className="text-sm text-gray-500">
                Your connected wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) does not have a Pharmacist credential.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (step === 'success') {
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
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="text-green-600 text-6xl mb-4">✓</div>
              <h2 className="text-3xl font-bold mb-4">Prescription Dispensed!</h2>
              <p className="text-gray-600 mb-8">
                The prescription has been successfully marked as dispensed on the blockchain.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setStep('scan');
                    setQrData(null);
                    setPrescriptionData(null);
                    setMetadata(null);
                  }}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Scan Another Prescription
                </button>
                <Link
                  href="/pharmacist"
                  className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'verify' && metadata && prescriptionData) {
    const isExpired = BigInt(Date.now()) > prescriptionData.expiresAt * 1000n;
    const isActive = prescriptionData.status === PrescriptionStatus.Active;
    const canDispense = isActive && !isExpired;

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
                onClick={() => setStep('scan')}
                className="text-purple-600 hover:underline"
              >
                ← Scan Different Prescription
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">Prescription Details</h2>

              {!canDispense && (
                <div className={`mb-6 p-4 rounded-lg ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className={`font-medium ${isExpired ? 'text-red-800' : 'text-yellow-800'}`}>
                    {isExpired ? '⚠️ This prescription has expired' : '⚠️ This prescription cannot be dispensed'}
                  </p>
                </div>
              )}

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
                    <div>
                      <span className="text-sm text-gray-600">Patient ID:</span>
                      <p className="font-medium">{metadata.patientID}</p>
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
                      <span className="text-sm text-gray-600">Refills:</span>
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
                  <h3 className="font-semibold text-lg mb-3">Prescription Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issued:</span>
                      <span className="font-medium">
                        {new Date(Number(prescriptionData.issuedAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium">
                        {new Date(Number(prescriptionData.expiresAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {isActive ? 'Active' : 'Not Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  {error}
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={handleDispense}
                  disabled={!canDispense || isProcessing || isPending}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing || isPending ? 'Dispensing...' : 'Confirm & Dispense'}
                </button>
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
            <Link href="/pharmacist" className="text-purple-600 hover:underline mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold">Scan Prescription</h1>
            <p className="text-gray-600 mt-2">
              Scan the patient's prescription QR code to verify and dispense
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">QR Code Scanner</h2>
              <p className="text-sm text-gray-600">
                Position the QR code within the camera frame
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

            {isProcessing && (
              <div className="mt-6 text-center">
                <p className="text-gray-600">Processing prescription...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
