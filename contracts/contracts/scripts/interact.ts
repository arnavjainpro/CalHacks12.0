import { ethers } from "hardhat";

/**
 * Interactive script to test contract functionality locally
 * Run with: npx hardhat run scripts/interact.ts --network localhost
 */
async function main() {
  console.log("🔧 MedChain Contract Interaction Script\n");

  const [owner, doctor, pharmacist] = await ethers.getSigners();

  // Get deployed contracts (replace with actual addresses)
  const credentialSBTAddress = process.env.CREDENTIAL_SBT_ADDRESS || "";
  const prescriptionRegistryAddress = process.env.PRESCRIPTION_REGISTRY_ADDRESS || "";

  if (!credentialSBTAddress || !prescriptionRegistryAddress) {
    console.log("❌ Contract addresses not found in environment variables");
    console.log("Please set CREDENTIAL_SBT_ADDRESS and PRESCRIPTION_REGISTRY_ADDRESS");
    return;
  }

  const credentialSBT = await ethers.getContractAt("MedicalCredentialSBT", credentialSBTAddress);
  const prescriptionRegistry = await ethers.getContractAt("PrescriptionRegistry", prescriptionRegistryAddress);

  console.log("📝 Connected to contracts:");
  console.log("  SBT:", credentialSBTAddress);
  console.log("  Registry:", prescriptionRegistryAddress);
  console.log();

  // Issue Doctor Credential
  console.log("👨‍⚕️ Issuing Doctor Credential...");
  const licenseHash = ethers.keccak256(ethers.toUtf8Bytes("CA-MED-123456"));
  const txDoctor = await credentialSBT.issueCredential(
    doctor.address,
    0, // Doctor
    licenseHash,
    "Cardiology",
    "QmDoctorMetadata123",
    5 // 5 years
  );
  await txDoctor.wait();
  console.log("✅ Doctor credential issued to:", doctor.address);
  console.log();

  // Issue Pharmacist Credential
  console.log("💊 Issuing Pharmacist Credential...");
  const txPharmacist = await credentialSBT.issueCredential(
    pharmacist.address,
    1, // Pharmacist
    licenseHash,
    "Retail Pharmacy",
    "QmPharmacistMetadata123",
    5
  );
  await txPharmacist.wait();
  console.log("✅ Pharmacist credential issued to:", pharmacist.address);
  console.log();

  // Create Prescription
  console.log("📋 Creating Prescription...");
  const patientDataHash = ethers.keccak256(ethers.toUtf8Bytes("John Doe|1985-06-15|SSN-123"));
  const prescriptionDataHash = ethers.keccak256(ethers.toUtf8Bytes("Lipitor|20mg|30"));
  
  const txCreate = await prescriptionRegistry.connect(doctor).createPrescription(
    patientDataHash,
    prescriptionDataHash,
    "QmPrescriptionData123",
    30 // 30 days validity
  );
  const receiptCreate = await txCreate.wait();
  
  // Extract prescription ID from event
  const event = receiptCreate?.logs.find((log: any) => {
    try {
      const parsed = prescriptionRegistry.interface.parseLog(log);
      return parsed?.name === "PrescriptionCreated";
    } catch {
      return false;
    }
  });
  
  let prescriptionId = 1;
  if (event) {
    const parsed = prescriptionRegistry.interface.parseLog(event);
    prescriptionId = parsed?.args[0];
  }
  
  console.log("✅ Prescription created with ID:", prescriptionId.toString());
  console.log();

  // Get Prescription Details
  console.log("🔍 Fetching Prescription Details...");
  const prescription = await prescriptionRegistry.getPrescription(prescriptionId);
  console.log("  Doctor SBT ID:", prescription.doctorTokenId.toString());
  console.log("  IPFS CID:", prescription.ipfsCid);
  console.log("  Status:", ["Active", "Dispensed", "Cancelled", "Expired"][prescription.status]);
  console.log();

  // Dispense Prescription
  console.log("💊 Dispensing Prescription...");
  const txDispense = await prescriptionRegistry.connect(pharmacist).dispensePrescription(
    prescriptionId,
    patientDataHash,
    prescriptionDataHash
  );
  await txDispense.wait();
  console.log("✅ Prescription dispensed!");
  console.log();

  // Verify Final State
  const finalPrescription = await prescriptionRegistry.getPrescription(prescriptionId);
  console.log("📊 Final Prescription Status:");
  console.log("  Status:", ["Active", "Dispensed", "Cancelled", "Expired"][finalPrescription.status]);
  console.log("  Pharmacist SBT ID:", finalPrescription.pharmacistTokenId.toString());
  console.log("  Dispensed At:", new Date(Number(finalPrescription.dispensedAt) * 1000).toISOString());
  console.log();

  console.log("🎉 Interaction complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
