export interface PrescriptionMetadata {
  medication: string;
  dosage: string;
  quantity: string;
  refills: number;
  instructions: string;
  patientName: string; // Encrypted
  patientDOB: string; // Encrypted
  patientID: string; // Encrypted
}

export interface CredentialMetadata {
  licenseNumber: string; // Hashed
  specialty: string;
  institutionName: string;
  verifiedAt: number;
  verifiedBy: string; // Admin address
}

/**
 * Upload prescription metadata to IPFS using Pinata API
 * @param data Prescription data (should be encrypted before upload)
 * @returns IPFS CID
 */
export async function uploadPrescriptionToIPFS(
  data: PrescriptionMetadata
): Promise<string> {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY!,
        'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: {
          name: `prescription-${Date.now()}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Pinata API error');
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload prescription to IPFS');
  }
}

/**
 * Upload credential metadata to IPFS
 */
export async function uploadCredentialToIPFS(
  data: CredentialMetadata
): Promise<string> {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY!,
        'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: {
          name: `credential-${Date.now()}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Pinata API error');
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Error uploading credential to IPFS:', error);
    throw new Error('Failed to upload credential to IPFS');
  }
}

/**
 * Fetch data from IPFS
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchFromIPFS<T = any>(cid: string): Promise<T> {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    if (!response.ok) {
      throw new Error('Failed to fetch from IPFS');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw new Error('Failed to fetch data from IPFS');
  }
}

/**
 * Upload file to IPFS (for KYC documents)
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
        pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!,
      },
      body: formData,
    });

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw new Error('Failed to upload file to IPFS');
  }
}

/**
 * Test Pinata connection
 */
export async function testPinataConnection(): Promise<boolean> {
  try {
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY!,
        'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Pinata authentication failed:', error);
    return false;
  }
}
