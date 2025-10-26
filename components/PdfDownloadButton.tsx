'use client';

import { useState } from 'react';
import { generatePrescriptionPDF, downloadPDF, PrescriptionPdfData } from '@/lib/utils/pdf';

interface PdfDownloadButtonProps {
  prescriptionData: PrescriptionPdfData;
  className?: string;
  variant?: 'primary' | 'secondary';
  getQrDataUrl?: () => Promise<string>;
}

export function PdfDownloadButton({
  prescriptionData,
  className = '',
  variant = 'primary',
  getQrDataUrl,
}: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setIsGenerating(true);
    setError('');

    try {
      let pdfDataToUse = prescriptionData;

      // If getQrDataUrl is provided and qrCodeDataUrl is empty, fetch it
      if (getQrDataUrl && !prescriptionData.qrCodeDataUrl) {
        const qrDataUrl = await getQrDataUrl();
        pdfDataToUse = { ...prescriptionData, qrCodeDataUrl: qrDataUrl };
      }

      const pdfBase64 = await generatePrescriptionPDF(pdfDataToUse);
      const filename = `prescription-${prescriptionData.prescriptionId}.pdf`;
      downloadPDF(pdfBase64, filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError((err as Error).message || 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const baseClasses = 'px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-gray-200 text-gray-800 hover:bg-gray-300';

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className={`${baseClasses} ${variantClasses} ${className}`}
      >
        {isGenerating ? (
          <>
            <span className="inline-block animate-spin mr-2">⏳</span>
            Generating PDF...
          </>
        ) : (
          <>📄 Download PDF</>
        )}
      </button>
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
