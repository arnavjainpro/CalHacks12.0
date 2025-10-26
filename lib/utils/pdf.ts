import jsPDF from 'jspdf';
import { PrescriptionMetadata } from './ipfs';

export interface PrescriptionPdfData {
  prescriptionId: string;
  patientName: string;
  medication: string;
  dosage: string;
  quantity: string;
  refills: number;
  instructions: string;
  issuedAt: Date;
  expiresAt: Date;
  doctorTokenId: string;
  qrCodeDataUrl: string; // base64 QR code image
}

/**
 * Generate a prescription PDF with QR code
 * Returns a base64-encoded PDF string
 */
export async function generatePrescriptionPDF(data: PrescriptionPdfData): Promise<string> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15; // Reduced from 20
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Header - MedChain Branding (Compact)
  pdf.setFillColor(37, 99, 235); // Blue-600
  pdf.rect(0, 0, pageWidth, 22, 'F'); // Reduced from 30

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20); // Reduced from 24
  pdf.setFont('helvetica', 'bold');
  pdf.text('MedChain', margin, 12); // Adjusted position

  pdf.setFontSize(9); // Reduced from 10
  pdf.setFont('helvetica', 'normal');
  pdf.text('Blockchain-Secured Prescription', margin, 18); // Adjusted position

  yPosition = 28; // Reduced from 40

  // Title Section (Compact)
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14); // Reduced from 18
  pdf.setFont('helvetica', 'bold');
  pdf.text('Electronic Prescription', margin, yPosition + 1);
  yPosition += 7; // Reduced from 10

  // Prescription ID (Compact)
  pdf.setFontSize(8); // Reduced from 10
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Prescription ID: #${data.prescriptionId}`, margin, yPosition);
  yPosition += 4; // Reduced from 5
  pdf.text(`Issued: ${data.issuedAt.toLocaleDateString()}`, margin, yPosition);
  yPosition += 4; // Reduced from 5
  pdf.text(`Expires: ${data.expiresAt.toLocaleDateString()}`, margin, yPosition);
  yPosition += 8; // Reduced from 12

  // Separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6; // Reduced from 10

  // Patient Information Section (Compact)
  pdf.setFontSize(11); // Reduced from 14
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Patient Information', margin, yPosition);
  yPosition += 6; // Reduced from 8

  pdf.setFontSize(10); // Reduced from 11
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Name: ${data.patientName}`, margin, yPosition);
  yPosition += 6; // Reduced from 8

  pdf.setFontSize(8); // Reduced from 9
  pdf.setTextColor(100, 100, 100);
  pdf.text('Note: Additional patient details are encrypted for privacy.', margin, yPosition);
  yPosition += 8; // Reduced from 12

  // Separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6; // Reduced from 10

  // Medication Details Section (Compact)
  pdf.setFontSize(11); // Reduced from 14
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Medication Details', margin, yPosition);
  yPosition += 7; // Reduced from 10

  // Medication name - highlighted (Compact)
  pdf.setFillColor(219, 234, 254); // Blue-100
  pdf.roundedRect(margin, yPosition - 5, contentWidth, 10, 2, 2, 'F'); // Reduced height from 12 to 10

  pdf.setFontSize(13); // Reduced from 16
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175); // Blue-900
  pdf.text(data.medication, margin + 5, yPosition + 1);
  yPosition += 10; // Reduced from 15

  // Dosage, Quantity, Refills in boxes (Compact)
  pdf.setFontSize(9); // Reduced from 10
  pdf.setTextColor(0, 0, 0);

  const boxWidth = (contentWidth - 10) / 3;
  const boxHeight = 16; // Reduced from 20
  const boxY = yPosition;

  // Dosage box
  pdf.setFillColor(249, 250, 251); // Gray-50
  pdf.roundedRect(margin, boxY, boxWidth, boxHeight, 2, 2, 'F');
  pdf.setDrawColor(229, 231, 235); // Gray-200
  pdf.roundedRect(margin, boxY, boxWidth, boxHeight, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8); // Reduced from 9
  pdf.setTextColor(100, 100, 100);
  pdf.text('Dosage', margin + 2, boxY + 4); // Adjusted position

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9); // Reduced from 10
  pdf.setTextColor(0, 0, 0);
  const dosageLines = pdf.splitTextToSize(data.dosage, boxWidth - 4);
  pdf.text(dosageLines, margin + 2, boxY + 9); // Adjusted position

  // Quantity box
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin + boxWidth + 5, boxY, boxWidth, boxHeight, 2, 2, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(margin + boxWidth + 5, boxY, boxWidth, boxHeight, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8); // Reduced from 9
  pdf.setTextColor(100, 100, 100);
  pdf.text('Quantity', margin + boxWidth + 7, boxY + 4); // Adjusted position

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9); // Reduced from 10
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.quantity, margin + boxWidth + 7, boxY + 9); // Adjusted position

  // Refills box
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin + 2 * boxWidth + 10, boxY, boxWidth, boxHeight, 2, 2, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(margin + 2 * boxWidth + 10, boxY, boxWidth, boxHeight, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8); // Reduced from 9
  pdf.setTextColor(100, 100, 100);
  pdf.text('Refills', margin + 2 * boxWidth + 12, boxY + 4); // Adjusted position

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9); // Reduced from 10
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.refills.toString(), margin + 2 * boxWidth + 12, boxY + 9); // Adjusted position

  yPosition += boxHeight + 8; // Reduced from 12

  // Instructions Section (Compact)
  pdf.setFontSize(10); // Reduced from 12
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Instructions', margin, yPosition);
  yPosition += 6; // Reduced from 8

  pdf.setFontSize(9); // Reduced from 10
  pdf.setFont('helvetica', 'normal');
  const instructionLines = pdf.splitTextToSize(data.instructions, contentWidth);
  pdf.text(instructionLines, margin, yPosition);
  yPosition += instructionLines.length * 4 + 8; // Reduced spacing

  // Separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6; // Reduced from 10

  // QR Code Section (Compact) - NO page break
  pdf.setFontSize(11); // Reduced from 14
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Prescription QR Code', margin, yPosition);
  yPosition += 6; // Reduced from 8

  pdf.setFontSize(8); // Reduced from 9
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  const qrInstructionText = pdf.splitTextToSize(
    'Scan this QR code to view prescription details or dispense medication.',
    contentWidth
  );
  pdf.text(qrInstructionText, margin, yPosition);
  yPosition += qrInstructionText.length * 3.5 + 6; // Reduced spacing

  // Add QR Code image (centered) - balanced size
  const qrSize = 70; // Reduced from 80 for better fit
  const qrX = (pageWidth - qrSize) / 2;

  try {
    pdf.addImage(data.qrCodeDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
    yPosition += qrSize + 8; // Reduced from 15
  } catch (error) {
    console.error('Error adding QR code to PDF:', error);
    pdf.setFontSize(8);
    pdf.setTextColor(200, 0, 0);
    pdf.text('QR Code could not be generated', margin, yPosition);
    yPosition += 8;
  }

  // Footer Section (Compact)
  yPosition += 4; // Small gap before footer

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 4;

  pdf.setFontSize(7); // Reduced from 8
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Blockchain Verification', margin, yPosition);
  yPosition += 4; // Reduced spacing
  pdf.text(`Doctor Token ID: #${data.doctorTokenId}`, margin, yPosition);
  yPosition += 4;
  pdf.text('This prescription is cryptographically secured on the blockchain.', margin, yPosition);
  yPosition += 5;

  pdf.setFontSize(6.5); // Reduced from 7
  pdf.text(
    'For verification, visit the MedChain patient portal and scan the QR code above.',
    margin,
    yPosition
  );
  yPosition += 5;

  // Warning box at bottom (Compact)
  pdf.setFillColor(254, 243, 199); // Yellow-100
  pdf.roundedRect(margin, yPosition, contentWidth, 10, 2, 2, 'F'); // Reduced height
  pdf.setDrawColor(251, 191, 36); // Yellow-400
  pdf.roundedRect(margin, yPosition, contentWidth, 10, 2, 2, 'S');

  pdf.setFontSize(6.5); // Reduced from 7
  pdf.setTextColor(146, 64, 14); // Yellow-900
  pdf.setFont('helvetica', 'bold');
  pdf.text('IMPORTANT:', margin + 2, yPosition + 5.5); // Adjusted position
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    'This prescription can only be dispensed once. Keep secure.',
    margin + 16,
    yPosition + 5.5
  );

  // Generate base64 PDF
  const pdfBase64 = pdf.output('dataurlstring');
  return pdfBase64;
}

/**
 * Download PDF directly to user's device
 */
export function downloadPDF(pdfBase64: string, filename: string): void {
  const link = document.createElement('a');
  link.href = pdfBase64;
  link.download = filename;
  link.click();
}

/**
 * Convert base64 data URL to blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeType });
}
