"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { WalletStatus } from '@/components/WalletStatus';
import { useIssueCredential, useTotalCredentials } from '@/lib/hooks/useCredential';
import { CredentialType } from '@/lib/contracts/config';
import { hashLicenseData } from '@/lib/utils/crypto';
import { uploadCredentialToIPFS, CredentialMetadata } from '@/lib/utils/ipfs';

export default function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const { issueCredential, isPending } = useIssueCredential();
  const { totalSupply } = useTotalCredentials();

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [holderAddress, setHolderAddress] = useState('');
  const [credentialType, setCredentialType] = useState<CredentialType>(CredentialType.Doctor);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [validityYears, setValidityYears] = useState('3');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // 1. Hash license number for privacy
      const licenseHash = hashLicenseData(licenseNumber);

      // 2. Upload credential metadata to IPFS
      const metadata: CredentialMetadata = {
        licenseNumber: licenseHash,
        specialty,
        institutionName,
        verifiedAt: Date.now(),
        verifiedBy: address!,
      };

      const ipfsCid = await uploadCredentialToIPFS(metadata);

      // 3. Issue credential on blockchain
      await issueCredential(
        holderAddress as Address,
        credentialType,
        licenseHash,
        specialty,
        ipfsCid,
        BigInt(validityYears)
      );

      setSuccess('Credential issued successfully!');
      setShowIssueForm(false);

      // Reset form
      setHolderAddress('');
      setLicenseNumber('');
      setSpecialty('');
      setInstitutionName('');
      setValidityYears('3');
    } catch (err: any) {
      console.error('Error issuing credential:', err);
      setError(err.message || 'Failed to issue credential');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p className="text-gray-600">Please connect your admin wallet to access the dashboard.</p>
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
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">
              Manage credentials and verify healthcare providers
            </p>
          </div>

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              {success}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Total Credentials Issued</div>
              <div className="text-3xl font-bold text-blue-600">
                {totalSupply?.toString() || '0'}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Admin Address</div>
              <div className="text-sm font-mono mt-2 text-gray-800">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <div className="text-lg font-bold text-green-600">
                Active
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">Issue New Credential</h2>
              <button
                onClick={() => setShowIssueForm(!showIssueForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {showIssueForm ? 'Cancel' : '+ New Credential'}
              </button>
            </div>

            {showIssueForm && (
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Provider Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Wallet Address *
                        </label>
                        <input
                          type="text"
                          value={holderAddress}
                          onChange={(e) => setHolderAddress(e.target.value)}
                          required
                          className="w-full border rounded-lg px-4 py-2"
                          placeholder="0x..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Credential Type *
                        </label>
                        <select
                          value={credentialType}
                          onChange={(e) => setCredentialType(parseInt(e.target.value) as CredentialType)}
                          className="w-full border rounded-lg px-4 py-2"
                        >
                          <option value={CredentialType.Doctor}>Doctor</option>
                          <option value={CredentialType.Pharmacist}>Pharmacist</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          License Number *
                        </label>
                        <input
                          type="text"
                          value={licenseNumber}
                          onChange={(e) => setLicenseNumber(e.target.value)}
                          required
                          className="w-full border rounded-lg px-4 py-2"
                          placeholder="Medical license number"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This will be hashed for privacy
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Specialty *
                        </label>
                        <input
                          type="text"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          required
                          className="w-full border rounded-lg px-4 py-2"
                          placeholder="e.g., Cardiology, Retail Pharmacy"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Institution Name *
                        </label>
                        <input
                          type="text"
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                          required
                          className="w-full border rounded-lg px-4 py-2"
                          placeholder="Hospital or pharmacy name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Validity Period (Years) *
                        </label>
                        <input
                          type="number"
                          value={validityYears}
                          onChange={(e) => setValidityYears(e.target.value)}
                          required
                          min="1"
                          max="10"
                          className="w-full border rounded-lg px-4 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                      {error}
                    </div>
                  )}

                  <div className="border-t pt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting || isPending}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isSubmitting || isPending ? 'Issuing Credential...' : 'Issue Credential'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      This will create a Soul-Bound Token (SBT) that cannot be transferred
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">KYC Verification Process</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Verify Provider Identity</h4>
                    <p className="text-sm text-gray-600">
                      Confirm identity documents, medical license, and professional credentials
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Upload Documents to IPFS</h4>
                    <p className="text-sm text-gray-600">
                      Store verification documents securely on IPFS with encryption
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">Issue Credential on Blockchain</h4>
                    <p className="text-sm text-gray-600">
                      Create a Soul-Bound Token that verifies the provider's credentials
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold">Provider Can Now Access Dashboard</h4>
                    <p className="text-sm text-gray-600">
                      Once verified, providers can create/dispense prescriptions based on their role
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
