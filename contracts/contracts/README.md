# MedChain Smart Contracts

Soul-Bound Token based prescription validation system on Base L2.

## Overview

This system uses two main smart contracts:

1. **MedicalCredentialSBT** - Non-transferable credentials for doctors and pharmacists
2. **PrescriptionRegistry** - Manages prescription lifecycle (creation, dispensing, cancellation)

## Architecture

```
MedicalCredentialSBT (SBT)
├─ Issues credentials to verified medical professionals
├─ Non-transferable (soul-bound)
├─ Can be revoked by admin
└─ Supports doctors and pharmacists

PrescriptionRegistry
├─ Doctors create prescriptions (requires valid SBT)
├─ Pharmacists dispense prescriptions (requires valid SBT)
├─ Hash-based tamper detection
├─ Single-use enforcement
└─ Immutable audit trail
```

## Installation

```bash
cd contracts
pnpm install
```

## Configuration

Create a `.env` file (see `.env.example`):

```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

## Compilation

```bash
pnpm compile
```

## Testing

Run all tests:
```bash
pnpm test
```

Run specific test file:
```bash
npx hardhat test test/MedicalCredentialSBT.test.ts
```

Run with gas reporting:
```bash
REPORT_GAS=true pnpm test
```

## Deployment

### Deploy to Base Sepolia (Testnet)
```bash
pnpm deploy:sepolia
```

### Deploy to Base Mainnet
```bash
pnpm deploy:mainnet
```

## Contract Addresses

After deployment, contract addresses will be saved to `deployments/deployment-{timestamp}.json`.

### Base Sepolia Testnet
- MedicalCredentialSBT: `TBD`
- PrescriptionRegistry: `TBD`

### Base Mainnet
- MedicalCredentialSBT: `TBD`
- PrescriptionRegistry: `TBD`

## Usage

### Issue Doctor Credential

```solidity
credentialSBT.issueCredential(
    doctorWallet,
    0, // CredentialType.Doctor
    licenseHash,
    "Cardiology",
    "QmIPFSMetadata...",
    5 // validity years
);
```

### Create Prescription

```solidity
prescriptionRegistry.createPrescription(
    patientDataHash,
    prescriptionDataHash,
    "QmIPFSEncryptedData...",
    30 // validity days
);
```

### Dispense Prescription

```solidity
prescriptionRegistry.dispensePrescription(
    prescriptionId,
    patientDataHash,
    prescriptionDataHash
);
```

## Security Features

- ✅ Soul-bound tokens (non-transferable)
- ✅ Role-based access control (doctor vs pharmacist)
- ✅ Hash-based data integrity verification
- ✅ Single-use prescription enforcement
- ✅ Credential revocation support
- ✅ Immutable audit trail

## Gas Estimates

| Operation | Estimated Gas | Cost @ 0.1 gwei |
|-----------|---------------|-----------------|
| Issue SBT | ~150,000 | ~$0.000015 |
| Create Prescription | ~100,000 | ~$0.00001 |
| Dispense Prescription | ~80,000 | ~$0.000008 |

## License

MIT
