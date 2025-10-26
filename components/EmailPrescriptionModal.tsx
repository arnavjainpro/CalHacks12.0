'use client';

import { useState } from 'react';
import { generatePrescriptionPDF, PrescriptionPdfData } from '@/lib/utils/pdf';

interface EmailPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionData: PrescriptionPdfData;
  prescriptionId: string;
  doctorAddress: string;
  getQrDataUrl?: () => Promise<string>;
}

export function EmailPrescriptionModal({
  isOpen,
  onClose,
  prescriptionData,
  prescriptionId,
  doctorAddress,
  getQrDataUrl,
}: EmailPrescriptionModalProps) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter a patient email address');
      return;
    }

    if (!consent) {
      setError('Please confirm patient consent to send email');
      return;
    }

    setIsSending(true);

    try {
      let pdfDataToUse = prescriptionData;

      // If getQrDataUrl is provided and qrCodeDataUrl is empty, fetch it
      if (getQrDataUrl && !prescriptionData.qrCodeDataUrl) {
        const qrDataUrl = await getQrDataUrl();
        pdfDataToUse = { ...prescriptionData, qrCodeDataUrl: qrDataUrl };
      }

      // Generate PDF
      const pdfBase64 = await generatePrescriptionPDF(pdfDataToUse);

      // Send email via API route
      const response = await fetch('/api/send-prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prescriptionId,
          patientEmail: email,
          pdfData: pdfBase64,
          doctorAddress,
          patientName: pdfDataToUse.patientName,
          medication: pdfDataToUse.medication,
          issuedDate: pdfDataToUse.issuedAt.toLocaleDateString(),
          expiresDate: pdfDataToUse.expiresAt.toLocaleDateString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSuccess(true);
      setEmail('');
      setConsent(false);

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error sending email:', err);
      setError((err as Error).message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setEmail('');
      setConsent(false);
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-gray-100">Email Prescription</h2>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">Email Sent Successfully!</h3>
            <p className="text-gray-600 dark:text-gray-300">The prescription has been sent to the patient.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-gray-200">Patient Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                required
                disabled={isSending}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This email will receive the prescription PDF with QR code
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={isSending}
                  className="mt-1 mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I confirm that the patient has consented to receive this prescription via email. I
                  understand that email is not fully secure and the patient has been informed of this.
                </span>
              </label>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 dark:text-yellow-300 text-xs">
                <strong>Privacy Notice:</strong> Only the patient name and prescription details will be
                included. Sensitive patient information remains encrypted on the blockchain.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSending}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || !consent}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Sending...
                  </>
                ) : (
                  '📧 Send Email'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
