import { PrescriptionQRData } from '@/lib/contracts/config';

/**
 * Encode prescription data for QR code
 */
export function encodePrescriptionQR(data: PrescriptionQRData): string {
  return JSON.stringify(data);
}

/**
 * Decode prescription data from QR code
 */
export function decodePrescriptionQR(qrData: string): PrescriptionQRData {
  try {
    const parsed = JSON.parse(qrData);

    // Validate required fields
    if (
      !parsed.prescriptionId ||
      !parsed.patientDataHash ||
      !parsed.prescriptionDataHash ||
      !parsed.patientSecret ||
      !parsed.registryAddress
    ) {
      throw new Error('Invalid QR code format: missing required fields');
    }

    return parsed as PrescriptionQRData;
  } catch (error) {
    throw new Error('Failed to decode QR code: Invalid format');
  }
}

/**
 * Validate QR code data structure
 */
export function isValidPrescriptionQR(qrData: string): boolean {
  try {
    decodePrescriptionQR(qrData);
    return true;
  } catch (_error) {
    return false;
  }
}
