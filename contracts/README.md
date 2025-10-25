# MedChain Smart Contracts (Foundry)

Properly configured Foundry project for the MedChain blockchain prescription validation system.

## 📦 Project Structure

```
foundry-contracts/
├── src/                          # Smart contracts
│   ├── MedicalCredentialSBT.sol  # Soul-Bound Token for credentials
│   └── PrescriptionRegistry.sol  # Prescription management
├── test/                         # Foundry tests (Solidity)
│   ├── MedicalCredentialSBT.t.sol
│   └── PrescriptionRegistry.t.sol
├── script/                       # Deployment scripts
│   └── Deploy.s.sol
├── lib/                          # Dependencies (git submodules)
│   ├── forge-std/               # Foundry standard library
│   └── openzeppelin-contracts/  # OpenZeppelin contracts
├── foundry.toml                 # Foundry configuration
└── .env.example                 # Environment variables template
```

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Git

### Installation

```bash
cd foundry-contracts

# Dependencies are already installed as git submodules
# But if you need to update them:
forge install

# Compile contracts
forge build

# Run tests
forge test

# Run tests with gas reporting
forge test --gas-report

# Run tests with verbosity (to see console.log output)
forge test -vvv
```

## 🧪 Testing

### Run All Tests

```bash
forge test
```

### Run Specific Test Contract

```bash
forge test --match-contract MedicalCredentialSBTTest
forge test --match-contract PrescriptionRegistryTest
```

### Run Specific Test

```bash
forge test --match-test test_IssueCredential
```

### Run with Detailed Output

```bash
forge test -vvvv  # Max verbosity, shows traces
```

### Generate Coverage Report

```bash
forge coverage
```

### Gas Snapshot

```bash
forge snapshot
```

## 📊 Test Results

```
Ran 2 test suites:
- MedicalCredentialSBT: 12 tests (including 2 fuzz tests)
- PrescriptionRegistry: 15 tests (including 2 fuzz tests)

Total: 27 tests - All passing ✅
```

## 🚢 Deployment

### 1. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
- `PRIVATE_KEY` - Deployer wallet private key
- `BASE_RPC_URL` - Base mainnet RPC endpoint
- `BASE_SEPOLIA_RPC_URL` - Base Sepolia testnet RPC endpoint
- `BASESCAN_API_KEY` - For contract verification

### 2. Deploy to Base Sepolia

```bash
# Load environment variables
source .env

# Deploy contracts
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  -vvvv
```

### 3. Deploy to Local Testnet (Anvil)

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### 4. Verify Contract on Basescan

If automatic verification fails:

```bash
forge verify-contract <CONTRACT_ADDRESS> \
  src/MedicalCredentialSBT.sol:MedicalCredentialSBT \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY
```

## 🔧 Common Commands

### Compilation

```bash
forge build                    # Compile all contracts
forge build --sizes            # Show contract sizes
forge clean                    # Clean build artifacts
```

### Testing

```bash
forge test                     # Run all tests
forge test -vv                 # With logs
forge test --gas-report        # With gas usage
forge test --watch             # Watch mode
```

### Code Quality

```bash
forge fmt                      # Format code
forge lint                     # Lint code for issues
forge lint --severity high     # Show only high-severity issues
```

### Documentation

```bash
forge doc                      # Generate documentation
forge doc --serve              # Serve docs locally
```

### Interacting with Contracts

```bash
# Call a view function
cast call <CONTRACT_ADDRESS> "totalSupply()(uint256)" --rpc-url base_sepolia

# Send a transaction
cast send <CONTRACT_ADDRESS> \
  "issueCredential(address,uint8,string,string,string,uint256)" \
  <HOLDER_ADDRESS> 0 "hash123" "Cardiology" "QmTest" 3 \
  --private-key $PRIVATE_KEY \
  --rpc-url base_sepolia

# Get transaction receipt
cast receipt <TX_HASH> --rpc-url base_sepolia

# Estimate gas
cast estimate <CONTRACT_ADDRESS> "functionName(args)" --rpc-url base_sepolia
```

## 📝 Contract Addresses

After deployment, save your contract addresses:

### Base Sepolia Testnet
- MedicalCredentialSBT: `<address>`
- PrescriptionRegistry: `<address>`

### Base Mainnet (Production)
- MedicalCredentialSBT: `<address>`
- PrescriptionRegistry: `<address>`

## 🔒 Security

- All contracts use Solidity 0.8.30 (built-in overflow protection)
- OpenZeppelin v5.4.0 contracts for battle-tested implementations
- Soul-bound tokens (non-transferable)
- Comprehensive test coverage including fuzz tests
- Hash-based data integrity verification

### Run Security Analysis

```bash
# Install Slither
pip3 install slither-analyzer

# Run analysis
slither .
```

## 🎯 Key Features

### MedicalCredentialSBT.sol
- ERC-721 based Soul-Bound Tokens
- Non-transferable credentials
- Credential expiry and revocation
- Doctor and Pharmacist credential types

### PrescriptionRegistry.sol
- Create prescriptions (doctors only)
- Dispense prescriptions (pharmacists only)
- Hash-based tamper detection
- Single-use prescription enforcement
- Audit trail for all actions

## 📚 Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Forge Standard Library](https://github.com/foundry-rs/forge-std)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Base Network Docs](https://docs.base.org/)

## 🧑‍💻 Development Tips

### Debugging

```bash
# Use console.log in tests
import {console} from "forge-std/Test.sol";
console.log("Value:", value);

# Run with high verbosity to see traces
forge test -vvvv
```

### Gas Optimization

```bash
# Generate gas report
forge test --gas-report

# Create gas snapshot for regression testing
forge snapshot

# Compare gas usage
forge snapshot --diff
```

### Fork Testing

```bash
# Fork Base mainnet for testing
forge test --fork-url $BASE_MAINNET_RPC_URL

# Fork at specific block
forge test --fork-url $BASE_MAINNET_RPC_URL --fork-block-number 12345678
```

## 🐛 Troubleshooting

### Compilation Errors

**Issue**: `Error: Could not find OpenZeppelin contracts`

**Solution**:
```bash
forge install OpenZeppelin/openzeppelin-contracts
```

**Issue**: `Error: Multiple versions of Solidity`

**Solution**: Ensure all contracts use `pragma solidity ^0.8.30`

### Test Failures

**Issue**: Tests fail with gas issues

**Solution**:
```bash
forge test --gas-limit 30000000
```

**Issue**: Fork tests timing out

**Solution**: Use Alchemy/Infura RPC instead of public endpoints

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `forge test`
5. Submit a pull request

---

**Built with Foundry for CalHacks 12.0 🚀**
