# MedChain Setup Guide

## Quick Start Checklist

### 1. Environment Setup

- [ ] Install Node.js 18+ and pnpm
- [ ] Install Foundry for smart contracts
- [ ] Create Pinata account at https://pinata.cloud
- [ ] Get OnChainKit API key from https://portal.cdp.coinbase.com/
- [ ] Install Coinbase Wallet or MetaMask browser extension

### 2. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install contract dependencies (if needed)
cd contracts
forge install
cd ..
```

### 3. Configure Environment Variables

Create `.env.local` in the root directory:

```env
# OnchainKit API Key (get from Coinbase Developer Portal)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_key_here

# Contract Addresses (update after deploying contracts)
NEXT_PUBLIC_CREDENTIAL_SBT_ADDRESS=0x...
NEXT_PUBLIC_PRESCRIPTION_REGISTRY_ADDRESS=0x...

# Pinata IPFS Keys (get from Pinata Dashboard)
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key

# Project Name
NEXT_PUBLIC_PROJECT_NAME=MedChain
```

### 4. Deploy Smart Contracts

#### Option A: Use Existing Deployed Contracts
If contracts are already deployed, get the addresses and update `.env.local`.

#### Option B: Deploy New Contracts

1. Configure contract environment (in `contracts/.env`):
```env
PRIVATE_KEY=your_deployer_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

2. Deploy to Base Sepolia:
```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

3. Copy the deployed contract addresses to your root `.env.local`.

### 5. Run the Application

```bash
# Start development server
pnpm dev

# Open browser to http://localhost:3000
```

## Testing the Application

### Test as Admin

1. Connect wallet as contract owner
2. Go to `/admin`
3. Issue test credentials for doctor and pharmacist addresses
4. Fill in:
   - Wallet address
   - Credential type (Doctor or Pharmacist)
   - License number
   - Specialty
   - Institution name
   - Validity period

### Test as Doctor

1. Connect wallet with Doctor credential
2. Go to `/doctor`
3. Create a test prescription:
   - Patient info (can use dummy data)
   - Medication details
   - Instructions
4. Download generated QR code
5. View prescription in dashboard

### Test as Pharmacist

1. Connect wallet with Pharmacist credential
2. Go to `/pharmacist/dispense`
3. Scan the QR code (allow camera access)
4. Verify prescription details
5. Confirm dispensing

### Test as Patient

1. No wallet needed!
2. Go to `/patient`
3. Scan prescription QR code
4. View prescription details

## Common Issues & Solutions

### Issue: "Contract address not set"
**Solution**: Make sure you've deployed contracts and added addresses to `.env.local`

### Issue: "IPFS upload failed"
**Solution**:
- Verify Pinata API keys are correct
- Check Pinata account has storage available
- Ensure keys are in `.env.local` (not `.env`)

### Issue: "Camera not accessible"
**Solution**:
- Allow camera permissions in browser
- Use HTTPS in production (camera requires secure context)
- Test on localhost (allowed for camera access)

### Issue: "Transaction failed"
**Solution**:
- Ensure wallet has Base Sepolia ETH
- Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Check gas limits in contract calls

### Issue: "Credential not found"
**Solution**:
- Admin must issue credential first
- Wait for transaction confirmation
- Refresh page to reload credential

## Network Configuration

### Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

### Adding Base Sepolia to MetaMask

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Enter:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

## Production Deployment

### Deploy Frontend to Vercel

```bash
# Build the project
pnpm build

# Deploy to Vercel
vercel deploy --prod
```

### Deploy Contracts to Base Mainnet

⚠️ **WARNING**: Only deploy to mainnet when ready for production!

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url base \
  --broadcast \
  --verify
```

Update `.env.local` with mainnet contract addresses.

## Security Checklist

- [ ] Never commit `.env.local` or private keys
- [ ] Use hardware wallet for mainnet deployments
- [ ] Audit smart contracts before mainnet deployment
- [ ] Test all features thoroughly on testnet
- [ ] Enable multi-sig for admin wallet in production
- [ ] Monitor contract events for suspicious activity
- [ ] Implement rate limiting for IPFS uploads
- [ ] Use HTTPS for production deployment

## Need Help?

- Check contract tests: `cd contracts && forge test -vvv`
- View contract documentation: `contracts/README-contracts.md`
- Test Pinata connection in browser console
- Check browser console for detailed error messages

---

**Ready to build? Start with `pnpm dev`!** 🚀
