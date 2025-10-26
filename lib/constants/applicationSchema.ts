/**
 * Application Form Validation Schema
 * Defines validation rules and types for healthcare provider applications
 */

export type CredentialType = 'Doctor' | 'Pharmacist';

export interface ApplicationFormData {
  // Personal Information
  fullName: string;
  phone: string;

  // Credential Information
  credentialType: CredentialType;
  licenseNumber: string; // PLAINTEXT - will be stored in IPFS for admin verification
  specialty: string;
  institution: string;

  // Documents
  licenseDocument?: File;
  employmentProof?: File;

  // Agreement
  agreeToTerms: boolean;
}

export interface ValidationError {
  field: keyof ApplicationFormData;
  message: string;
}

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
  phone: /^\+?[\d\s\-()]{10,}$/, // International phone format
  licenseNumber: /^[A-Z0-9\-]{5,20}$/i, // Alphanumeric with hyphens, 5-20 chars
} as const;

/**
 * Specialty options for doctors
 */
export const DOCTOR_SPECIALTIES = [
  'General Practice',
  'Internal Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'Gastroenterology',
  'Hematology',
  'Infectious Disease',
  'Nephrology',
  'Neurology',
  'Obstetrics & Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Otolaryngology',
  'Pathology',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Rheumatology',
  'Surgery',
  'Urology',
  'Other',
] as const;

/**
 * Specialty options for pharmacists
 */
export const PHARMACIST_SPECIALTIES = [
  'Community Pharmacy',
  'Hospital Pharmacy',
  'Clinical Pharmacy',
  'Ambulatory Care',
  'Critical Care',
  'Geriatric Pharmacy',
  'Oncology Pharmacy',
  'Pediatric Pharmacy',
  'Psychiatric Pharmacy',
  'Compounding',
  'Nuclear Pharmacy',
  'Managed Care',
  'Regulatory Affairs',
  'Academia/Research',
  'Other',
] as const;

/**
 * Get specialty options based on credential type
 */
export function getSpecialtyOptions(credentialType: CredentialType): readonly string[] {
  return credentialType === 'Doctor' ? DOCTOR_SPECIALTIES : PHARMACIST_SPECIALTIES;
}

/**
 * Validate application form data
 */
export function validateApplicationForm(
  data: Partial<ApplicationFormData>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Full name validation
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push({
      field: 'fullName',
      message: 'Full name must be at least 2 characters',
    });
  }

  // Phone validation (required)
  if (!data.phone || data.phone.trim().length === 0) {
    errors.push({
      field: 'phone',
      message: 'Phone number is required',
    });
  } else if (!VALIDATION_PATTERNS.phone.test(data.phone)) {
    errors.push({
      field: 'phone',
      message: 'Please enter a valid phone number',
    });
  }

  // Credential type validation
  if (!data.credentialType || !['Doctor', 'Pharmacist'].includes(data.credentialType)) {
    errors.push({
      field: 'credentialType',
      message: 'Please select a credential type',
    });
  }

  // License number validation
  if (!data.licenseNumber || !VALIDATION_PATTERNS.licenseNumber.test(data.licenseNumber)) {
    errors.push({
      field: 'licenseNumber',
      message: 'License number must be 5-20 alphanumeric characters',
    });
  }

  // Specialty validation
  if (!data.specialty || data.specialty.trim().length === 0) {
    errors.push({
      field: 'specialty',
      message: 'Please select a specialty',
    });
  }

  // Institution validation
  if (!data.institution || data.institution.trim().length < 2) {
    errors.push({
      field: 'institution',
      message: 'Institution name must be at least 2 characters',
    });
  }

  // Terms agreement validation
  if (!data.agreeToTerms) {
    errors.push({
      field: 'agreeToTerms',
      message: 'You must agree to the terms and conditions',
    });
  }

  return errors;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File | undefined,
  required: boolean = false
): string | null {
  if (!file) {
    return required ? 'File is required' : null;
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return 'File size must be less than 10MB';
  }

  // Check file type (documents and images only)
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'File must be PDF, JPEG, PNG, or WebP';
  }

  return null;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Check if form is complete and valid
 */
export function isFormValid(data: Partial<ApplicationFormData>): boolean {
  const errors = validateApplicationForm(data);
  return errors.length === 0;
}

/**
 * Sanitize form data before submission
 */
export function sanitizeFormData(data: ApplicationFormData): ApplicationFormData {
  return {
    ...data,
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    licenseNumber: data.licenseNumber.trim().toUpperCase(),
    specialty: data.specialty.trim(),
    institution: data.institution.trim(),
  };
}
