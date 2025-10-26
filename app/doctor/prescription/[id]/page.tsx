"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { QRCodeSVG } from 'qrcode.react';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { usePrescriptionAsDoctor } from '@/lib/hooks/usePrescription';
import { CredentialType, PrescriptionStatus, CONTRACTS, PrescriptionQRData } from '@/lib/contracts/config';
import { fetchFromIPFS, PrescriptionMetadata } from '@/lib/utils/ipfs';
import { PdfDownloadButton } from '@/components/PdfDownloadButton';
import { EmailPrescriptionModal } from '@/components/EmailPrescriptionModal';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { PrescriptionPdfData } from '@/lib/utils/pdf';
import { encodePrescriptionQR } from '@/lib/utils/qr';
import { decryptData, deriveEncryptionKey } from '@/lib/utils/crypto';

export default function PrescriptionDetails() {
  const params = useParams();
  const prescriptionId = params.id ? BigInt(params.id as string) : undefined;

  const { isConnected, address } = useAccount();
  const { credential, isLoading: isLoadingCredential } = useMyCredential();
  const { prescription, isLoading, error } = usePrescriptionAsDoctor(prescriptionId);

  const [metadata, setMetadata] = useState<PrescriptionMetadata | null>(null);
  const [metadataError, setMetadataError] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [qrData, setQrData] = useState<string>('');
  const [pdfData, setPdfData] = useState<PrescriptionPdfData | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const isDoctor = credential?.credentialType === CredentialType.Doctor;

  // Fetch metadata from IPFS when prescription is loaded
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!prescription || !prescription.ipfsCid) return;

      try {
        setIsLoadingMetadata(true);
        setMetadataError('');

        const ipfsData = await fetchFromIPFS<PrescriptionMetadata>(prescription.ipfsCid);
        setMetadata(ipfsData);

        // Decrypt patient name
        const encryptionKey = deriveEncryptionKey(prescription.patientSecret);
        const decryptedName = decryptData(ipfsData.patientName, encryptionKey);

        // Generate QR code data
        const qrPayload: PrescriptionQRData = {
          prescriptionId: prescription.prescriptionId.toString(),
          patientDataHash: prescription.patientDataHash,
          prescriptionDataHash: prescription.prescriptionDataHash,
          patientSecret: prescription.patientSecret,
          registryAddress: CONTRACTS.PrescriptionRegistry.address,
        };
        const qrString = encodePrescriptionQR(qrPayload);
        setQrData(qrString);

        // Prepare PDF data
        const prescriptionPdfData: PrescriptionPdfData = {
          prescriptionId: prescription.prescriptionId.toString(),
          patientName: decryptedName,
          medication: ipfsData.medication,
          dosage: ipfsData.dosage,
          quantity: ipfsData.quantity,
          refills: ipfsData.refills,
          instructions: ipfsData.instructions,
          issuedAt: new Date(Number(prescription.issuedAt) * 1000),
          expiresAt: new Date(Number(prescription.expiresAt) * 1000),
          doctorTokenId: prescription.doctorTokenId.toString(),
          qrCodeDataUrl: '', // Will be generated on demand
        };
        setPdfData(prescriptionPdfData);
      } catch (err) {
        console.error('[PrescriptionDetails] Error fetching IPFS metadata:', err);
        setMetadataError((err as Error).message || 'Failed to fetch prescription details from IPFS');
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [prescription]);

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

  useEffect(() => {
    console.log('[PrescriptionDetails] Prescription ID:', prescriptionId?.toString());
    console.log('[PrescriptionDetails] Loading:', isLoading);
    console.log('[PrescriptionDetails] Error:', error);
    console.log('[PrescriptionDetails] Prescription:', prescription);
  }, [prescriptionId, isLoading, error, prescription]);

  // Show loading state while checking credential
  if (isConnected && isLoadingCredential) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Checking Credentials...</h2>
              <p className="text-gray-600 dark:text-gray-300">Please wait while we verify your access.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isConnected || !isDoctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-600 dark:text-red-400">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">You need a valid Doctor credential to view prescriptions.</p>
            {!isConnected && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Please connect your wallet above.</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">📄</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Loading Prescription...</h2>
              <p className="text-gray-600 dark:text-gray-300">Please wait while we fetch the details.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
            <WalletStatus />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-600 dark:text-red-400">Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error ? (error as Error).message : 'Prescription not found or you do not have access.'}
            </p>
            <Link
              href="/doctor"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusColor = (status: PrescriptionStatus) => {
    switch (status) {
      case PrescriptionStatus.Active:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case PrescriptionStatus.Dispensed:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case PrescriptionStatus.Cancelled:
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case PrescriptionStatus.Expired:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: PrescriptionStatus) => {
    switch (status) {
      case PrescriptionStatus.Active:
        return 'Active';
      case PrescriptionStatus.Dispensed:
        return 'Dispensed';
      case PrescriptionStatus.Cancelled:
        return 'Cancelled';
      case PrescriptionStatus.Expired:
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  const isExpired = BigInt(Date.now()) > prescription.expiresAt * 1000n;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">MedChain</Link>
          <WalletStatus />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/doctor" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Prescription #{prescriptionId?.toString()}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Issued on {new Date(Number(prescription.issuedAt) * 1000).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(prescription.status)}`}>
                {getStatusLabel(prescription.status)}
              </span>
            </div>
          </div>

          {isExpired && prescription.status === PrescriptionStatus.Active && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>⚠️ Warning:</strong> This prescription has expired and can no longer be dispensed.
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Prescription Information</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Patient Data Hash</h3>
                  <p className="font-mono text-sm break-all bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded">
                    {prescription.patientDataHash}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Prescription Data Hash</h3>
                  <p className="font-mono text-sm break-all bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded">
                    {prescription.prescriptionDataHash}
                  </p>
                </div>
              </div>
            </div>

            {isLoadingMetadata && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <div className="text-4xl mb-4">📦</div>
                    <p className="text-gray-600 dark:text-gray-300">Loading prescription details from IPFS...</p>
                  </div>
                </div>
              </div>
            )}

            {metadataError && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-200">
                    <strong>Error loading prescription details:</strong> {metadataError}
                  </p>
                </div>
              </div>
            )}

            {metadata && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Patient Information (Encrypted)</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Note:</strong> Patient data is encrypted and can only be decrypted by the patient with their secret key.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Encrypted Name:</span>
                        <p className="font-mono text-xs break-all mt-1 text-gray-900 dark:text-gray-100">{metadata.patientName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Encrypted DOB:</span>
                        <p className="font-mono text-xs break-all mt-1 text-gray-900 dark:text-gray-100">{metadata.patientDOB}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Encrypted ID:</span>
                        <p className="font-mono text-xs break-all mt-1 text-gray-900 dark:text-gray-100">{metadata.patientID}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Medication Details</h3>
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Medication</p>
                      <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{metadata.medication}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dosage</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{metadata.dosage}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Quantity</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{metadata.quantity}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Refills</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{metadata.refills}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Instructions</p>
                      <p className="text-gray-800 dark:text-gray-200">{metadata.instructions}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">IPFS Storage</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">IPFS CID:</p>
                <p className="font-mono text-sm break-all text-gray-900 dark:text-gray-100">{prescription.ipfsCid}</p>
                <a
                  href={`https://ipfs.io/ipfs/${prescription.ipfsCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2 inline-block"
                >
                  View Raw Data on IPFS →
                </a>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Timeline</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Issued:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(Number(prescription.issuedAt) * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Expires:</span>
                  <span className={`font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {new Date(Number(prescription.expiresAt) * 1000).toLocaleString()}
                    {isExpired && ' (Expired)'}
                  </span>
                </div>
                {prescription.dispensedAt > 0n && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Dispensed:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(Number(prescription.dispensedAt) * 1000).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {prescription.status === PrescriptionStatus.Dispensed && prescription.pharmacistTokenId > 0n && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Dispensing Information</h3>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Dispensed by Pharmacist Token ID:</p>
                  <p className="font-mono text-lg font-bold text-green-800 dark:text-green-200">
                    #{prescription.pharmacistTokenId.toString()}
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Blockchain Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Doctor Token ID:</span>
                  <span className="font-mono text-gray-900 dark:text-gray-100">#{prescription.doctorTokenId.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Prescription ID:</span>
                  <span className="font-mono text-gray-900 dark:text-gray-100">#{prescription.prescriptionId.toString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden QR Code for PDF generation */}
          {qrData && (
            <div ref={qrRef} className="hidden">
              <QRCodeSVG value={qrData} size={300} level="H" />
            </div>
          )}

          {prescription.status === PrescriptionStatus.Active && !isExpired && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Actions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This prescription is active and can be dispensed by a pharmacist. To cancel it, contact system administration.
              </p>

              {pdfData && address && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsPdfPreviewOpen(true)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    👁️ Preview PDF
                  </button>
                  <PdfDownloadButton
                    prescriptionData={pdfData}
                    variant="primary"
                    getQrDataUrl={getQRDataUrl}
                  />
                  <button
                    onClick={() => setIsEmailModalOpen(true)}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    📧 Email to Patient
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Allow PDF/Email for non-active prescriptions too */}
          {prescription.status !== PrescriptionStatus.Active && pdfData && address && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4 dark:text-gray-100">Prescription Documents</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Download or email a copy of this prescription.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsPdfPreviewOpen(true)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  👁️ Preview PDF
                </button>
                <PdfDownloadButton
                  prescriptionData={pdfData}
                  variant="secondary"
                  getQrDataUrl={getQRDataUrl}
                />
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                >
                  📧 Email to Patient
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {pdfData && address && (
        <>
          <EmailPrescriptionModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            prescriptionData={pdfData}
            prescriptionId={prescriptionId?.toString() || ''}
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
