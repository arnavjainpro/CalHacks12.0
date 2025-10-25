import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting MedChain contract deployment to Base...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy MedicalCredentialSBT
  console.log("📜 Deploying MedicalCredentialSBT...");
  const MedicalCredentialSBT = await ethers.getContractFactory("MedicalCredentialSBT");
  const credentialSBT = await MedicalCredentialSBT.deploy();
  await credentialSBT.waitForDeployment();
  const credentialSBTAddress = await credentialSBT.getAddress();
  
  console.log("✅ MedicalCredentialSBT deployed to:", credentialSBTAddress);
  console.log("   - Owner:", await credentialSBT.owner());
  console.log("   - Name:", await credentialSBT.name());
  console.log("   - Symbol:", await credentialSBT.symbol());
  console.log();

  // Deploy PrescriptionRegistry
  console.log("📜 Deploying PrescriptionRegistry...");
  const PrescriptionRegistry = await ethers.getContractFactory("PrescriptionRegistry");
  const prescriptionRegistry = await PrescriptionRegistry.deploy(credentialSBTAddress);
  await prescriptionRegistry.waitForDeployment();
  const prescriptionRegistryAddress = await prescriptionRegistry.getAddress();
  
  console.log("✅ PrescriptionRegistry deployed to:", prescriptionRegistryAddress);
  console.log("   - Linked SBT Contract:", await prescriptionRegistry.credentialSBT());
  console.log();

  // Summary
  console.log("🎉 Deployment completed successfully!\n");
  console.log("=============================================================");
  console.log("📋 CONTRACT ADDRESSES");
  console.log("=============================================================");
  console.log("MedicalCredentialSBT:", credentialSBTAddress);
  console.log("PrescriptionRegistry:", prescriptionRegistryAddress);
  console.log("=============================================================");
  console.log();
  
  console.log("💡 Next steps:");
  console.log("1. Save these addresses to your .env file");
  console.log("2. Verify contracts on Basescan (if on mainnet/testnet)");
  console.log("3. Update frontend contract addresses");
  console.log();

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MedicalCredentialSBT: credentialSBTAddress,
      PrescriptionRegistry: prescriptionRegistryAddress,
    },
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const timestamp = new Date().getTime();
  const filename = "deployment-" + timestamp + ".json";
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 Deployment info saved to:", "deployments/" + filename);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
