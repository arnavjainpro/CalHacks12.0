import { expect } from "chai";
import { ethers } from "hardhat";
import { MedicalCredentialSBT, PrescriptionRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PrescriptionRegistry", function () {
  let credentialSBT: MedicalCredentialSBT;
  let prescriptionRegistry: PrescriptionRegistry;
  let owner: SignerWithAddress;
  let doctor: SignerWithAddress;
  let pharmacist: SignerWithAddress;
  let patient: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const DOCTOR_TYPE = 0;
  const PHARMACIST_TYPE = 1;

  const samplePrescription = {
    patientDataHash: ethers.keccak256(ethers.toUtf8Bytes("John Doe|1985-06-15|SSN-123")),
    prescriptionDataHash: ethers.keccak256(ethers.toUtf8Bytes("Lipitor|20mg|30")),
    ipfsCid: "QmPrescriptionData123",
    validityDays: 30,
  };

  beforeEach(async function () {
    [owner, doctor, pharmacist, patient, unauthorized] = await ethers.getSigners();

    // Deploy SBT contract
    const MedicalCredentialSBT = await ethers.getContractFactory("MedicalCredentialSBT");
    credentialSBT = await MedicalCredentialSBT.deploy();
    await credentialSBT.waitForDeployment();

    // Deploy Prescription Registry
    const PrescriptionRegistry = await ethers.getContractFactory("PrescriptionRegistry");
    prescriptionRegistry = await PrescriptionRegistry.deploy(await credentialSBT.getAddress());
    await prescriptionRegistry.waitForDeployment();

    // Issue credentials
    const licenseHash = ethers.keccak256(ethers.toUtf8Bytes("LICENSE-123"));
    
    await credentialSBT.issueCredential(
      doctor.address,
      DOCTOR_TYPE,
      licenseHash,
      "Cardiology",
      "QmDoctorMetadata",
      5
    );

    await credentialSBT.issueCredential(
      pharmacist.address,
      PHARMACIST_TYPE,
      licenseHash,
      "Retail Pharmacy",
      "QmPharmacistMetadata",
      5
    );
  });

  describe("Deployment", function () {
    it("Should link to correct SBT contract", async function () {
      expect(await prescriptionRegistry.credentialSBT()).to.equal(
        await credentialSBT.getAddress()
      );
    });

    it("Should start with zero prescriptions", async function () {
      expect(await prescriptionRegistry.totalPrescriptions()).to.equal(0);
    });
  });

  describe("Prescription Creation", function () {
    it("Should create prescription successfully with valid doctor credential", async function () {
      await expect(
        prescriptionRegistry.connect(doctor).createPrescription(
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash,
          samplePrescription.ipfsCid,
          samplePrescription.validityDays
        )
      )
        .to.emit(prescriptionRegistry, "PrescriptionCreated")
        .withArgs(
          1,
          1, // doctorTokenId
          doctor.address,
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash,
          samplePrescription.ipfsCid,
          await (async () => {
            const block = await ethers.provider.getBlock("latest");
            return block!.timestamp + 1;
          })(),
          await (async () => {
            const block = await ethers.provider.getBlock("latest");
            return block!.timestamp + samplePrescription.validityDays * 24 * 60 * 60 + 1;
          })()
        );

      expect(await prescriptionRegistry.totalPrescriptions()).to.equal(1);
    });

    it("Should prevent unauthorized addresses from creating prescriptions", async function () {
      await expect(
        prescriptionRegistry.connect(unauthorized).createPrescription(
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash,
          samplePrescription.ipfsCid,
          samplePrescription.validityDays
        )
      ).to.be.revertedWith("No credential found");
    });

    it("Should prevent pharmacists from creating prescriptions", async function () {
      await expect(
        prescriptionRegistry.connect(pharmacist).createPrescription(
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash,
          samplePrescription.ipfsCid,
          samplePrescription.validityDays
        )
      ).to.be.revertedWith("Invalid or expired doctor credential");
    });

    it("Should validate input parameters", async function () {
      await expect(
        prescriptionRegistry.connect(doctor).createPrescription(
          ethers.ZeroHash,
          samplePrescription.prescriptionDataHash,
          samplePrescription.ipfsCid,
          samplePrescription.validityDays
        )
      ).to.be.revertedWith("Invalid patient data hash");

      await expect(
        prescriptionRegistry.connect(doctor).createPrescription(
          samplePrescription.patientDataHash,
          ethers.ZeroHash,
          samplePrescription.ipfsCid,
          samplePrescription.validityDays
        )
      ).to.be.revertedWith("Invalid prescription data hash");

      await expect(
        prescriptionRegistry.connect(doctor).createPrescription(
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash,
          "",
          samplePrescription.validityDays
        )
      ).to.be.revertedWith("IPFS CID required");
    });

    it("Should add prescription to doctor's audit trail", async function () {
      await prescriptionRegistry.connect(doctor).createPrescription(
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash,
        samplePrescription.ipfsCid,
        samplePrescription.validityDays
      );

      const doctorPrescriptions = await prescriptionRegistry.getDoctorPrescriptions(1);
      expect(doctorPrescriptions.length).to.equal(1);
      expect(doctorPrescriptions[0]).to.equal(1);
    });
  });

  describe("Prescription Dispensing", function () {
    beforeEach(async function () {
      await prescriptionRegistry.connect(doctor).createPrescription(
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash,
        samplePrescription.ipfsCid,
        samplePrescription.validityDays
      );
    });

    it("Should dispense prescription successfully with valid pharmacist credential", async function () {
      await expect(
        prescriptionRegistry.connect(pharmacist).dispensePrescription(
          1,
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash
        )
      )
        .to.emit(prescriptionRegistry, "PrescriptionDispensed")
        .withArgs(1, 2, pharmacist.address, await (async () => {
          const block = await ethers.provider.getBlock("latest");
          return block!.timestamp + 1;
        })());

      const prescription = await prescriptionRegistry.getPrescription(1);
      expect(prescription.status).to.equal(1); // Dispensed
      expect(prescription.pharmacistTokenId).to.equal(2);
    });

    it("Should prevent dispensing with incorrect hashes (tampering detection)", async function () {
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong data"));

      await expect(
        prescriptionRegistry.connect(pharmacist).dispensePrescription(
          1,
          wrongHash,
          samplePrescription.prescriptionDataHash
        )
      ).to.be.revertedWith("Patient data mismatch - possible tampering");

      await expect(
        prescriptionRegistry.connect(pharmacist).dispensePrescription(
          1,
          samplePrescription.patientDataHash,
          wrongHash
        )
      ).to.be.revertedWith("Prescription data mismatch - possible tampering");
    });

    it("Should prevent double-dispensing", async function () {
      await prescriptionRegistry.connect(pharmacist).dispensePrescription(
        1,
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash
      );

      await expect(
        prescriptionRegistry.connect(pharmacist).dispensePrescription(
          1,
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash
        )
      ).to.be.revertedWith("Prescription not active");
    });

    it("Should prevent unauthorized addresses from dispensing", async function () {
      await expect(
        prescriptionRegistry.connect(unauthorized).dispensePrescription(
          1,
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash
        )
      ).to.be.revertedWith("No credential found");
    });

    it("Should prevent doctors from dispensing prescriptions", async function () {
      await expect(
        prescriptionRegistry.connect(doctor).dispensePrescription(
          1,
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash
        )
      ).to.be.revertedWith("Invalid or expired pharmacist credential");
    });

    it("Should add prescription to pharmacist's audit trail", async function () {
      await prescriptionRegistry.connect(pharmacist).dispensePrescription(
        1,
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash
      );

      const pharmacistDispensals = await prescriptionRegistry.getPharmacistDispensals(2);
      expect(pharmacistDispensals.length).to.equal(1);
      expect(pharmacistDispensals[0]).to.equal(1);
    });
  });

  describe("Prescription Cancellation", function () {
    beforeEach(async function () {
      await prescriptionRegistry.connect(doctor).createPrescription(
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash,
        samplePrescription.ipfsCid,
        samplePrescription.validityDays
      );
    });

    it("Should allow doctor to cancel their own prescription", async function () {
      await expect(
        prescriptionRegistry.connect(doctor).cancelPrescription(1, "Wrong medication prescribed")
      )
        .to.emit(prescriptionRegistry, "PrescriptionCancelled")
        .withArgs(1, 1, doctor.address, await (async () => {
          const block = await ethers.provider.getBlock("latest");
          return block!.timestamp + 1;
        })(), "Wrong medication prescribed");

      const prescription = await prescriptionRegistry.getPrescription(1);
      expect(prescription.status).to.equal(2); // Cancelled
    });

    it("Should prevent cancelling already dispensed prescription", async function () {
      await prescriptionRegistry.connect(pharmacist).dispensePrescription(
        1,
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash
      );

      await expect(
        prescriptionRegistry.connect(doctor).cancelPrescription(1, "Changed mind")
      ).to.be.revertedWith("Cannot cancel - already processed");
    });

    it("Should prevent non-issuing doctor from cancelling", async function () {
      await expect(
        prescriptionRegistry.connect(pharmacist).cancelPrescription(1, "Not my prescription")
      ).to.be.revertedWith("Not the issuing doctor");
    });

    it("Should require cancellation reason", async function () {
      await expect(
        prescriptionRegistry.connect(doctor).cancelPrescription(1, "")
      ).to.be.revertedWith("Cancellation reason required");
    });
  });

  describe("Prescription Expiry", function () {
    it("Should prevent dispensing expired prescription", async function () {
      await prescriptionRegistry.connect(doctor).createPrescription(
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash,
        samplePrescription.ipfsCid,
        1 // 1 day validity
      );

      // Fast forward time by 2 days
      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        prescriptionRegistry.connect(pharmacist).dispensePrescription(
          1,
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash
        )
      ).to.be.revertedWith("Prescription expired");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await prescriptionRegistry.connect(doctor).createPrescription(
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash,
        samplePrescription.ipfsCid,
        samplePrescription.validityDays
      );
    });

    it("Should return correct prescription details", async function () {
      const prescription = await prescriptionRegistry.getPrescription(1);
      
      expect(prescription.prescriptionId).to.equal(1);
      expect(prescription.doctorTokenId).to.equal(1);
      expect(prescription.patientDataHash).to.equal(samplePrescription.patientDataHash);
      expect(prescription.prescriptionDataHash).to.equal(samplePrescription.prescriptionDataHash);
      expect(prescription.ipfsCid).to.equal(samplePrescription.ipfsCid);
      expect(prescription.status).to.equal(0); // Active
    });

    it("Should check if prescription is dispensable", async function () {
      expect(await prescriptionRegistry.isPrescriptionDispensable(1)).to.be.true;

      // After dispensing
      await prescriptionRegistry.connect(pharmacist).dispensePrescription(
        1,
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash
      );

      expect(await prescriptionRegistry.isPrescriptionDispensable(1)).to.be.false;
    });

    it("Should batch check prescription statuses", async function () {
      // Create second prescription
      await prescriptionRegistry.connect(doctor).createPrescription(
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash,
        samplePrescription.ipfsCid,
        samplePrescription.validityDays
      );

      // Dispense first one
      await prescriptionRegistry.connect(pharmacist).dispensePrescription(
        1,
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash
      );

      const statuses = await prescriptionRegistry.batchGetPrescriptionStatus([1, 2]);
      expect(statuses[0]).to.equal(1); // Dispensed
      expect(statuses[1]).to.equal(0); // Active
    });
  });

  describe("Revoked Doctor Credential", function () {
    beforeEach(async function () {
      await prescriptionRegistry.connect(doctor).createPrescription(
        samplePrescription.patientDataHash,
        samplePrescription.prescriptionDataHash,
        samplePrescription.ipfsCid,
        samplePrescription.validityDays
      );
    });

    it("Should prevent prescription creation after credential revocation", async function () {
      await credentialSBT.revokeCredential(1);

      await expect(
        prescriptionRegistry.connect(doctor).createPrescription(
          samplePrescription.patientDataHash,
          samplePrescription.prescriptionDataHash,
          samplePrescription.ipfsCid,
          samplePrescription.validityDays
        )
      ).to.be.revertedWith("Invalid or expired doctor credential");
    });

    it("Should mark prescription as non-dispensable if doctor credential revoked", async function () {
      expect(await prescriptionRegistry.isPrescriptionDispensable(1)).to.be.true;

      await credentialSBT.revokeCredential(1);

      expect(await prescriptionRegistry.isPrescriptionDispensable(1)).to.be.false;
    });
  });
});
