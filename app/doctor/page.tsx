"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { useMyPrescriptions, useBatchPrescriptionStatus } from '@/lib/hooks/usePrescription';
import { CredentialType, PrescriptionStatus } from '@/lib/contracts/config';
import { Stethoscope } from 'lucide-react';

export default function DoctorDashboard() {
  // ✅ BACKEND LOGIC PRESERVED - All hooks and state management remain unchanged
  const { isConnected } = useAccount();
  const { credential, isLoading: credentialLoading } = useMyCredential();
  const { prescriptionIds, isLoading: prescriptionsLoading, refetch } = useMyPrescriptions();
  const { statuses } = useBatchPrescriptionStatus(prescriptionIds || []);

  const isDoctor = credential?.credentialType === CredentialType.Doctor;
  const hasValidCredential = credential?.isActive && BigInt(Date.now()) < credential.expiresAt * 1000n;

  useEffect(() => {
    console.log('[DoctorDashboard] Is Connected:', isConnected);
    console.log('[DoctorDashboard] Credential Loading:', credentialLoading);
    console.log('[DoctorDashboard] Credential:', credential);
    console.log('[DoctorDashboard] Is Doctor:', isDoctor);
    console.log('[DoctorDashboard] Has Valid Credential:', hasValidCredential);
    if (credential) {
      console.log('[DoctorDashboard] Credential Details:');
      console.log('  - Type:', credential.credentialType === CredentialType.Doctor ? 'Doctor' : 'Other');
      console.log('  - Is Active:', credential.isActive);
      console.log('  - Expires At:', new Date(Number(credential.expiresAt) * 1000).toISOString());
      console.log('  - Current Time:', new Date().toISOString());
      console.log('  - Is Expired:', BigInt(Date.now()) >= credential.expiresAt * 1000n);
    }
  }, [isConnected, credentialLoading, credential, isDoctor, hasValidCredential]);

  // ✅ NOT CONNECTED STATE - Backend logic preserved, only UI enhanced
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg" aria-hidden="true">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 dark:text-gray-100">Connect Your Wallet</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Please connect your wallet to access the doctor dashboard and manage prescriptions.</p>
            <WalletStatus />
          </div>
        </main>
      </div>
    );
  }

  // ✅ LOADING STATE - Backend logic preserved, only UI enhanced
  if (credentialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg" aria-hidden="true">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-6 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg" role="status" aria-live="polite">Loading credential information...</p>
          </div>
        </main>
      </div>
    );
  }

  // ✅ ACCESS DENIED STATE - Backend logic preserved, only UI enhanced
  if (!isDoctor || !hasValidCredential) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-900/30 dark:via-gray-800 dark:to-orange-900/30">
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg" aria-hidden="true">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-red-600 dark:text-red-400">Access Denied</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              You need a valid Doctor credential to access this dashboard. Please ensure you have completed KYC verification.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Return to Home</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ✅ BACKEND STATUS BADGE LOGIC PRESERVED - Only UI styling enhanced
  const getStatusBadge = (status: PrescriptionStatus) => {
    const badges = {
      [PrescriptionStatus.Active]: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 text-green-800 dark:text-green-200 border border-green-200',
      [PrescriptionStatus.Dispensed]: 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-800 dark:text-blue-200 border border-blue-200',
      [PrescriptionStatus.Cancelled]: 'bg-gradient-to-r from-red-50 dark:from-red-900/30 to-rose-50 text-red-800 dark:text-red-200 border border-red-200',
      [PrescriptionStatus.Expired]: 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-800 dark:text-gray-200 border border-gray-200',
    };
    const labels = {
      [PrescriptionStatus.Active]: 'Active',
      [PrescriptionStatus.Dispensed]: 'Dispensed',
      [PrescriptionStatus.Cancelled]: 'Cancelled',
      [PrescriptionStatus.Expired]: 'Expired',
    };
    const icons = {
      [PrescriptionStatus.Active]: '✓',
      [PrescriptionStatus.Dispensed]: '✓',
      [PrescriptionStatus.Cancelled]: '✕',
      [PrescriptionStatus.Expired]: '⏱',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${badges[status]}`}>
        <span aria-hidden="true">{icons[status]}</span>
        <span>{labels[status]}</span>
      </span>
    );
  };

  // ✅ MAIN DASHBOARD UI - Backend logic completely preserved
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Enhanced Header with Sticky Navigation */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg" aria-label="Go to home">
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg" aria-hidden="true">M</span>
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">MedChain</span>
            </Link>
            <WalletStatus />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section with Enhanced Typography */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-700 rounded-xl flex items-center justify-center">
                <span className="text-2xl" role="img" aria-label="Doctor">👨‍⚕️</span>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Doctor Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Welcome, <span className="font-semibold text-blue-600 dark:text-blue-400">Dr. {credential.specialty}</span> Specialist
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards with Icons */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700 p-6 group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Prescriptions</div>
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {prescriptionIds?.length || 0}
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">All time prescriptions issued</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700 p-6 group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Active Prescriptions</div>
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {statuses?.filter(s => s === PrescriptionStatus.Active).length || 0}
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Ready to be dispensed</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700 p-6 group sm:col-span-2 lg:col-span-1">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Dispensed</div>
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {statuses?.filter(s => s === PrescriptionStatus.Dispensed).length || 0}
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Successfully fulfilled</div>
            </div>
          </div>

          {/* Enhanced Action Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 mb-10 overflow-hidden">
            <div className="bg-slate-50 dark:bg-gray-800 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Actions</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <Link
                  href="/doctor/create"
                  className="group flex items-center gap-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white p-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-700"
                  aria-label="Create new prescription"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1">Create Prescription</div>
                    <div className="text-blue-100 text-sm">Issue a new verified prescription</div>
                  </div>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/doctor/lookup"
                  className="group flex items-center gap-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 p-6 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-700"
                  aria-label="Lookup patient history"
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1">Patient History</div>
                    <div className="text-gray-600 dark:text-gray-300 text-sm">Search medical records</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <strong className="font-semibold">Best Practice:</strong> Always review patient history before issuing prescriptions to detect potential drug interactions or abuse patterns.
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Prescriptions List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-slate-50 dark:bg-gray-800 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Prescriptions</h2>
                </div>
                {prescriptionIds && prescriptionIds.length > 0 && (
                  <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Refresh prescriptions list"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              {prescriptionsLoading ? (
                <div className="flex flex-col items-center justify-center py-16" role="status" aria-live="polite">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium">Loading prescriptions...</p>
                </div>
              ) : prescriptionIds && prescriptionIds.length > 0 ? (
                <div className="space-y-3">
                  {prescriptionIds.map((id, index) => (
                    <div
                      key={id.toString()}
                      className="group border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                              <span className="text-lg font-bold text-blue-700">#{id.toString()}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                Prescription #{id.toString()}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Tap to view full details and patient information
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {statuses && statuses[index] !== undefined && getStatusBadge(statuses[index])}
                          <Link
                            href={`/doctor/prescription/${id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={`View details for prescription ${id.toString()}`}
                          >
                            <span>View</span>
                            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Prescriptions Yet</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">You haven't created any prescriptions yet. Start by creating your first prescription.</p>
                  <Link
                    href="/doctor/create"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create First Prescription</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
