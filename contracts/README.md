# MedChain - Blockchain Prescription Validator

A decentralized prescription validation system built on Base L2 that prevents prescription fraud using Soul-Bound Tokens and IPFS-encrypted storage.

## 🎯 Problem Statement

- **Prescription Fraud**: Forged prescriptions cost the healthcare system billions annually
- **Fragmented Systems**: No single source of truth for prescription authenticity
- **Manual Verification**: Pharmacists spend 30+ minutes calling doctors to verify prescriptions
- **Data Breaches**: Centralized e-prescription systems are vulnerable to attacks

## ✨ Solution

MedChain uses blockchain technology to create an immutable, verifiable prescription system where:
- Doctors issue prescriptions secured by Soul-Bound Token credentials
- Pharmacists instantly verify prescriptions via QR codes
- Patient data is encrypted on IPFS (never exposed on-chain)
- No patient blockchain interaction required (works like traditional prescriptions)

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  - Doctor Dashboard  - Pharmacist Dashboard  - Admin     │
└──────────────────────────────────────────────────────────┘
                            ↕
┌──────────────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)                │
│  - KYC Processing  - Encryption  - IPFS Upload           │
└──────────────────────────────────────────────────────────┘
                            ↕
┌───────────────────────┬──────────────────────────────────┐
│   Blockchain (Base)   │     Storage (IPFS)               │
│  - MedicalCredentialSBT│  - Encrypted prescriptions      │
│  - PrescriptionRegistry│  - Doctor/Pharmacist metadata   │
└───────────────────────┴──────────────────────────────────┘
```

## 🔑 Key Features

### For Healthcare Providers
- ✅ **Soul-Bound Credentials**: Non-transferable doctor & pharmacist verification
- ✅ **Instant Verification**: No phone calls, instant prescription validation
- ✅ **Audit Trail**: Immutable record of who prescribed and who dispensed
- ✅ **Fraud Prevention**: Tamper-proof prescriptions with hash verification

### For Patients
- ✅ **No Wallet Needed**: Patients just receive paper prescriptions with QR codes
- ✅ **Privacy First**: Patient data encrypted on IPFS, hashes on-chain
- ✅ **Traditional UX**: Works exactly like current prescription workflow

### For Regulators
- ✅ **Transparency**: Complete prescription history on-chain
- ✅ **Revocation**: Credentials can be revoked if fraud detected
- ✅ **Analytics**: Track prescribing patterns, detect anomalies

## 📦 Project Structure

```
CalHacks12.0/
├── contracts/                  # Smart contracts (Solidity)
│   ├── contracts/
│   │   ├── MedicalCredentialSBT.sol
│   │   └── PrescriptionRegistry.sol
│   ├── test/                  # 43 passing tests
│   ├── scripts/               # Deployment scripts
│   └── README.md
├── app/                       # Next.js frontend (TBD)
├── SMART_CONTRACTS_SUMMARY.md
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm
- MetaMask or Coinbase Wallet

### Smart Contracts

```bash
# Install dependencies
cd contracts
pnpm install

# Compile contracts
pnpm compile

# Run tests
pnpm test

# Deploy to Base Sepolia testnet
pnpm deploy:sepolia
```

### Environment Setup

Create `contracts/.env`:
```env
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_api_key
```

## 🔄 User Workflows

### 1. Doctor Onboarding
```
1. Doctor connects wallet
2. Submits KYC (medical license, ID)
3. Admin reviews and approves
4. Soul-Bound Token (SBT) minted to doctor's wallet
5. Doctor can now create prescriptions
```

### 2. Create Prescription
```
1. Doctor fills prescription form:
   - Patient info (name, DOB, ID)
   - Medication (name, dosage, quantity)
   - Instructions
2. Backend encrypts data → uploads to IPFS
3. Smart contract stores hashes + IPFS CID
4. QR code generated with decryption key
5. Doctor prints prescription → gives to patient
```

### 3. Pharmacist Verification
```
1. Patient brings paper prescription
2. Pharmacist scans QR code
3. System:
   - Fetches from blockchain (validates not expired/used)
   - Fetches from IPFS (encrypted data)
   - Decrypts using key from QR
   - Verifies hashes match (tamper detection)
4. Pharmacist sees full prescription details
5. Pharmacist clicks "Dispense"
6. Blockchain updated (can't be filled again)
```

## 💡 Technical Highlights

### Smart Contracts
- **Language**: Solidity 0.8.20
- **Network**: Base L2 (low fees, fast confirmations)
- **Standards**: ERC-721 (SBTs), OpenZeppelin
- **Gas Cost**: ~$0.0002 per prescription

### Security
- SHA-256 hashing for data integrity
- AES-256 encryption for sensitive data
- Soul-bound tokens (non-transferable)
- Role-based access control
- Single-use prescription enforcement

### Privacy
- Patient data encrypted on IPFS
- Only hashes stored on-chain
- Decryption key in QR code (not on blockchain)
- License numbers hashed

## 📊 Gas Costs (Base L2)

| Operation | Gas | Cost @ 1 gwei |
|-----------|-----|---------------|
| Issue Doctor SBT | 150k | $0.00015 |
| Create Prescription | 100k | $0.0001 |
| Dispense Prescription | 80k | $0.00008 |

**Total per prescription: < $0.001 USD**

## 🛡️ Security Features

### Fraud Prevention
| Attack | Prevention |
|--------|-----------|
| Forged prescription | Hash verification fails |
| Tampered data | On-chain hash mismatch |
| Duplicate filling | Single-use status enforced |
| Fake doctor | Requires valid SBT |
| Revoked doctor | SBT validity check |

### Data Protection
- Encryption at rest (AES-256)
- Hashes on-chain (tamper detection)
- IPFS for decentralized storage
- Key escrow for lost QR codes

## 📈 Hackathon Milestones

### ✅ Completed
- [x] System architecture design
- [x] Smart contract implementation
- [x] Comprehensive test suites (43 tests)
- [x] Deployment scripts
- [x] Documentation

### 🚧 In Progress
- [ ] Next.js frontend
- [ ] IPFS integration
- [ ] QR code generation/scanning
- [ ] Admin dashboard

### 📅 Planned
- [ ] Deploy to Base Sepolia
- [ ] End-to-end testing
- [ ] Demo preparation
- [ ] Pitch deck

## 🎓 Tech Stack

```
Frontend:
  - Next.js 14 (App Router)
  - RainbowKit + wagmi
  - Tailwind CSS
  - QR code libraries

Backend:
  - Next.js API routes
  - PostgreSQL (Supabase)
  - IPFS (Pinata)
  - Crypto (encryption)

Blockchain:
  - Base L2 (Ethereum)
  - Solidity 0.8.20
  - Hardhat
  - OpenZeppelin

Storage:
  - IPFS (hot data)
  - PostgreSQL (metadata)
  - Arweave (cold archive)
```

## 🤝 Team

[Add team members here]

## 📄 License

MIT

## 🔗 Links

- [Base Network](https://base.org)
- [Smart Contract Details](./SMART_CONTRACTS_SUMMARY.md)
- [Implementation Status](./CONTRACTS_COMPLETE.md)

---

**Built for CalHacks 12.0 🚀**
