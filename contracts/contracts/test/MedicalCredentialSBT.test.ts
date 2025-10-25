import { expect } from "chai";
import { ethers } from "hardhat";
import { MedicalCredentialSBT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MedicalCredentialSBT", function () {
  let credentialSBT: MedicalCredentialSBT;
  let owner: SignerWithAddress;
  let doctor: SignerWithAddress;
  let pharmacist: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const DOCTOR_TYPE = 0;
  const PHARMACIST_TYPE = 1;

  beforeEach(async function () {
    [owner, doctor, pharmacist, unauthorized] = await ethers.getSigners();

    const MedicalCredentialSBT = await ethers.getContractFactory("MedicalCredentialSBT");
    credentialSBT = await MedicalCredentialSBT.deploy();
    await credentialSBT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await credentialSBT.name()).to.equal("MedChain Credential");
      expect(await credentialSBT.symbol()).to.equal("MEDCRED");
    });

    it("Should set the correct owner", async function () {
      expect(await credentialSBT.owner()).to.equal(owner.address);
    });

    it("Should start with zero total supply", async function () {
      expect(await credentialSBT.totalSupply()).to.equal(0);
    });
  });

  describe("Credential Issuance", function () {
    const licenseHash = ethers.keccak256(ethers.toUtf8Bytes("CA-MED-123456"));
    const specialty = "Cardiology";
    const metadataURI = "QmTestHash123";
    const validityYears = 5;

    it("Should issue doctor credential successfully", async function () {
      await expect(
        credentialSBT.issueCredential(
          doctor.address,
          DOCTOR_TYPE,
          licenseHash,
          specialty,
          metadataURI,
          validityYears
        )
      )
        .to.emit(credentialSBT, "CredentialIssued")
        .withArgs(1, doctor.address, DOCTOR_TYPE, specialty, metadataURI, await (async () => {
          const block = await ethers.provider.getBlock("latest");
          return block!.timestamp + validityYears * 365 * 24 * 60 * 60;
        })());

      expect(await credentialSBT.totalSupply()).to.equal(1);
      expect(await credentialSBT.holderToTokenId(doctor.address)).to.equal(1);
    });

    it("Should issue pharmacist credential successfully", async function () {
      await credentialSBT.issueCredential(
        pharmacist.address,
        PHARMACIST_TYPE,
        licenseHash,
        "Retail Pharmacy",
        metadataURI,
        validityYears
      );

      const credential = await credentialSBT.getCredential(1);
      expect(credential.credentialType).to.equal(PHARMACIST_TYPE);
      expect(credential.specialty).to.equal("Retail Pharmacy");
    });

    it("Should prevent issuing duplicate credentials to same address", async function () {
      await credentialSBT.issueCredential(
        doctor.address,
        DOCTOR_TYPE,
        licenseHash,
        specialty,
        metadataURI,
        validityYears
      );

      await expect(
        credentialSBT.issueCredential(
          doctor.address,
          DOCTOR_TYPE,
          licenseHash,
          specialty,
          metadataURI,
          validityYears
        )
      ).to.be.revertedWith("Holder already has credential");
    });

    it("Should only allow owner to issue credentials", async function () {
      await expect(
        credentialSBT.connect(unauthorized).issueCredential(
          doctor.address,
          DOCTOR_TYPE,
          licenseHash,
          specialty,
          metadataURI,
          validityYears
        )
      ).to.be.reverted;
    });

    it("Should validate input parameters", async function () {
      await expect(
        credentialSBT.issueCredential(
          ethers.ZeroAddress,
          DOCTOR_TYPE,
          licenseHash,
          specialty,
          metadataURI,
          validityYears
        )
      ).to.be.revertedWith("Invalid holder address");

      await expect(
        credentialSBT.issueCredential(
          doctor.address,
          DOCTOR_TYPE,
          ethers.ZeroHash,
          specialty,
          metadataURI,
          validityYears
        )
      ).to.be.revertedWith("License hash required");

      await expect(
        credentialSBT.issueCredential(
          doctor.address,
          DOCTOR_TYPE,
          licenseHash,
          specialty,
          "",
          validityYears
        )
      ).to.be.revertedWith("Metadata URI required");
    });
  });

  describe("Credential Validation", function () {
    const licenseHash = ethers.keccak256(ethers.toUtf8Bytes("CA-MED-123456"));
    const metadataURI = "QmTestHash123";

    beforeEach(async function () {
      await credentialSBT.issueCredential(
        doctor.address,
        DOCTOR_TYPE,
        licenseHash,
        "Cardiology",
        metadataURI,
        5
      );
    });

    it("Should validate active credential", async function () {
      expect(await credentialSBT.isCredentialValid(1)).to.be.true;
      expect(await credentialSBT.hasValidCredential(doctor.address, DOCTOR_TYPE)).to.be.true;
    });

    it("Should invalidate wrong credential type", async function () {
      expect(await credentialSBT.hasValidCredential(doctor.address, PHARMACIST_TYPE)).to.be.false;
    });

    it("Should return false for non-existent credentials", async function () {
      expect(await credentialSBT.isCredentialValid(999)).to.be.false;
      expect(await credentialSBT.hasValidCredential(unauthorized.address, DOCTOR_TYPE)).to.be.false;
    });
  });

  describe("Credential Revocation", function () {
    const licenseHash = ethers.keccak256(ethers.toUtf8Bytes("CA-MED-123456"));
    const metadataURI = "QmTestHash123";

    beforeEach(async function () {
      await credentialSBT.issueCredential(
        doctor.address,
        DOCTOR_TYPE,
        licenseHash,
        "Cardiology",
        metadataURI,
        5
      );
    });

    it("Should revoke credential successfully", async function () {
      await expect(credentialSBT.revokeCredential(1))
        .to.emit(credentialSBT, "CredentialRevoked");

      expect(await credentialSBT.isCredentialValid(1)).to.be.false;
    });

    it("Should reactivate credential successfully", async function () {
      await credentialSBT.revokeCredential(1);
      
      await expect(credentialSBT.reactivateCredential(1))
        .to.emit(credentialSBT, "CredentialReactivated");

      expect(await credentialSBT.isCredentialValid(1)).to.be.true;
    });

    it("Should only allow owner to revoke", async function () {
      await expect(
        credentialSBT.connect(unauthorized).revokeCredential(1)
      ).to.be.reverted;
    });
  });

  describe("Soul-Bound Token (Non-Transferability)", function () {
    const licenseHash = ethers.keccak256(ethers.toUtf8Bytes("CA-MED-123456"));
    const metadataURI = "QmTestHash123";

    beforeEach(async function () {
      await credentialSBT.issueCredential(
        doctor.address,
        DOCTOR_TYPE,
        licenseHash,
        "Cardiology",
        metadataURI,
        5
      );
    });

    it("Should prevent transfers between addresses", async function () {
      await expect(
        credentialSBT.connect(doctor).transferFrom(doctor.address, pharmacist.address, 1)
      ).to.be.revertedWith("SBT: Credentials are non-transferable");
    });

    it("Should prevent safeTransferFrom", async function () {
      await expect(
        credentialSBT.connect(doctor)["safeTransferFrom(address,address,uint256)"](
          doctor.address,
          pharmacist.address,
          1
        )
      ).to.be.revertedWith("SBT: Credentials are non-transferable");
    });
  });

  describe("Token URI", function () {
    const licenseHash = ethers.keccak256(ethers.toUtf8Bytes("CA-MED-123456"));
    const metadataURI = "QmTestHash123";

    beforeEach(async function () {
      await credentialSBT.issueCredential(
        doctor.address,
        DOCTOR_TYPE,
        licenseHash,
        "Cardiology",
        metadataURI,
        5
      );
    });

    it("Should return correct IPFS URI", async function () {
      const uri = await credentialSBT.tokenURI(1);
      expect(uri).to.equal("ipfs://" + metadataURI);
    });
  });
});
