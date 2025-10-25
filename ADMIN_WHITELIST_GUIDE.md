# Guide: Whitelisting New Admin/Signer

## Overview

The PrescriptionRegistry contract uses a **multi-signature governance system** with a 2-of-N signature requirement. This means any administrative action requires approval from at least 2 existing signers.

## Target Address to Whitelist

**New Admin:** `0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d`

## Current Setup

- **Network:** Base Sepolia (testnet, Chain ID: 84532)
- **PrescriptionRegistry:** `0x4E25233EAaF9D75E282C76c49D88d5aE57BfA94a`
- **Required Signatures:** 2
- **Current Signers:** Check by calling `getSignerCount()` on the contract

## Step-by-Step Process

### Option 1: Using Scripts (Recommended)

#### 1. Propose Adding the New Signer

Run this command using the private key of an **existing signer**:

```bash
PRIVATE_KEY=0x_YOUR_EXISTING_SIGNER_PRIVATE_KEY npx tsx scripts/add-signer.ts
```

**What happens:**
- Creates a proposal to add `0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d`
- Automatically counts as your approval (1/2)
- Returns an action nonce (e.g., `1`)

#### 2. Get Second Approval

Another existing signer must approve using:

```bash
ACTION_NONCE=1 PRIVATE_KEY=0x_SECOND_SIGNER_PRIVATE_KEY npx tsx scripts/approve-action.ts
```

**What happens:**
- Adds the second approval (2/2)
- Automatically executes the action since threshold is met
- The new address becomes a signer!

### Option 2: Using Foundry Cast (Alternative)

If you prefer using Foundry's `cast` command:

#### 1. Propose the action

```bash
cast send $REGISTRY_ADDRESS \
  "proposeAdminAction(uint8,bytes)" \
  3 \
  "0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d" \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

Note: `3` = AdminActionType.AddSigner

#### 2. Approve with second signer

```bash
cast send $REGISTRY_ADDRESS \
  "approveAdminAction(uint256)" \
  1 \
  --rpc-url https://sepolia.base.org \
  --private-key $SECOND_PRIVATE_KEY
```

### Option 3: Via Frontend (If Admin UI Exists)

If you've built an admin interface:
1. Navigate to admin dashboard
2. Go to "Governance" or "Signers" section
3. Click "Add New Signer"
4. Enter address: `0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d`
5. Submit proposal
6. Get another signer to approve
7. Execute once threshold is reached

## Verification

After the action executes, verify the new signer was added:

```bash
# Check if address is now a signer
cast call $REGISTRY_ADDRESS \
  "isSigner(address)(bool)" \
  0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d \
  --rpc-url https://sepolia.base.org

# Check total signer count
cast call $REGISTRY_ADDRESS \
  "getSignerCount()(uint256)" \
  --rpc-url https://sepolia.base.org
```

## Important Notes

### Security Considerations
- **Private keys must be kept secure** - only run these scripts on trusted machines
- Consider using hardware wallets or multi-sig services like Safe for production
- Each signer should be controlled by different entities for true decentralization

### Current Deployment Info
- **Deployed on:** Base Sepolia testnet
- **For Production:** You'll need to redeploy to Base mainnet and repeat this process

### Multi-Sig Workflow
1. **Propose** - Any signer can create a proposal (auto-approves)
2. **Approve** - Other signers review and approve
3. **Execute** - Automatically executes when threshold (2) is reached
4. The action is irreversible once executed

## Admin Actions Available

Once whitelisted, the new admin can:
1. **Access Prescriptions** - View prescription details for regulatory purposes
2. **Get Doctor Prescriptions** - Retrieve all prescriptions by a doctor
3. **Get Pharmacist Dispensals** - Retrieve all dispensals by a pharmacist
4. **Add Signer** - Propose adding more signers (needs approval)
5. **Remove Signer** - Propose removing signers (needs approval)

## Troubleshooting

### "Not a signer" error
- Ensure you're using a private key of an **existing** signer
- Check current signers with `getSignerCount()` and contract events

### "Action already exists" error
- Someone already proposed this action
- Find the action nonce and approve it instead of creating new proposal

### Transaction fails
- Check you have enough Base Sepolia ETH for gas
- Verify you're connecting to the correct network (Base Sepolia)
- Ensure the address isn't already a signer

## Get Help

Check the smart contract source code:
- `contracts/src/PrescriptionRegistry.sol` - Lines 580-625 (signer management)

## Next Steps After Whitelisting

Once `0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d` is added as a signer:
1. They can propose and approve governance actions
2. They should be documented as a trusted authority
3. Consider if you need additional signers for better security
4. For production, repeat on Base mainnet with production signers
