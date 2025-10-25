# MedChain - Blockchain-Powered Prescription Management

A decentralized healthcare application built on Base blockchain that enables secure prescription management without requiring a traditional backend database.

## 🎯 Features

### For Doctors
- **Issue Prescriptions**: Create cryptographically signed prescriptions stored on-chain
- **Generate QR Codes**: Automatic QR code generation for patients
- **Track Prescriptions**: View all issued prescriptions and their statuses
- **Cancel Prescriptions**: Ability to cancel prescriptions if needed

### For Pharmacists
- **QR Code Scanning**: Scan patient QR codes to verify prescriptions
- **Verify Authenticity**: Cryptographic verification of prescription data
- **Dispense Medications**: Record dispensals on the blockchain
- **View History**: Access complete dispensal history

### For Patients
- **No Wallet Required**: Access prescriptions using only a QR code
- **View Prescriptions**: See medication details, dosage, and instructions
- **Track Status**: Real-time prescription status (Active/Dispensed/Cancelled)
- **Privacy Protected**: All sensitive data is encrypted

### For Admins
- **KYC Verification**: Verify healthcare provider credentials
- **Issue Credentials**: Mint Soul-Bound Tokens (SBTs) for verified providers
- **Manage Credentials**: Revoke or reactivate credentials as needed
- **Multi-sig Governance**: Secure admin actions requiring multiple approvals

## 🏗️ Architecture

### Blockchain as Database
- **Smart Contracts**: All prescription and credential data stored on Base blockchain
- **IPFS**: Encrypted prescription details stored on decentralized storage
- **No Backend**: Entirely client-side application with blockchain queries

### Key Technologies
- **Next.js 15**: React framework with App Router
- **OnChainKit**: Coinbase's toolkit for wallet connection and identity
- **Wagmi & Viem**: Ethereum interaction libraries
- **Base**: Layer 2 blockchain (testnet: Base Sepolia)
- **Foundry**: Smart contract development framework

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Metamask or Coinbase Wallet
- Pinata account (for IPFS)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd CalHacks12.0
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:
```env
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_CREDENTIAL_SBT_ADDRESS=deployed_sbt_contract_address
NEXT_PUBLIC_PRESCRIPTION_REGISTRY_ADDRESS=deployed_registry_address
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_PROJECT_NAME=MedChain
```

4. **Deploy smart contracts** (if not already deployed)
```bash
cd contracts
source .env
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

5. **Run the development server**
```bash
pnpm dev
```

6. **Open your browser**
```
http://localhost:3000
```

## 📝 Contract Details

See [contracts/README-contracts.md](contracts/README-contracts.md) for smart contract documentation.

## 🤝 Contributing

Built for CalHacks 12.0

## 📄 License

MIT

---

**Built with ❤️ on Base • Powered by OnChainKit**
