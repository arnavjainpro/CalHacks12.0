# Admin Scripts

Scripts to manage the PrescriptionRegistry multi-signature governance.

## Adding a New Signer (Admin)

The contract uses a 2-of-N multi-signature scheme. To add a new signer:

### Step 1: Propose the Action

Any existing signer can propose adding a new signer:

```bash
PRIVATE_KEY=0x... npx tsx scripts/add-signer.ts
```

This will output an action nonce (e.g., `1`).

### Step 2: Get Approval

Another signer must approve the action:

```bash
ACTION_NONCE=1 PRIVATE_KEY=0x... npx tsx scripts/approve-action.ts
```

Once 2 approvals are collected, the action will be automatically executed.

## Current Configuration

- **New Signer Address:** `0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d`
- **Registry Address:** `0x4E25233EAaF9D75E282C76c49D88d5aE57BfA94a`
- **Network:** Base Sepolia (Chain ID: 84532)
- **Required Signatures:** 2

## Environment Variables

- `PRIVATE_KEY` - Private key of the signer (must be an existing signer)
- `ACTION_NONCE` - The nonce of the action to approve (for approve-action.ts)

## Important Notes

1. The account calling these scripts MUST already be a signer
2. You need at least 2 signers to approve any action
3. The proposer automatically approves when proposing
4. Once threshold is met (2 signatures), the action executes automatically
