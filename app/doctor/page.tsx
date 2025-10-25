"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { useMyPrescriptions, useBatchPrescriptionStatus } from '@/lib/hooks/usePrescription';
import { CredentialType, PrescriptionStatus } from '@/lib/contracts/config';

export default function DoctorDashboard() {
  const { isConnected } = useAccount();
  const { credential, isLoading: credentialLoading } = useMyCredential();
  const { prescriptionIds, isLoading: prescriptionsLoading, refetch } = useMyPrescriptions();
  const { statuses } = useBatchPrescriptionStatus(prescriptionIds || []);

  const isDoctor = credential?.credentialType === CredentialType.Doctor;
  const hasValidCredential = credential?.isActive && BigInt(Date.now()) < credential.expiresAt * 1000n;

  if (!isConnected) {
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
            <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600">Please connect your wallet to access the doctor dashboard.</p>
          </div>
        </main>
      </div>
    );
  }

  if (credentialLoading) {
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
            <p className="text-gray-600">Loading credential...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isDoctor || !hasValidCredential) {
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
            <p className="text-gray-600 mb-4">
              You need a valid Doctor credential to access this dashboard.
            </p>
            <Link href="/" className="text-blue-600 hover:underline">
              Return to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">MedChain</Link>
          <WalletStatus />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Doctor Dashboard</h1>
            <p className="text-gray-600">
              Welcome, Dr. {credential.specialty} Specialist
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Total Prescriptions</div>
              <div className="text-3xl font-bold text-blue-600">
                {prescriptionIds?.length || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Active Prescriptions</div>
              <div className="text-3xl font-bold text-green-600">
                {statuses?.filter(s => s === PrescriptionStatus.Active).length || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Dispensed</div>
              <div className="text-3xl font-bold text-purple-600">
                {statuses?.filter(s => s === PrescriptionStatus.Dispensed).length || 0}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">Actions</h2>
            </div>
            <div className="p-6">
              <Link
                href="/doctor/create"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                + Create New Prescription
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">My Prescriptions</h2>
            </div>
            <div className="p-6">
              {prescriptionsLoading ? (
                <p className="text-gray-600">Loading prescriptions...</p>
              ) : prescriptionIds && prescriptionIds.length > 0 ? (
                <div className="space-y-4">
                  {prescriptionIds.map((id, index) => (
                    <div
                      key={id.toString()}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-lg">
                            Prescription #{id.toString()}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Click to view details
                          </div>
                        </div>
                        <div>
                          {statuses && statuses[index] !== undefined && getStatusBadge(statuses[index])}
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link
                          href={`/doctor/prescription/${id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">You haven't created any prescriptions yet.</p>
                  <Link
                    href="/doctor/create"
                    className="text-blue-600 hover:underline"
                  >
                    Create your first prescription
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
