"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { useMyDispensals } from '@/lib/hooks/usePrescription';
import { CredentialType } from '@/lib/contracts/config';

export default function PharmacistDashboard() {
  const { isConnected } = useAccount();
  const { credential, isLoading: credentialLoading } = useMyCredential();
  const { dispensalIds, isLoading: dispensalsLoading } = useMyDispensals();

  const isPharmacist = credential?.credentialType === CredentialType.Pharmacist;
  const hasValidCredential = credential?.isActive && BigInt(Date.now()) < credential.expiresAt * 1000n;

  useEffect(() => {
    console.log('[PharmacistDashboard] Is Connected:', isConnected);
    console.log('[PharmacistDashboard] Credential Loading:', credentialLoading);
    console.log('[PharmacistDashboard] Credential:', credential);
    console.log('[PharmacistDashboard] Is Pharmacist:', isPharmacist);
    console.log('[PharmacistDashboard] Has Valid Credential:', hasValidCredential);
    if (credential) {
      console.log('[PharmacistDashboard] Credential Details:');
      console.log('  - Type:', credential.credentialType === CredentialType.Pharmacist ? 'Pharmacist' : 'Other');
      console.log('  - Is Active:', credential.isActive);
      console.log('  - Expires At:', new Date(Number(credential.expiresAt) * 1000).toISOString());
      console.log('  - Current Time:', new Date().toISOString());
      console.log('  - Is Expired:', BigInt(Date.now()) >= credential.expiresAt * 1000n);
    }
  }, [isConnected, credentialLoading, credential, isPharmacist, hasValidCredential]);

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
            <p className="text-gray-600">Please connect your wallet to access the pharmacist dashboard.</p>
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

  if (!isPharmacist || !hasValidCredential) {
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
              You need a valid Pharmacist credential to access this dashboard.
            </p>
            <Link href="/" className="text-blue-600 hover:underline">
              Return to Home
            </Link>
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
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Pharmacist Dashboard</h1>
            <p className="text-gray-600">
              {credential.specialty} Pharmacy
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Total Dispensals</div>
              <div className="text-3xl font-bold text-purple-600">
                {dispensalIds?.length || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Credential Status</div>
              <div className="text-lg font-bold text-green-600">
                Active & Valid
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">Actions</h2>
            </div>
            <div className="p-6">
              <Link
                href="/pharmacist/dispense"
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
              >
                📷 Scan & Dispense Prescription
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">Dispensal History</h2>
            </div>
            <div className="p-6">
              {dispensalsLoading ? (
                <p className="text-gray-600">Loading dispensals...</p>
              ) : dispensalIds && dispensalIds.length > 0 ? (
                <div className="space-y-4">
                  {dispensalIds.map((id) => (
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
                            Dispensed prescription
                          </div>
                        </div>
                        <div>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Dispensed
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">You haven&apos;t dispensed any prescriptions yet.</p>
                  <Link
                    href="/pharmacist/dispense"
                    className="text-purple-600 hover:underline"
                  >
                    Scan your first prescription
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
