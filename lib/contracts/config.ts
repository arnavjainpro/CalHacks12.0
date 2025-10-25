import { Address } from 'viem';
import MedicalCredentialSBTABI from './MedicalCredentialSBT.abi.json';
import PrescriptionRegistryABI from './PrescriptionRegistry.abi.json';

// Contract addresses - update these after deployment
export const CONTRACTS = {
  MedicalCredentialSBT: {
    address: (process.env.NEXT_PUBLIC_CREDENTIAL_SBT_ADDRESS || '0x') as Address,
    abi: MedicalCredentialSBTABI,
  },
  PrescriptionRegistry: {
    address: (process.env.NEXT_PUBLIC_PRESCRIPTION_REGISTRY_ADDRESS || '0x') as Address,
    abi: PrescriptionRegistryABI,
  },
} as const;

// Credential Types (from contract enum)
export enum CredentialType {
  Doctor = 0,
  Pharmacist = 1,
}

// Prescription Status (from contract enum)
export enum PrescriptionStatus {
  Active = 0,
  Dispensed = 1,
  Cancelled = 2,
  Expired = 3,
}

// Admin Action Types (from contract enum)
export enum AdminActionType {
  AccessPrescription = 0,
  GetDoctorPrescriptions = 1,
  GetPharmacistDispensals = 2,
  AddSigner = 3,
  RemoveSigner = 4,
}

// TypeScript types for contract structs
export interface Credential {
  credentialType: CredentialType;
  licenseHash: string;
  specialty: string;
  metadataURI: string;
  issuedAt: bigint;
  expiresAt: bigint;
  isActive: boolean;
  holder: Address;
}

export interface Prescription {
  prescriptionId: bigint;
  doctorTokenId: bigint;
  patientDataHash: `0x${string}`;
  prescriptionDataHash: `0x${string}`;
  ipfsCid: string;
  issuedAt: bigint;
  expiresAt: bigint;
  status: PrescriptionStatus;
  dispensedAt: bigint;
  pharmacistTokenId: bigint;
  patientSecret: `0x${string}`;
}

// QR Code Data Structure
export interface PrescriptionQRData {
  prescriptionId: string;
  patientDataHash: string;
  prescriptionDataHash: string;
  patientSecret: string;
  registryAddress: Address;
}
