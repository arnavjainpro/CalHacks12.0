'use client';

import { useState, useEffect } from 'react';
import { generatePrescriptionPDF, PrescriptionPdfData } from '@/lib/utils/pdf';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionData: PrescriptionPdfData;
  getQrDataUrl?: () => Promise<string>;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  prescriptionData,
  getQrDataUrl,
}: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const generatePreview = async () => {
      if (!isOpen) return;

      setIsLoading(true);
      setError('');

      try {
        let pdfDataToUse = prescriptionData;

        // If getQrDataUrl is provided and qrCodeDataUrl is empty, fetch it
        if (getQrDataUrl && !prescriptionData.qrCodeDataUrl) {
          const qrDataUrl = await getQrDataUrl();
          pdfDataToUse = { ...prescriptionData, qrCodeDataUrl: qrDataUrl };
        }

        const pdfBase64 = await generatePrescriptionPDF(pdfDataToUse);
        setPdfUrl(pdfBase64);
      } catch (err) {
        console.error('Error generating PDF preview:', err);
        setError((err as Error).message || 'Failed to generate PDF preview');
      } finally {
        setIsLoading(false);
      }
    };

    generatePreview();
  }, [isOpen, prescriptionData, getQrDataUrl]);

  useEffect(() => {
    // Cleanup PDF URL when modal closes
    return () => {
      if (pdfUrl) {
        setPdfUrl(null);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 dark:bg-opacity-85 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold dark:text-gray-100">Prescription PDF Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4 animate-pulse">📄</div>
                <p className="text-gray-600 dark:text-gray-300">Generating PDF preview...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 max-w-md">
                <p className="text-red-800 dark:text-red-400">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Prescription PDF Preview"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Preview of prescription #{prescriptionData.prescriptionId}
          </p>
          <button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
