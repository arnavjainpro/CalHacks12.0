/**
 * Script to approve a pending admin action
 *
 * Usage:
 * - Set PRIVATE_KEY env var for an existing signer
 * - Set ACTION_NONCE to the action ID to approve
 * - Run: ACTION_NONCE=1 PRIVATE_KEY=0x... npx tsx scripts/approve-action.ts
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import PrescriptionRegistryABI from '../lib/contracts/PrescriptionRegistry.abi.json';

const PRESCRIPTION_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_PRESCRIPTION_REGISTRY_ADDRESS as `0x${string}`;

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const actionNonce = process.env.ACTION_NONCE;

  if (!privateKey) {
    console.error('❌ PRIVATE_KEY environment variable not set');
    process.exit(1);
  }

  if (!actionNonce) {
    console.error('❌ ACTION_NONCE environment variable not set');
    console.log('Usage: ACTION_NONCE=1 PRIVATE_KEY=0x... npx tsx scripts/approve-action.ts');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  console.log('\n✍️  Approving Admin Action');
  console.log('==========================');
  console.log(`Signer: ${account.address}`);
  console.log(`Action Nonce: ${actionNonce}\n`);

  // Get action details
  const action = await publicClient.readContract({
    address: PRESCRIPTION_REGISTRY_ADDRESS,
    abi: PrescriptionRegistryABI,
    functionName: 'pendingActions',
    args: [BigInt(actionNonce)],
  }) as any;

  console.log(`📊 Action Type: ${action.actionType}`);
  console.log(`✅ Current Approvals: ${action.approvalCount?.toString() || '0'}`);
  console.log(`🔐 Executed: ${action.executed}\n`);

  if (action.executed) {
    console.log('✅ This action has already been executed!');
    process.exit(0);
  }

  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: PRESCRIPTION_REGISTRY_ADDRESS,
      abi: PrescriptionRegistryABI,
      functionName: 'approveAdminAction',
      args: [BigInt(actionNonce)],
    });

    const hash = await walletClient.writeContract(request);
    console.log(`✅ Approval transaction sent: ${hash}`);

    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log(`✅ Action approved! (Block: ${receipt.blockNumber})\n`);

      // Check if we can execute now
      const updatedAction = await publicClient.readContract({
        address: PRESCRIPTION_REGISTRY_ADDRESS,
        abi: PrescriptionRegistryABI,
        functionName: 'pendingActions',
        args: [BigInt(actionNonce)],
      }) as any;

      const currentApprovals = Number(updatedAction.approvalCount || 0);
      console.log(`📊 Total Approvals: ${currentApprovals}/2\n`);

      if (currentApprovals >= 2) {
        console.log('🎉 Threshold reached! Action can now be executed.');
        console.log('Run the execute script or use the admin UI to execute.');
      } else {
        console.log(`⏳ Waiting for ${2 - currentApprovals} more approval(s)`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error approving action:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
