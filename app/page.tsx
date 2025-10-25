"use client";

import Link from 'next/link';
import { WalletStatus } from '@/components/WalletStatus';
import { useAccount } from 'wagmi';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { CredentialType } from '@/lib/contracts/config';

export default function Home() {
  const { isConnected } = useAccount();
  const { credential, isLoading } = useMyCredential();

  const getDashboardLink = () => {
    if (!isConnected || isLoading || !credential) return null;

    if (credential.credentialType === CredentialType.Doctor) {
      return '/doctor';
    } else if (credential.credentialType === CredentialType.Pharmacist) {
      return '/pharmacist';
    }
    return null;
  };

  const dashboardLink = getDashboardLink();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">MedChain</h1>
          <WalletStatus />
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Blockchain-Powered Healthcare
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Secure, decentralized prescription management using Base blockchain
          </p>

          {!isConnected ? (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
              <p className="text-lg mb-4">
                Connect your wallet to get started
              </p>
              <WalletStatus />
            </div>
          ) : dashboardLink ? (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
              <p className="text-lg mb-4">
                Welcome back! You have a verified {credential?.credentialType === CredentialType.Doctor ? 'Doctor' : 'Pharmacist'} credential.
              </p>
              <Link
                href={dashboardLink}
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
              <p className="text-lg mb-4">
                You don't have a verified credential yet. Please contact an administrator for KYC verification.
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <Link href="/doctor" className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
              <div className="text-4xl mb-4">👨‍⚕️</div>
              <h3 className="text-2xl font-bold mb-2">Doctors</h3>
              <p className="text-gray-600">
                Issue prescriptions with cryptographic verification
              </p>
            </Link>

            <Link href="/pharmacist" className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
              <div className="text-4xl mb-4">💊</div>
              <h3 className="text-2xl font-bold mb-2">Pharmacists</h3>
              <p className="text-gray-600">
                Verify and dispense prescriptions securely
              </p>
            </Link>

            <Link href="/patient" className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
              <div className="text-4xl mb-4">🧑‍🦱</div>
              <h3 className="text-2xl font-bold mb-2">Patients</h3>
              <p className="text-gray-600">
                View prescriptions with QR code (no wallet needed)
              </p>
            </Link>
          </div>

          <div className="mt-16 text-left bg-blue-50 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="text-2xl font-bold text-blue-600">1</div>
                <div>
                  <h4 className="font-bold">Healthcare Providers Get Verified</h4>
                  <p className="text-gray-600">
                    Doctors and pharmacists undergo KYC verification and receive non-transferable credential tokens
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl font-bold text-blue-600">2</div>
                <div>
                  <h4 className="font-bold">Doctors Issue Prescriptions</h4>
                  <p className="text-gray-600">
                    Create prescriptions on-chain with cryptographic hashes, stored securely on IPFS
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl font-bold text-blue-600">3</div>
                <div>
                  <h4 className="font-bold">Patients Receive QR Codes</h4>
                  <p className="text-gray-600">
                    No wallet needed - patients get QR codes containing secure access credentials
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl font-bold text-blue-600">4</div>
                <div>
                  <h4 className="font-bold">Pharmacists Verify & Dispense</h4>
                  <p className="text-gray-600">
                    Scan QR codes to verify authenticity and dispense medications securely
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t bg-white mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>Built on Base • Powered by OnChainKit • CalHacks 12.0</p>
        </div>
      </footer>
    </div>
  );
}
