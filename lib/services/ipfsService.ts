/**
 * IPFS Service for Application Data Storage
 * Uses Pinata for reliable pinning and retrieval
 */

export interface ApplicationMetadata {
  applicationId: string;
  personalInfo: {
    fullName: string;
    phone: string; // Optional contact for admin
  };
  credentials: {
    licenseNumber: string; // PLAINTEXT for admin verification
    specialty: string;
    institution: string;
    credentialType: 'Doctor' | 'Pharmacist';
  };
  documents: {
    licenseDocument?: string; // IPFS CID of uploaded license scan
    employmentProof?: string; // IPFS CID of employment verification
    other?: string[]; // Additional document CIDs
  };
  submittedAt: number;
}

export interface IPFSUploadResult {
  cid: string;
  url: string;
}

/**
 * Upload application metadata to IPFS via Pinata
 */
export async function uploadApplicationToIPFS(
  metadata: ApplicationMetadata
): Promise<IPFSUploadResult> {
  const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error('Pinata API credentials not configured');
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretKey,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `application-${metadata.applicationId}`,
        keyvalues: {
          applicationId: metadata.applicationId,
          type: metadata.credentials.credentialType,
          submittedAt: metadata.submittedAt.toString(),
        },
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Pinata upload failed: ${error.error || response.statusText}`);
  }

  const data = await response.json();

  return {
    cid: data.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
  };
}

/**
 * Upload file (document) to IPFS via Pinata
 */
export async function uploadDocumentToIPFS(
  file: File,
  metadata?: { applicationId: string; documentType: string }
): Promise<IPFSUploadResult> {
  const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error('Pinata API credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  if (metadata) {
    formData.append(
      'pinataMetadata',
      JSON.stringify({
        name: `${metadata.documentType}-${metadata.applicationId}-${file.name}`,
        keyvalues: {
          applicationId: metadata.applicationId,
          documentType: metadata.documentType,
          fileName: file.name,
        },
      })
    );
  }

  formData.append(
    'pinataOptions',
    JSON.stringify({
      cidVersion: 1,
    })
  );

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Document upload failed: ${error.error || response.statusText}`);
  }

  const data = await response.json();

  return {
    cid: data.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
  };
}

/**
 * Fetch application metadata from IPFS
 */
export async function fetchApplicationFromIPFS(
  cid: string
): Promise<ApplicationMetadata> {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }

  const data = await response.json();
  return data as ApplicationMetadata;
}

/**
 * Create IPFS gateway URL from CID
 */
export function getIPFSUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

/**
 * Query Pinata for applications by metadata
 * (Useful for admin dashboard to list applications)
 */
export async function queryApplicationsByStatus(
  status?: string
): Promise<{ cid: string; metadata: any }[]> {
  const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error('Pinata API credentials not configured');
  }

  let url = 'https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=100';

  if (status) {
    url += `&metadata[keyvalues][status]={"value":"${status}","op":"eq"}`;
  }

  const response = await fetch(url, {
    headers: {
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pinata query failed: ${response.statusText}`);
  }

  const data = await response.json();

  return data.rows.map((row: any) => ({
    cid: row.ipfs_pin_hash,
    metadata: row.metadata,
  }));
}
