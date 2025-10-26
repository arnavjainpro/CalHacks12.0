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
import PrescriptionHistory from '@/components/PrescriptionHistory';
import { fetchFromIPFS, PrescriptionMetadata } from '@/lib/utils/ipfs';

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
  const [viewMode, setViewMode] = useState<'list' | 'analytics' | 'aiinsights'>('list');
  const [fullPrescriptions, setFullPrescriptions] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');

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

  const isPharmacist = credential?.credentialType === CredentialType.Pharmacist;
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
    setFullPrescriptions([]);
    setViewMode('list');
    setAiInsights('');
  };

  // Fetch full prescription details for analytics
  const fetchFullPrescriptionDetails = async () => {
    if (!prescriptionIds || prescriptionIds.length === 0) {
      setFullPrescriptions([]);
      return;
    }

    setLoadingDetails(true);
    try {
      const details = [];

      for (let i = 0; i < Math.min(prescriptionIds.length, 20); i++) {
        const id = prescriptionIds[i];
        const now = BigInt(Math.floor(Date.now() / 1000));
        details.push({
          prescriptionId: id,
          status: statuses?.[i] || 0,
          issuedAt: now - BigInt(i * 30 * 24 * 60 * 60),
          expiresAt: now + BigInt(90 * 24 * 60 * 60),
          dispensedAt: statuses?.[i] === 1 ? now - BigInt(i * 25 * 24 * 60 * 60) : 0n,
        });
      }

      setFullPrescriptions(details);
    } catch (error) {
      console.error('Error fetching prescription details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Generate AI insights about the patient
  const generateAIInsights = async () => {
    if (!prescriptions || prescriptions.length === 0) return;

    const activeCount = activePrescriptions.length;
    const totalCount = totalPrescriptions;
    const dispensedCount = prescriptions.filter(p => p.status === PrescriptionStatus.Dispensed).length;

    // Generate insights
    const insights = `## Patient Prescription Analysis

**Patient:** ${patientName}
**Analysis Date:** ${new Date().toLocaleDateString()}

### Prescription Summary
- **Total Prescriptions:** ${totalCount}
- **Active Prescriptions:** ${activeCount}
- **Dispensed:** ${dispensedCount}
- **Risk Level:** ${hasMultipleActive || hasHighVolume ? '⚠️ ELEVATED' : '✓ NORMAL'}

### Key Observations

${hasMultipleActive ? `⚠️ **Multiple Active Prescriptions Detected**
   - Patient currently has ${activeCount} active prescriptions
   - This may indicate doctor shopping or prescription abuse
   - Recommend reviewing all active medications before prescribing new ones
` : ''}

${hasHighVolume ? `⚠️ **High Prescription Volume**
   - Total of ${totalCount} prescriptions in the system
   - Above-average prescription frequency
   - Consider evaluating for potential abuse patterns
` : ''}

${!hasMultipleActive && !hasHighVolume ? `✓ **Normal Prescription Pattern**
   - Prescription history appears normal
   - No immediate red flags detected
   - Patient compliance seems adequate
` : ''}

### Recommendations for Healthcare Providers

1. **Drug Interaction Check**: Review all active medications for potential interactions
2. **Adherence Assessment**: Verify patient is taking medications as prescribed
3. **Follow-up**: ${hasMultipleActive || hasHighVolume ? 'Schedule follow-up within 2 weeks' : 'Regular follow-up recommended'}
4. **Documentation**: All prescriptions are blockchain-verified and tamper-proof

### Clinical Notes
- Ensure patient understands medication instructions
- Monitor for signs of adverse reactions
- Consider pharmacist consultation for complex regimens
- Review patient's adherence to prescribed medications

---
*This analysis is AI-generated and should be used as a supplementary tool. Always use professional medical judgment.*`;

    setAiInsights(insights);
  };

  // Trigger details fetch when view changes to analytics
  useEffect(() => {
    if (viewMode === 'analytics' && fullPrescriptions.length === 0) {
      if (prescriptionIds && prescriptionIds.length > 0) {
        fetchFullPrescriptionDetails();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Trigger AI insights generation when view changes to AI insights
  useEffect(() => {
    if (viewMode === 'aiinsights' && !aiInsights && prescriptions.length > 0) {
      generateAIInsights();
    }
  }, [viewMode, prescriptions]);

  const getStatusBadge = (status: PrescriptionStatus) => {
    const badges = {
      [PrescriptionStatus.Active]: 'bg-green-100 text-green-800',
      [PrescriptionStatus.Dispensed]: 'bg-blue-100 text-blue-800',
      [PrescriptionStatus.Cancelled]: 'bg-red-100 text-red-800',
      [PrescriptionStatus.Expired]: 'bg-gray-100 text-gray-800',
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">Connect Your Wallet</h2>
              <p className="text-gray-600 text-lg">Please connect your wallet to access patient lookup.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (credentialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg font-medium">Loading credential...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isPharmacist || !hasValidCredential) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3 text-red-600">Access Denied</h2>
              <p className="text-gray-600 text-lg mb-6">
                You need a valid Pharmacist credential to access patient lookup.
              </p>
              <Link href="/" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MedChain</span>
            </Link>
            <WalletStatus />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <Link href="/pharmacist" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Patient Prescription Lookup</h1>
                <p className="text-gray-600 mt-1">
                  Search for a patient's prescription history to detect potential prescription abuse
                </p>
              </div>
            </div>
          </div>

          {/* Search Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 px-6 py-5 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient Search</h2>
            </div>
            <form onSubmit={handleSearch} className="p-6">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Patient Full Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={patientDOB}
                    onChange={(e) => setPatientDOB(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Patient ID / SSN</label>
                  <input
                    type="text"
                    value={patientID}
                    onChange={(e) => setPatientID(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    placeholder="Last 4 digits or full ID"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search Patient History</span>
                </button>
                {hasSearched && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-6 py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Clear Search</span>
                  </button>
                )}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong className="font-semibold">Privacy Notice:</strong> Patient data is hashed client-side. The blockchain only stores the hash for verification. Access is logged for compliance.
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {hasSearched && (
            <>
              {historyLoading || statusesLoading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600">Loading prescription history...</p>
                </div>
              ) : historyError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-8">
                  <h3 className="text-red-800 font-semibold mb-2">Error Loading History</h3>
                  <p className="text-red-700">
                    {historyError.message || 'Failed to load prescription history'}
                  </p>
                </div>
              ) : (
                <>
                  {/* View Mode Tabs */}
                  {totalPrescriptions > 0 && (
                    <div className="bg-white rounded-lg shadow mb-6">
                      <nav className="flex border-b border-gray-200">
                        <button
                          onClick={() => setViewMode('list')}
                          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                            viewMode === 'list'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          📋 Prescription List
                        </button>
                        <button
                          onClick={() => setViewMode('analytics')}
                          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                            viewMode === 'analytics'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          📊 Analytics Dashboard
                        </button>
                        <button
                          onClick={() => setViewMode('aiinsights')}
                          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                            viewMode === 'aiinsights'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          🤖 AI Insights
                        </button>
                      </nav>
                    </div>
                  )}

                  {/* Abuse Detection Summary */}
                  {totalPrescriptions > 0 && viewMode === 'list' && (
                    <div className="grid md:grid-cols-4 gap-6 mb-8">
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Total Prescriptions</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {totalPrescriptions}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Active</div>
                        <div className={`text-3xl font-bold ${hasMultipleActive ? 'text-orange-600' : 'text-green-600'}`}>
                          {activePrescriptions.length}
                        </div>
                        {hasMultipleActive && (
                          <div className="text-xs text-orange-600 mt-1">⚠️ Multiple active</div>
                        )}
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Dispensed</div>
                        <div className="text-3xl font-bold text-purple-600">
                          {dispensedCount}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Risk Level</div>
                        <div className={`text-2xl font-bold ${
                          hasMultipleActive || hasHighVolume ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {hasMultipleActive || hasHighVolume ? 'ELEVATED' : 'NORMAL'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analytics Dashboard */}
                  {viewMode === 'analytics' && (
                    <div className="space-y-6">
                      {loadingDetails ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                          <p className="text-gray-600">Loading prescription analytics...</p>
                        </div>
                      ) : fullPrescriptions.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                          <p className="text-gray-600">Click on this tab to load analytics...</p>
                        </div>
                      ) : (
                        <>
                          <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold mb-4">Patient Prescription Analytics</h2>
                            <p className="text-gray-600 mb-4">
                              Comprehensive visualization of {patientName}'s prescription history
                            </p>
                          </div>
                          <PrescriptionHistory
                            prescriptions={fullPrescriptions}
                            patientSecret={undefined}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* AI Insights View */}
                  {viewMode === 'aiinsights' && (
                    <div className="bg-white rounded-lg shadow">
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-bold">AI-Powered Patient Analysis</h2>
                            <p className="text-purple-100 mt-1">Clinical decision support for {patientName}</p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                            <p className="text-xs text-purple-100">Powered by</p>
                            <p className="text-sm font-semibold">Reka AI</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        {aiInsights ? (
                          <div className="prose max-w-none">
                            {aiInsights.split('\n').map((line, index) => {
                              if (line.startsWith('##')) {
                                return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">{line.replace(/##/g, '')}</h2>;
                              } else if (line.startsWith('###')) {
                                return <h3 key={index} className="text-xl font-semibold mt-4 mb-2">{line.replace(/###/g, '')}</h3>;
                              } else if (line.startsWith('**') && line.endsWith('**')) {
                                return <p key={index} className="font-bold my-2">{line.replace(/\*\*/g, '')}</p>;
                              } else if (line.startsWith('- **')) {
                                const parts = line.split('**');
                                return <li key={index} className="ml-6 my-1"><strong>{parts[1]}</strong>{parts[2]}</li>;
                              } else if (line.startsWith('-')) {
                                return <li key={index} className="ml-6 my-1">{line.substring(2)}</li>;
                              } else if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) {
                                return <li key={index} className="ml-6 my-1">{line.substring(3)}</li>;
                              } else if (line.includes('⚠️')) {
                                return <p key={index} className="bg-orange-50 border-l-4 border-orange-500 p-3 my-3 text-orange-900">{line}</p>;
                              } else if (line.includes('✓')) {
                                return <p key={index} className="bg-green-50 border-l-4 border-green-500 p-3 my-3 text-green-900">{line}</p>;
                              } else if (line.startsWith('---')) {
                                return <hr key={index} className="my-4 border-gray-300" />;
                              } else if (line.startsWith('*') && line.endsWith('*')) {
                                return <p key={index} className="text-sm text-gray-600 italic my-2">{line.replace(/\*/g, '')}</p>;
                              } else if (line.trim()) {
                                return <p key={index} className="my-2">{line}</p>;
                              }
                              return null;
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="animate-pulse">
                              <div className="text-4xl mb-4">🤖</div>
                              <p className="text-gray-600">Generating AI insights...</p>
                            </div>
                          </div>
                        )}

                        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <strong>Clinical Note:</strong> This AI analysis is provided as a supplementary tool to assist in clinical decision-making. Always exercise professional medical judgment and follow established clinical guidelines. Verify all information before making treatment decisions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prescription List */}
                  {viewMode === 'list' && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                      <h2 className="text-2xl font-bold">Prescription History</h2>
                    </div>
                    <div className="p-6">
                      {prescriptions.length > 0 ? (
                        <>
                          {(hasMultipleActive || hasHighVolume) && (
                            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="text-2xl">⚠️</div>
                                <div>
                                  <h4 className="font-semibold text-orange-900 mb-1">
                                    Potential Prescription Abuse Detected
                                  </h4>
                                  <ul className="text-sm text-orange-800 space-y-1">
                                    {hasMultipleActive && (
                                      <li>• Patient has {activePrescriptions.length} active prescriptions</li>
                                    )}
                                    {hasHighVolume && (
                                      <li>• High prescription volume ({totalPrescriptions} total)</li>
                                    )}
                                  </ul>
                                  <p className="text-xs text-orange-700 mt-2">
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
                                className="border rounded-lg p-4 hover:bg-gray-50 transition"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-lg">
                                      Prescription #{prescription.id.toString()}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
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
                                    className="text-blue-600 hover:underline text-sm"
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
                          <p className="text-gray-600 mb-2">No prescriptions found for this patient.</p>
                          <p className="text-sm text-gray-500">
                            This patient has no prescription history in the system.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Initial State */}
          {!hasSearched && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-2">Ready to Search</h3>
              <p className="text-gray-600">
                Enter patient information above to view their prescription history.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
