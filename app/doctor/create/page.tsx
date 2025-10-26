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
import { PdfDownloadButton } from '@/components/PdfDownloadButton';
import { EmailPrescriptionModal } from '@/components/EmailPrescriptionModal';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { PrescriptionPdfData } from '@/lib/utils/pdf';

export default function CreatePrescription() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { credential, isLoading: isLoadingCredential } = useMyCredential();
  const { createPrescription, isPending } = useCreatePrescription();

  const [step, setStep] = useState<'form' | 'qr'>('form');
  const [qrData, setQrData] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfData, setPdfData] = useState<PrescriptionPdfData | null>(null);
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

      // 5. Create prescription on blockchain and get the prescription ID
      const prescriptionIdBigInt = await createPrescription(
        patientHash,
        prescriptionHash,
        ipfsCid,
        BigInt(validityDays),
        patientSecret
      );

      console.log('[CreatePrescription] Prescription created with ID:', prescriptionIdBigInt.toString());

      // 6. Generate QR code
      const qrPayload: PrescriptionQRData = {
        prescriptionId: prescriptionIdBigInt.toString(),
        patientDataHash: patientHash,
        prescriptionDataHash: prescriptionHash,
        patientSecret,
        registryAddress: CONTRACTS.PrescriptionRegistry.address,
      };

      const qrString = encodePrescriptionQR(qrPayload);
      setQrData(qrString);
      setPrescriptionId(prescriptionIdBigInt.toString());

      // Prepare PDF data for later use
      const prescriptionPdfData: PrescriptionPdfData = {
        prescriptionId: prescriptionIdBigInt.toString(),
        patientName,
        medication,
        dosage,
        quantity,
        refills: parseInt(refills),
        instructions,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + parseInt(validityDays) * 24 * 60 * 60 * 1000),
        doctorTokenId: address?.slice(0, 10) || 'N/A', // Use wallet address prefix as identifier
        qrCodeDataUrl: '', // Will be set in the QR step
      };
      setPdfData(prescriptionPdfData);

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

  // Convert QR code SVG to data URL for PDF
  const getQRDataUrl = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!qrRef.current) {
        reject(new Error('QR ref not found'));
        return;
      }

      const svg = qrRef.current.querySelector('svg');
      if (!svg) {
        reject(new Error('QR SVG not found'));
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load QR image'));
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    });
  };

  // Show loading state while checking credential
  if (isConnected && isLoadingCredential) {
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

  if (!isConnected || !isDoctor) {
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
            <p className="text-gray-600 dark:text-gray-300 mb-4">You need a valid Doctor credential to create prescriptions.</p>
            {!isConnected && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Please connect your wallet above.</p>
            )}
            {isConnected && !isDoctor && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your connected wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) does not have a Doctor credential.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (step === 'qr') {
    // Get complete PDF data with QR code
    const getPdfDataWithQR = async (): Promise<PrescriptionPdfData | null> => {
      if (!pdfData) return null;
      try {
        const qrDataUrl = await getQRDataUrl();
        return { ...pdfData, qrCodeDataUrl: qrDataUrl };
      } catch (error) {
        console.error('Error getting QR data URL:', error);
        return null;
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="text-green-600 dark:text-green-400 text-6xl mb-4">✓</div>
              <h2 className="text-3xl font-bold mb-4 dark:text-gray-100">Prescription Created!</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Give this QR code to your patient. They can use it to view their prescription and pharmacists can use it to dispense the medication.
              </p>

              <div ref={qrRef} className="flex justify-center mb-8 bg-white dark:bg-gray-100 p-8 rounded-lg inline-block">
                <QRCodeSVG value={qrData} size={300} level="H" />
              </div>

              <div className="space-y-3">
                {pdfData && (
                  <button
                    onClick={() => setIsPdfPreviewOpen(true)}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    👁️ Preview PDF
                  </button>
                )}

                <button
                  onClick={downloadQR}
                  className="w-full bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
                >
                  📱 Download QR Code
                </button>

                {pdfData && (
                  <PdfDownloadButton
                    prescriptionData={pdfData}
                    className="w-full"
                    variant="primary"
                    getQrDataUrl={getQRDataUrl}
                  />
                )}

                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  📧 Email to Patient
                </button>

                <Link
                  href="/doctor"
                  className="block w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                >
                  Return to Dashboard
                </Link>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-left">
                <p className="text-sm text-yellow-800 dark:text-yellow-100">
                  <strong>Important:</strong> Make sure the patient saves this QR code. They will need it to view their prescription and for the pharmacist to dispense it.
                </p>
              </div>
            </div>
          </div>
        </main>

        {pdfData && address && (
          <>
            <EmailPrescriptionModal
              isOpen={isEmailModalOpen}
              onClose={() => setIsEmailModalOpen(false)}
              prescriptionData={pdfData}
              prescriptionId={prescriptionId}
              doctorAddress={address}
              getQrDataUrl={getQRDataUrl}
            />
            <PdfPreviewModal
              isOpen={isPdfPreviewOpen}
              onClose={() => setIsPdfPreviewOpen(false)}
              prescriptionData={pdfData}
              getQrDataUrl={getQRDataUrl}
            />
          </>
        )}
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link href="/doctor" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold dark:text-gray-100">Create Prescription</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Patient Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">Full Name</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      required
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">Patient ID / SSN</label>
                    <input
                      type="text"
                      value={patientID}
                      onChange={(e) => setPatientID(e.target.value)}
                      required
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      placeholder="Patient identifier"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Prescription Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">Medication</label>
                    <input
                      type="text"
                      value={medication}
                      onChange={(e) => setMedication(e.target.value)}
                      required
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      placeholder="e.g., Amoxicillin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">Dosage</label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      required
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      placeholder="e.g., 500mg twice daily"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-gray-300">Quantity</label>
                      <input
                        type="text"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        placeholder="e.g., 30 tablets"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-gray-300">Refills</label>
                      <input
                        type="number"
                        value={refills}
                        onChange={(e) => setRefills(e.target.value)}
                        required
                        min="0"
                        max="12"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">Instructions</label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      required
                      rows={4}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      placeholder="Special instructions for the patient..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">Valid For (Days)</label>
                    <input
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      required
                      min="1"
                      max="365"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      How long this prescription remains valid for dispensing
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting || isPending}
                  className="w-full bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isSubmitting || isPending ? 'Creating Prescription...' : 'Create Prescription'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
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
