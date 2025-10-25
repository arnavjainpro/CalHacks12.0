# Quick Start: Add Admin Signer

## TL;DR

To whitelist `0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d` as an admin:

### Step 1: Propose (Signer 1)
```bash
PRIVATE_KEY=0xYOUR_EXISTING_SIGNER_KEY npx tsx scripts/add-signer.ts
```

### Step 2: Approve (Signer 2)
```bash
ACTION_NONCE=1 PRIVATE_KEY=0xSECOND_SIGNER_KEY npx tsx scripts/approve-action.ts
```

✅ **Done!** The address is now whitelisted.

## Prerequisites

- You must have access to at least **2 existing signer private keys**
- Base Sepolia ETH for gas fees
- Node.js and pnpm installed

## What This Does

Adds `0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d` as a governance signer who can:
- Propose admin actions
- Approve governance proposals
- Access prescription data for regulatory purposes
- Add/remove other signers (with approval)

## Full Documentation

See [ADMIN_WHITELIST_GUIDE.md](./ADMIN_WHITELIST_GUIDE.md) for complete details.
