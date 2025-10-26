"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import {
  usePatientPrescriptionHistory,
  useBatchPrescriptionStatus
} from '@/lib/hooks/usePrescription';
import { CredentialType, PrescriptionStatus } from '@/lib/contracts/config';
import { hashPatientData } from '@/lib/utils/crypto';

interface PrescriptionSummary {
  id: bigint;
  status: PrescriptionStatus;
}

export default function PatientLookup() {
  const { isConnected } = useAccount();
  const { credential, isLoading: credentialLoading } = useMyCredential();

  // Form state
  const [patientName, setPatientName] = useState('');
  const [patientDOB, setPatientDOB] = useState('');
  const [patientID, setPatientID] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [patientHash, setPatientHash] = useState<`0x${string}` | undefined>();

  // Query patient history
  const {
    prescriptionIds,
    isLoading: historyLoading,
    error: historyError
  } = usePatientPrescriptionHistory(patientHash);

  // Get statuses for all prescriptions
  const { statuses, isLoading: statusesLoading } = useBatchPrescriptionStatus(
    prescriptionIds || []
  );

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);

  // Combine prescription IDs with their statuses
  useEffect(() => {
    if (prescriptionIds && statuses) {
      const combined = prescriptionIds.map((id, index) => ({
        id,
        status: statuses[index],
      }));
      setPrescriptions(combined);
    }
  }, [prescriptionIds, statuses]);

  const isDoctor = credential?.credentialType === CredentialType.Doctor;
  const hasValidCredential = credential?.isActive && BigInt(Date.now()) < credential.expiresAt * 1000n;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientDOB || !patientID) {
      return;
    }

    // Hash patient data
    const hash = hashPatientData(patientName, patientDOB, patientID);
    setPatientHash(hash);
    setHasSearched(true);
  };

  const handleReset = () => {
    setPatientName('');
    setPatientDOB('');
    setPatientID('');
    setPatientHash(undefined);
    setHasSearched(false);
    setPrescriptions([]);
  };

  const getStatusBadge = (status: PrescriptionStatus) => {
    const badges = {
      [PrescriptionStatus.Active]: 'bg-green-100 text-green-800',
      [PrescriptionStatus.Dispensed]: 'bg-blue-100 text-blue-800',
      [PrescriptionStatus.Cancelled]: 'bg-red-100 text-red-800',
      [PrescriptionStatus.Expired]: 'bg-gray-100 dark:bg-gray-700 text-gray-800',
    };
    const labels = {
      [PrescriptionStatus.Active]: 'Active',
      [PrescriptionStatus.Dispensed]: 'Dispensed',
      [PrescriptionStatus.Cancelled]: 'Cancelled',
      [PrescriptionStatus.Expired]: 'Expired',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Calculate abuse indicators
  const activePrescriptions = prescriptions.filter(
    (p) => p.status === PrescriptionStatus.Active
  );
  const totalPrescriptions = prescriptions.length;
  const dispensedCount = prescriptions.filter(
    (p) => p.status === PrescriptionStatus.Dispensed
  ).length;

  const hasMultipleActive = activePrescriptions.length > 1;
  const hasHighVolume = totalPrescriptions > 5;

  // Wallet/credential checks
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 dark:text-gray-100">Connect Your Wallet</h2>
            <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to access patient lookup.</p>
          </div>
        </main>
      </div>
    );
  }

  if (credentialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-600 dark:text-gray-300">Loading credential...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isDoctor || !hasValidCredential) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-600 dark:text-red-400">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You need a valid Doctor credential to access patient lookup.
            </p>
            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
              Return to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
          <WalletStatus />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Link href="/doctor" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold mb-2 dark:text-gray-100">Patient Prescription Lookup</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Search for a patient's prescription history to detect potential prescription abuse.
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold dark:text-gray-100">Patient Search</h2>
            </div>
            <form onSubmit={handleSearch} className="p-6">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-gray-300">Patient Full Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-gray-300">Date of Birth</label>
                  <input
                    type="date"
                    value={patientDOB}
                    onChange={(e) => setPatientDOB(e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-gray-300">Patient ID / SSN</label>
                  <input
                    type="text"
                    value={patientID}
                    onChange={(e) => setPatientID(e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Last 4 digits or full ID"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
                >
                  Search Patient History
                </button>
                {hasSearched && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                  >
                    Clear Search
                  </button>
                )}
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-100">
                  <strong>Privacy Notice:</strong> Patient data is hashed client-side. The blockchain
                  only stores the hash for verification. Access is logged for compliance.
                </p>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {hasSearched && (
            <>
              {historyLoading || statusesLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-300">Loading prescription history...</p>
                </div>
              ) : historyError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-8">
                  <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error Loading History</h3>
                  <p className="text-red-700 dark:text-red-300">
                    {historyError.message || 'Failed to load prescription history'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Abuse Detection Summary */}
                  {totalPrescriptions > 0 && (
                    <div className="grid md:grid-cols-4 gap-6 mb-8">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Prescriptions</div>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {totalPrescriptions}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</div>
                        <div className={`text-3xl font-bold ${hasMultipleActive ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                          {activePrescriptions.length}
                        </div>
                        {hasMultipleActive && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">⚠️ Multiple active</div>
                        )}
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dispensed</div>
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                          {dispensedCount}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Risk Level</div>
                        <div className={`text-2xl font-bold ${
                          hasMultipleActive || hasHighVolume ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {hasMultipleActive || hasHighVolume ? 'ELEVATED' : 'NORMAL'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prescription List */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-2xl font-bold dark:text-gray-100">Prescription History</h2>
                    </div>
                    <div className="p-6">
                      {prescriptions.length > 0 ? (
                        <>
                          {(hasMultipleActive || hasHighVolume) && (
                            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="text-2xl">⚠️</div>
                                <div>
                                  <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                                    Potential Prescription Abuse Detected
                                  </h4>
                                  <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                                    {hasMultipleActive && (
                                      <li>• Patient has {activePrescriptions.length} active prescriptions</li>
                                    )}
                                    {hasHighVolume && (
                                      <li>• High prescription volume ({totalPrescriptions} total)</li>
                                    )}
                                  </ul>
                                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                                    Review prescription history carefully before issuing new prescriptions.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            {prescriptions.map((prescription) => (
                              <div
                                key={prescription.id.toString()}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-lg dark:text-gray-100">
                                      Prescription #{prescription.id.toString()}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      Click to view full details
                                    </div>
                                  </div>
                                  <div>
                                    {getStatusBadge(prescription.status)}
                                  </div>
                                </div>
                                <div className="mt-4">
                                  <Link
                                    href={`/doctor/prescription/${prescription.id}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                                  >
                                    View Full Details →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="text-6xl mb-4">📋</div>
                          <p className="text-gray-600 dark:text-gray-300 mb-2">No prescriptions found for this patient.</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            This patient has no prescription history in the system.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Initial State */}
          {!hasSearched && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-2 dark:text-gray-100">Ready to Search</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Enter patient information above to view their prescription history.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
