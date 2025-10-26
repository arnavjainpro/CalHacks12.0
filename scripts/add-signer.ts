/**
 * Script to add a new signer to the PrescriptionRegistry multi-sig
 *
 * This is a multi-step process:
 * 1. Propose the action (requires being an existing signer)
 * 2. Get approval from at least 2 signers total
 * 3. Execute the action once threshold is met
 *
 * Usage:
 * - Set PRIVATE_KEY env var for an existing signer
 * - Run: npx tsx scripts/add-signer.ts
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import PrescriptionRegistryABI from '../lib/contracts/PrescriptionRegistry.abi.json';

// Load environment variables
config({ path: '.env.local' });

const PRESCRIPTION_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_PRESCRIPTION_REGISTRY_ADDRESS || '0x4E25233EAaF9D75E282C76c49D88d5aE57BfA94a') as `0x${string}`;
const NEW_SIGNER_ADDRESS = '0xc3e5734af56c880d89ac7406c8fcf484dfdb0e2d' as `0x${string}`;

async function main() {
  // Check for private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY environment variable not set');
    console.log('Usage: PRIVATE_KEY=0x... npx tsx scripts/add-signer.ts');
    process.exit(1);
  }

  // Setup account
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Setup clients
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  console.log('\n🔐 Multi-Sig Signer Addition Process');
  console.log('=====================================');
  console.log(`Signer Account: ${account.address}`);
  console.log(`New Signer: ${NEW_SIGNER_ADDRESS}`);
  console.log(`Registry: ${PRESCRIPTION_REGISTRY_ADDRESS}\n`);

  // Check if already a signer
  const isSigner = await publicClient.readContract({
    address: PRESCRIPTION_REGISTRY_ADDRESS,
    abi: PrescriptionRegistryABI,
    functionName: 'isSigner',
    args: [account.address],
  }) as boolean;

  if (!isSigner) {
    console.error('❌ Your account is not a signer on this contract');
    console.log('Current signers need to add you first using this same process.');
    process.exit(1);
  }

  console.log('✅ Verified: You are a signer\n');

  // Check current signers
  const signerCount = await publicClient.readContract({
    address: PRESCRIPTION_REGISTRY_ADDRESS,
    abi: PrescriptionRegistryABI,
    functionName: 'getSignerCount',
  }) as bigint;

  console.log(`📊 Current signers: ${signerCount.toString()}`);
  console.log(`🔢 Required signatures: 2\n`);

  // Get action nonce for next action
  const actionNonce = await publicClient.readContract({
    address: PRESCRIPTION_REGISTRY_ADDRESS,
    abi: PrescriptionRegistryABI,
    functionName: '_actionNonce',
  }) as bigint;

  const nextNonce = actionNonce + 1n;
  console.log(`📝 Next action nonce: ${nextNonce.toString()}\n`);

  // Encode the new signer address as bytes
  const encodedData = NEW_SIGNER_ADDRESS;

  console.log('📤 Step 1: Proposing action to add new signer...');

  try {
    // Propose adding the new signer (AdminActionType.AddSigner = 3)
    const { request } = await publicClient.simulateContract({
      account,
      address: PRESCRIPTION_REGISTRY_ADDRESS,
      abi: PrescriptionRegistryABI,
      functionName: 'proposeAdminAction',
      args: [3, encodedData], // AdminActionType.AddSigner = 3
    });

    const hash = await walletClient.writeContract(request);
    console.log(`✅ Proposal transaction sent: ${hash}`);

    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log(`✅ Action proposed successfully! (Block: ${receipt.blockNumber})\n`);
      console.log(`📋 Action Nonce: ${nextNonce.toString()}`);
      console.log('👥 Approval count: 1/2 (your approval was automatic)\n');

      console.log('📌 Next Steps:');
      console.log('1. Share this action nonce with another signer');
      console.log('2. They need to run: PRIVATE_KEY=0x... ACTION_NONCE=' + nextNonce.toString() + ' npx tsx scripts/approve-action.ts');
      console.log('3. Once 2 signatures are collected, execute the action\n');

      console.log('Or if you control another signer wallet, you can approve and execute now.');
    } else {
      console.error('❌ Transaction failed');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error proposing action:', error.message);

    // Check if action already exists
    if (error.message.includes('Action already exists')) {
      console.log('\n💡 This action was already proposed. Use approve-action.ts to approve it.');
      console.log(`   ACTION_NONCE=${nextNonce.toString()} npx tsx scripts/approve-action.ts`);
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
