"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Scanner } from '@yudiel/react-qr-scanner';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { useDispensePrescription, useVerifyPrescription } from '@/lib/hooks/usePrescription';
import { CredentialType, PrescriptionStatus } from '@/lib/contracts/config';
import { decodePrescriptionQR } from '@/lib/utils/qr';
import { fetchFromIPFS, PrescriptionMetadata } from '@/lib/utils/ipfs';
import { deriveEncryptionKey, decryptData, hashPatientData } from '@/lib/utils/crypto';
import DrugInformationPanel from '@/components/DrugInformationPanel';
import PrescriptionHistory from '@/components/PrescriptionDetails';

export default function DispensePrescription() {
  const { address, isConnected } = useAccount();
  const { credential, isLoading: isLoadingCredential } = useMyCredential();
  const { dispensePrescription, isPending } = useDispensePrescription();

  const [step, setStep] = useState<'scan' | 'verify' | 'dispense' | 'success'>('scan');
  const [showDrugInfo, setShowDrugInfo] = useState(false);
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [qrData, setQrData] = useState<any>(null);
  const [metadata, setMetadata] = useState<PrescriptionMetadata | null>(null);
  const [error, setError] = useState('');
  const [patientHistoryData, setPatientHistoryData] = useState<any[]>([]);
  const [inputMode, setInputMode] = useState<'qr' | 'json'>('qr');
  const [jsonInput, setJsonInput] = useState('');

  // Verify prescription using the smart contract
  const prescriptionIdBigInt = qrData?.prescriptionId
    ? (typeof qrData.prescriptionId === 'bigint'
        ? qrData.prescriptionId
        : typeof qrData.prescriptionId === 'number' || !isNaN(Number(qrData.prescriptionId))
          ? BigInt(qrData.prescriptionId)
          : undefined)
    : undefined;

  const {
    prescription: prescriptionData,
    isLoading: isVerifying
  } = useVerifyPrescription(
    prescriptionIdBigInt,
    qrData?.patientDataHash,
    qrData?.prescriptionDataHash
  );

  const isPharmacist = credential?.credentialType === CredentialType.Pharmacist;

  const handleScan = async (result: string) => {
    try {
      setError('');

      // Decode QR code and set to state
      // This will trigger the useVerifyPrescription hook
      const decoded = decodePrescriptionQR(result);
      setQrData(decoded);
    } catch (err) {
      console.error('Error scanning QR code:', err);
      setError((err as Error).message || 'Failed to decode QR code');
    }
  };

  const handleJsonSubmit = () => {
    try {
      setError('');
      const parsed = JSON.parse(jsonInput);

      // Validate the parsed JSON has required fields
      if (!parsed.prescriptionId || !parsed.patientDataHash || !parsed.prescriptionDataHash || !parsed.patientSecret) {
        throw new Error('Invalid JSON: Missing required fields (prescriptionId, patientDataHash, prescriptionDataHash, patientSecret)');
      }

      setQrData(parsed);
    } catch (err) {
      console.error('Error parsing JSON:', err);
      setError((err as Error).message || 'Failed to parse JSON');
    }
  };

  // When prescription is verified, fetch and decrypt metadata from IPFS
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!prescriptionData || !qrData) return;

      try {
        setError('');

        // Fetch metadata from IPFS
        const ipfsData = await fetchFromIPFS<PrescriptionMetadata>(prescriptionData.ipfsCid);

        // Decrypt patient data
        const encryptionKey = deriveEncryptionKey(qrData.patientSecret as `0x${string}`);
        const decryptedMetadata = {
          ...ipfsData,
          patientName: decryptData(ipfsData.patientName, encryptionKey),
          patientDOB: decryptData(ipfsData.patientDOB, encryptionKey),
          patientID: decryptData(ipfsData.patientID, encryptionKey),
        };

        setMetadata(decryptedMetadata);
        setStep('verify');
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError((err as Error).message || 'Failed to fetch prescription details');
      }
    };

    fetchMetadata();
  }, [prescriptionData, qrData]);

  const handleDispense = async () => {
    if (!qrData) return;

    try {
      setError('');

      await dispensePrescription(
        BigInt(qrData.prescriptionId),
        qrData.patientDataHash,
        qrData.prescriptionDataHash
      );

      setStep('success');
    } catch (err) {
      console.error('Error dispensing prescription:', err);
      setError((err as Error).message || 'Failed to dispense prescription');
    }
  };

  // Load patient history - would query blockchain in production
  const loadPatientHistory = () => {
    // TODO: Implement actual patient history lookup
    // For now, pharmacists would need patient hash to query history
    setPatientHistoryData([]);
  };

  // Show loading state while checking credential
  if (isConnected && isLoadingCredential) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <header className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">Checking Credentials...</h2>
              <p className="text-gray-600 dark:text-gray-300">Please wait while we verify your access.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isConnected || !isPharmacist) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <header className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="text-green-600 dark:text-green-400 text-6xl mb-4">✓</div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">Prescription Dispensed!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                The prescription has been successfully marked as dispensed on the blockchain.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setStep('scan');
                    setQrData(null);
                    setMetadata(null);
                    setJsonInput('');
                    setError('');
                  }}
                  className="w-full bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition font-medium"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4">
              <button
                onClick={() => setStep('scan')}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← Scan Different Prescription
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Prescription Details</h2>

              {!canDispense && (
                <div className={`mb-6 p-4 rounded-lg ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className={`font-medium ${isExpired ? 'text-red-800' : 'text-yellow-800'}`}>
                    {isExpired ? '⚠️ This prescription has expired' : '⚠️ This prescription cannot be dispensed'}
                  </p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Patient Information</h3>
                  <div className="space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Name:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{metadata.patientName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Date of Birth:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{metadata.patientDOB}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Patient ID:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{metadata.patientID}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Medication</h3>
                  <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Drug:</span>
                      <p className="font-medium text-lg text-gray-900 dark:text-gray-100">{metadata.medication}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Dosage:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{metadata.dosage}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{metadata.quantity}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Refills:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{metadata.refills}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Instructions</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-900 dark:text-gray-100">{metadata.instructions}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Prescription Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Issued:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(Number(prescriptionData.issuedAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Expires:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(Number(prescriptionData.expiresAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Status:</span>
                      <span className={`font-medium ${isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isActive ? 'Active' : 'Not Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={handleDispense}
                  disabled={!canDispense || isPending}
                  className="w-full bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Dispensing...' : 'Confirm & Dispense'}
                </button>
              </div>
            </div>

            {/* Drug Information View */}
            {showDrugInfo && !showPatientHistory && (
              <div>
                <DrugInformationPanel
                  medication={metadata.medication}
                  dosage={metadata.dosage}
                  patientContext={`Patient: ${metadata.patientName} (DOB: ${metadata.patientDOB})`}
                />

                <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-3">Pharmacist Safety Checklist</h3>
                  <div className="space-y-2">
                    <label className="flex items-center text-purple-800">
                      <input type="checkbox" className="mr-3 h-5 w-5" />
                      <span>Verified patient identity and prescription authenticity</span>
                    </label>
                    <label className="flex items-center text-purple-800">
                      <input type="checkbox" className="mr-3 h-5 w-5" />
                      <span>Reviewed drug information and potential interactions</span>
                    </label>
                    <label className="flex items-center text-purple-800">
                      <input type="checkbox" className="mr-3 h-5 w-5" />
                      <span>Confirmed dosage and quantity are appropriate</span>
                    </label>
                    <label className="flex items-center text-purple-800">
                      <input type="checkbox" className="mr-3 h-5 w-5" />
                      <span>Counseled patient on proper medication use</span>
                    </label>
                    <label className="flex items-center text-purple-800">
                      <input type="checkbox" className="mr-3 h-5 w-5" />
                      <span>Verified no contraindications or allergies</span>
                    </label>
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-300">
                    <button
                      onClick={() => setShowDrugInfo(false)}
                      className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
                    >
                      Return to Prescription & Dispense
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Patient History View */}
            {showPatientHistory && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4 dark:text-gray-100">Patient Prescription History</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Complete prescription history for {metadata.patientName}
                  </p>
                  <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                    <p className="text-sm text-purple-800 dark:text-purple-300">
                      <strong>Pharmacist Note:</strong> Review patient's prescription history to check for potential drug interactions, duplicate therapy, or unusual patterns before dispensing.
                    </p>
                  </div>
                </div>

                {patientHistoryData.length > 0 ? (
                  <PrescriptionHistory
                    prescriptions={patientHistoryData}
                    patientSecret={undefined}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <p className="text-gray-600 dark:text-gray-300">Loading patient history...</p>
                  </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <button
                    onClick={() => setShowPatientHistory(false)}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    Return to Prescription & Dispense
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
          <WalletStatus />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link href="/pharmacist" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Scan Prescription</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Scan the patient's prescription QR code to verify and dispense
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Scan Prescription</h2>

              {/* Toggle between QR and JSON input */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInputMode('qr')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    inputMode === 'qr'
                      ? 'bg-blue-600 dark:bg-blue-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  📷 QR Scanner
                </button>
                <button
                  onClick={() => setInputMode('json')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    inputMode === 'json'
                      ? 'bg-blue-600 dark:bg-blue-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  📋 Paste JSON
                </button>
              </div>

              <p className="text-sm text-gray-600">
                {inputMode === 'qr'
                  ? 'Position the QR code within the camera frame'
                  : 'Paste the prescription JSON data below'}
              </p>
            </div>

            {inputMode === 'qr' ? (
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
            ) : (
              <div className="space-y-4">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"prescriptionId":"1","patientDataHash":"0x...","prescriptionDataHash":"0x...","patientSecret":"0x..."}'
                  className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600"
                />
                <button
                  onClick={handleJsonSubmit}
                  disabled={!jsonInput.trim()}
                  className="w-full bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Verify Prescription
                </button>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            {isVerifying && (
              <div className="mt-6 text-center">
                <p className="text-gray-600">Verifying prescription on blockchain...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
