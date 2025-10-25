"use client";

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { QRCodeSVG } from 'qrcode.react';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { useCreatePrescription } from '@/lib/hooks/usePrescription';
import { CredentialType, PrescriptionQRData, CONTRACTS } from '@/lib/contracts/config';
import {
  hashPatientData,
  hashPrescriptionData,
  generatePatientSecret,
  deriveEncryptionKey,
  encryptData,
} from '@/lib/utils/crypto';
import { uploadPrescriptionToIPFS, PrescriptionMetadata } from '@/lib/utils/ipfs';
import { encodePrescriptionQR } from '@/lib/utils/qr';

export default function CreatePrescription() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { credential } = useMyCredential();
  const { createPrescription, isPending } = useCreatePrescription();

  const [step, setStep] = useState<'form' | 'qr'>('form');
  const [qrData, setQrData] = useState<string>('');
  const [prescriptionId, setPrescriptionId] = useState<string>('');
  const qrRef = useRef<HTMLDivElement>(null);

  // Form state
  const [patientName, setPatientName] = useState('');
  const [patientDOB, setPatientDOB] = useState('');
  const [patientID, setPatientID] = useState('');
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [quantity, setQuantity] = useState('');
  const [refills, setRefills] = useState('0');
  const [instructions, setInstructions] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDoctor = credential?.credentialType === CredentialType.Doctor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 1. Generate patient secret
      const patientSecret = generatePatientSecret();

      // 2. Hash patient and prescription data
      const patientHash = hashPatientData(patientName, patientDOB, patientID);
      const prescriptionHash = hashPrescriptionData(
        medication,
        dosage,
        quantity,
        parseInt(refills)
      );

      // 3. Encrypt sensitive data for IPFS
      const encryptionKey = deriveEncryptionKey(patientSecret);
      const encryptedPatientName = encryptData(patientName, encryptionKey);
      const encryptedPatientDOB = encryptData(patientDOB, encryptionKey);
      const encryptedPatientID = encryptData(patientID, encryptionKey);

      // 4. Upload to IPFS
      const metadata: PrescriptionMetadata = {
        medication,
        dosage,
        quantity,
        refills: parseInt(refills),
        instructions,
        patientName: encryptedPatientName,
        patientDOB: encryptedPatientDOB,
        patientID: encryptedPatientID,
      };

      const ipfsCid = await uploadPrescriptionToIPFS(metadata);

      // 5. Create prescription on blockchain
      const txHash = await createPrescription(
        patientHash,
        prescriptionHash,
        ipfsCid,
        BigInt(validityDays),
        patientSecret
      );

      // Get prescription ID from transaction receipt (simplified)
      // In production, you'd parse the transaction receipt for the event
      // For now, we'll use a placeholder since we need to listen to events
      const newPrescriptionId = 'pending'; // Parse from event logs in production

      // 6. Generate QR code
      const qrPayload: PrescriptionQRData = {
        prescriptionId: newPrescriptionId,
        patientDataHash: patientHash,
        prescriptionDataHash: prescriptionHash,
        patientSecret,
        registryAddress: CONTRACTS.PrescriptionRegistry.address,
      };

      const qrString = encodePrescriptionQR(qrPayload);
      setQrData(qrString);
      setPrescriptionId(newPrescriptionId);
      setStep('qr');
    } catch (err: any) {
      console.error('Error creating prescription:', err);
      setError(err.message || 'Failed to create prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQR = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `prescription-${prescriptionId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!isConnected || !isDoctor) {
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
            <p className="text-gray-600">You need a valid Doctor credential to create prescriptions.</p>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'qr') {
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
              <h2 className="text-3xl font-bold mb-4">Prescription Created!</h2>
              <p className="text-gray-600 mb-8">
                Give this QR code to your patient. They can use it to view their prescription and pharmacists can use it to dispense the medication.
              </p>

              <div ref={qrRef} className="flex justify-center mb-8 bg-white p-8 rounded-lg inline-block">
                <QRCodeSVG value={qrData} size={300} level="H" />
              </div>

              <div className="space-y-4">
                <button
                  onClick={downloadQR}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Download QR Code
                </button>
                <Link
                  href="/doctor"
                  className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Return to Dashboard
                </Link>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Make sure the patient saves this QR code. They will need it to view their prescription and for the pharmacist to dispense it.
                </p>
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
            <Link href="/doctor" className="text-blue-600 hover:underline mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold">Create Prescription</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Patient Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      required
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={patientDOB}
                      onChange={(e) => setPatientDOB(e.target.value)}
                      required
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Patient ID / SSN</label>
                    <input
                      type="text"
                      value={patientID}
                      onChange={(e) => setPatientID(e.target.value)}
                      required
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="Patient identifier"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Prescription Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Medication</label>
                    <input
                      type="text"
                      value={medication}
                      onChange={(e) => setMedication(e.target.value)}
                      required
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="e.g., Amoxicillin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Dosage</label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      required
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="e.g., 500mg twice daily"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Quantity</label>
                      <input
                        type="text"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        className="w-full border rounded-lg px-4 py-2"
                        placeholder="e.g., 30 tablets"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Refills</label>
                      <input
                        type="number"
                        value={refills}
                        onChange={(e) => setRefills(e.target.value)}
                        required
                        min="0"
                        max="12"
                        className="w-full border rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Instructions</label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      required
                      rows={4}
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="Special instructions for the patient..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Valid For (Days)</label>
                    <input
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      required
                      min="1"
                      max="365"
                      className="w-full border rounded-lg px-4 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      How long this prescription remains valid for dispensing
                    </p>
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
                  {isSubmitting || isPending ? 'Creating Prescription...' : 'Create Prescription'}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  This will create a prescription on the blockchain and generate a QR code for the patient
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
