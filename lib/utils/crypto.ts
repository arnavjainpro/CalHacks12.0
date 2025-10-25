import CryptoJS from 'crypto-js';

/**
 * Hash data using SHA-256 (for patient/prescription data)
 */
export function hashSHA256(data: string): `0x${string}` {
  const hash = CryptoJS.SHA256(data).toString();
  return `0x${hash}`;
}

/**
 * Generate a random secret for patient access (32 bytes)
 */
export function generatePatientSecret(): `0x${string}` {
  const randomBytes = CryptoJS.lib.WordArray.random(32);
  return `0x${randomBytes.toString()}`;
}

/**
 * Hash patient identifying information
 * @param patientName Full name
 * @param patientDOB Date of birth (YYYY-MM-DD)
 * @param patientID Government ID or patient record ID
 */
export function hashPatientData(
  patientName: string,
  patientDOB: string,
  patientID: string
): `0x${string}` {
  const data = `${patientName}|${patientDOB}|${patientID}`;
  return hashSHA256(data);
}

/**
 * Hash prescription data
 * @param medication Medication name
 * @param dosage Dosage instructions
 * @param quantity Quantity to dispense
 * @param refills Number of refills allowed
 */
export function hashPrescriptionData(
  medication: string,
  dosage: string,
  quantity: string,
  refills: number
): `0x${string}` {
  const data = `${medication}|${dosage}|${quantity}|${refills}`;
  return hashSHA256(data);
}

/**
 * Hash license data for credential issuance
 */
export function hashLicenseData(licenseNumber: string): `0x${string}` {
  return hashSHA256(licenseNumber);
}

/**
 * Encrypt sensitive data for IPFS storage
 * @param data Data to encrypt
 * @param password Encryption password
 */
export function encryptData(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString();
}

/**
 * Decrypt data from IPFS
 * @param encryptedData Encrypted string
 * @param password Decryption password
 */
export function decryptData(encryptedData: string, password: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Generate a deterministic encryption password from patient secret
 * This allows the doctor to encrypt and the patient to decrypt using their secret
 */
export function deriveEncryptionKey(patientSecret: `0x${string}`): string {
  return CryptoJS.SHA256(patientSecret).toString();
}
