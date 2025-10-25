// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MedicalCredentialSBT} from "../src/MedicalCredentialSBT.sol";
import {PrescriptionRegistry} from "../src/PrescriptionRegistry.sol";

contract PrescriptionRegistryTest is Test {
    MedicalCredentialSBT public sbt;
    PrescriptionRegistry public registry;

    address public owner;
    address public doctor;
    address public pharmacist;
    address public patient;

    // Multi-sig signers
    address public signer1;
    address public signer2;
    address public signer3;

    uint256 public doctorTokenId;
    uint256 public pharmacistTokenId;

    bytes32 constant PATIENT_HASH = keccak256("patient-data");
    bytes32 constant RX_HASH = keccak256("prescription-data");
    string constant IPFS_CID = "QmPrescription123";
    bytes32 constant PATIENT_SECRET = keccak256("patient-secret-123");

    event PrescriptionCreated(
        uint256 indexed prescriptionId,
        uint256 indexed doctorTokenId,
        address indexed doctorAddress,
        bytes32 patientDataHash,
        bytes32 prescriptionDataHash,
        string ipfsCid,
        uint256 issuedAt,
        uint256 expiresAt
    );

    event PrescriptionDispensed(
        uint256 indexed prescriptionId,
        uint256 indexed pharmacistTokenId,
        address indexed pharmacistAddress,
        uint256 dispensedAt
    );

    function setUp() external {
        owner = address(this);
        doctor = makeAddr("doctor");
        pharmacist = makeAddr("pharmacist");
        patient = makeAddr("patient");

        // Setup multi-sig signers
        signer1 = address(this);  // Test contract as first signer
        signer2 = makeAddr("signer2");
        signer3 = makeAddr("signer3");

        address[] memory signers = new address[](3);
        signers[0] = signer1;
        signers[1] = signer2;
        signers[2] = signer3;

        // Deploy contracts
        sbt = new MedicalCredentialSBT();
        registry = new PrescriptionRegistry(address(sbt), signers);

        // Issue credentials
        doctorTokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "doc-hash",
            "Cardiology",
            "QmDoc",
            5
        );

        pharmacistTokenId = sbt.issueCredential(
            pharmacist,
            MedicalCredentialSBT.CredentialType.Pharmacist,
            "pharm-hash",
            "Retail Pharmacy",
            "QmPharm",
            5
        );
    }

    // ============ Helper Functions ============

    function getPrescriptionViaMultiSig(uint256 prescriptionId) internal returns (PrescriptionRegistry.Prescription memory) {
        // Signer1 proposes
        bytes memory data = abi.encode(prescriptionId);
        uint256 actionNonce = registry.proposeAdminAction(
            PrescriptionRegistry.AdminActionType.AccessPrescription,
            data
        );

        // Signer2 approves (now has 2-of-3)
        vm.prank(signer2);
        registry.approveAdminAction(actionNonce);

        // Execute
        return registry.executeGetPrescription(actionNonce);
    }

    // ============ Prescription Creation Tests ============

    function test_CreatePrescription() external {
        uint256 validityDays = 30;

        vm.startPrank(doctor);

        vm.expectEmit(true, true, true, true);
        emit PrescriptionCreated(
            1,
            doctorTokenId,
            doctor,
            PATIENT_HASH,
            RX_HASH,
            IPFS_CID,
            block.timestamp,
            block.timestamp + (validityDays * 1 days)
        );

        uint256 rxId = registry.createPrescription(
            PATIENT_HASH,
            RX_HASH,
            IPFS_CID,
            validityDays,
            PATIENT_SECRET
        );

        vm.stopPrank();

        assertEq(rxId, 1, "Prescription ID should be 1");
        assertEq(registry.totalPrescriptions(), 1, "Should have 1 prescription");

        // Verify prescription details as doctor
        vm.prank(doctor);
        PrescriptionRegistry.Prescription memory rx = registry.getPrescriptionAsDoctor(rxId);

        assertEq(rx.doctorTokenId, doctorTokenId);
        assertEq(rx.patientDataHash, PATIENT_HASH);
        assertEq(rx.prescriptionDataHash, RX_HASH);
        assertEq(rx.ipfsCid, IPFS_CID);
        assertEq(rx.patientSecret, PATIENT_SECRET);
        assertTrue(rx.status == PrescriptionRegistry.PrescriptionStatus.Active);
    }

    function test_RevertWhen_UnauthorizedCreation() external {
        vm.prank(patient); // Patient has no credential
        vm.expectRevert("No credential found");
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);
    }

    function test_RevertWhen_InvalidPrescriptionData() external {
        vm.startPrank(doctor);

        vm.expectRevert("Invalid patient data hash");
        registry.createPrescription(bytes32(0), RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.expectRevert("Invalid prescription data hash");
        registry.createPrescription(PATIENT_HASH, bytes32(0), IPFS_CID, 30, PATIENT_SECRET);

        vm.expectRevert("IPFS CID required");
        registry.createPrescription(PATIENT_HASH, RX_HASH, "", 30, PATIENT_SECRET);

        vm.expectRevert("Invalid validity period");
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 0, PATIENT_SECRET);

        vm.expectRevert("Invalid validity period");
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 366, PATIENT_SECRET);

        vm.expectRevert("Patient secret required");
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, bytes32(0));

        vm.stopPrank();
    }

    // ============ Prescription Dispensing Tests ============

    function test_DispensePrescription() external {
        // Create prescription
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        // Dispense prescription
        vm.startPrank(pharmacist);

        vm.expectEmit(true, true, true, true);
        emit PrescriptionDispensed(rxId, pharmacistTokenId, pharmacist, block.timestamp);

        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        vm.stopPrank();

        // Verify status changed - admin checks it
        PrescriptionRegistry.Prescription memory rx = getPrescriptionViaMultiSig(rxId);
        assertTrue(rx.status == PrescriptionRegistry.PrescriptionStatus.Dispensed);
        assertEq(rx.pharmacistTokenId, pharmacistTokenId);
    }

    function test_RevertWhen_UnauthorizedDispensing() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.prank(patient);
        vm.expectRevert("No credential found");
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);
    }

    function test_RevertWhen_DataMismatch() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        bytes32 wrongHash = keccak256("wrong-data");

        vm.startPrank(pharmacist);

        vm.expectRevert("Patient data mismatch - possible tampering");
        registry.dispensePrescription(rxId, wrongHash, RX_HASH);

        vm.expectRevert("Prescription data mismatch - possible tampering");
        registry.dispensePrescription(rxId, PATIENT_HASH, wrongHash);

        vm.stopPrank();
    }

    function test_RevertWhen_AlreadyDispensed() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.prank(pharmacist);
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        vm.prank(pharmacist);
        vm.expectRevert("Prescription not active");
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);
    }

    function test_RevertWhen_Expired() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        // Fast forward past expiry
        vm.warp(block.timestamp + 31 days);

        vm.prank(pharmacist);
        vm.expectRevert("Prescription expired");
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);
    }

    // ============ Prescription Cancellation Tests ============

    function test_CancelPrescription() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.prank(doctor);
        registry.cancelPrescription(rxId, "Patient requested cancellation");

        PrescriptionRegistry.Prescription memory rx = getPrescriptionViaMultiSig(rxId);
        assertTrue(rx.status == PrescriptionRegistry.PrescriptionStatus.Cancelled);
    }

    function test_RevertWhen_NotIssuingDoctor() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        address otherDoctor = makeAddr("otherDoctor");
        sbt.issueCredential(
            otherDoctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "other-hash",
            "Surgery",
            "QmOther",
            5
        );

        vm.prank(otherDoctor);
        vm.expectRevert("Not the issuing doctor");
        registry.cancelPrescription(rxId, "Wrong doctor");
    }

    // ============ View Function Tests ============

    function test_IsPrescriptionDispensable() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.prank(pharmacist);
        assertTrue(registry.isPrescriptionDispensable(rxId, PATIENT_HASH, RX_HASH), "Should be dispensable");

        // After dispensing
        vm.prank(pharmacist);
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        vm.prank(pharmacist);
        assertFalse(registry.isPrescriptionDispensable(rxId, PATIENT_HASH, RX_HASH), "Should not be dispensable after filling");
    }

    function test_DoctorCanViewOwnPrescriptions() external {
        vm.startPrank(doctor);
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);
        registry.createPrescription(PATIENT_HASH, RX_HASH, "QmRx2", 30, PATIENT_SECRET);

        // Doctor can view their own prescriptions
        uint256[] memory rxIds = registry.getMyPrescriptions();
        assertEq(rxIds.length, 2, "Doctor should have 2 prescriptions");
        assertEq(rxIds[0], 1);
        assertEq(rxIds[1], 2);
        vm.stopPrank();
    }

    function test_PharmacistCanViewOwnDispensals() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.startPrank(pharmacist);
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        // Pharmacist can view their own dispensals
        uint256[] memory rxIds = registry.getMyDispensals();
        assertEq(rxIds.length, 1, "Pharmacist should have 1 dispensal");
        assertEq(rxIds[0], 1);
        vm.stopPrank();
    }

    function test_MultiSigCanAccessAuditTrails() external {
        vm.startPrank(doctor);
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);
        registry.createPrescription(PATIENT_HASH, RX_HASH, "QmRx2", 30, PATIENT_SECRET);
        vm.stopPrank();

        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, "QmRx3", 30, PATIENT_SECRET);

        vm.prank(pharmacist);
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        // Multi-sig can access audit trails
        bytes memory data = abi.encode(doctorTokenId);
        uint256 actionNonce = registry.proposeAdminAction(
            PrescriptionRegistry.AdminActionType.GetDoctorPrescriptions,
            data
        );

        vm.prank(signer2);
        registry.approveAdminAction(actionNonce);

        uint256[] memory doctorRxIds = registry.executeGetDoctorPrescriptions(actionNonce);
        assertEq(doctorRxIds.length, 3, "Should see all doctor prescriptions");
    }

    function test_RevertWhen_NonSignerAccessesAuditTrails() external {
        vm.prank(doctor);
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        // Non-signer cannot propose actions
        vm.prank(pharmacist);
        vm.expectRevert("Not a signer");
        bytes memory data = abi.encode(doctorTokenId);
        registry.proposeAdminAction(
            PrescriptionRegistry.AdminActionType.GetDoctorPrescriptions,
            data
        );
    }

    function test_MultiSigAddSigner() external {
        address newSigner = makeAddr("newSigner");

        bytes memory data = abi.encode(newSigner);
        uint256 actionNonce = registry.proposeAdminAction(
            PrescriptionRegistry.AdminActionType.AddSigner,
            data
        );

        vm.prank(signer2);
        registry.approveAdminAction(actionNonce);

        registry.executeAddSigner(actionNonce);

        assertTrue(registry.isSigner(newSigner));
        assertEq(registry.getSignerCount(), 4);
    }

    function test_MultiSigRemoveSigner() external {
        bytes memory data = abi.encode(signer3);
        uint256 actionNonce = registry.proposeAdminAction(
            PrescriptionRegistry.AdminActionType.RemoveSigner,
            data
        );

        vm.prank(signer2);
        registry.approveAdminAction(actionNonce);

        registry.executeRemoveSigner(actionNonce);

        assertFalse(registry.isSigner(signer3));
        assertEq(registry.getSignerCount(), 2);
    }

    function test_RevertWhen_InsufficientSignatures() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        // Propose action (1 signature from proposer)
        bytes memory data = abi.encode(rxId);
        uint256 actionNonce = registry.proposeAdminAction(
            PrescriptionRegistry.AdminActionType.AccessPrescription,
            data
        );

        // Try to execute without 2nd signature
        vm.expectRevert("Insufficient signatures");
        registry.executeGetPrescription(actionNonce);
    }

    function test_RevertWhen_AlreadyExecuted() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        bytes memory data = abi.encode(rxId);
        uint256 actionNonce = registry.proposeAdminAction(
            PrescriptionRegistry.AdminActionType.AccessPrescription,
            data
        );

        vm.prank(signer2);
        registry.approveAdminAction(actionNonce);

        // Execute once
        registry.executeGetPrescription(actionNonce);

        // Try to execute again
        vm.expectRevert("Already executed");
        registry.executeGetPrescription(actionNonce);
    }

    // ============ Fuzz Tests ============

    function testFuzz_CreatePrescription(uint256 validityDays) external {
        validityDays = bound(validityDays, 1, 365);

        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, validityDays, PATIENT_SECRET);

        vm.prank(pharmacist);
        assertTrue(registry.isPrescriptionDispensable(rxId, PATIENT_HASH, RX_HASH));
    }

    function testFuzz_DispenseAfterTime(uint256 validityDays, uint256 timeElapsed) external {
        validityDays = bound(validityDays, 1, 365);
        timeElapsed = bound(timeElapsed, 0, 365 days * 2);

        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, validityDays, PATIENT_SECRET);

        vm.warp(block.timestamp + timeElapsed);

        bool shouldBeValid = timeElapsed < (validityDays * 1 days);

        if (shouldBeValid) {
            vm.prank(pharmacist);
            registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

            PrescriptionRegistry.Prescription memory rx = getPrescriptionViaMultiSig(rxId);
            assertTrue(rx.status == PrescriptionRegistry.PrescriptionStatus.Dispensed);
        } else {
            vm.prank(pharmacist);
            vm.expectRevert("Prescription expired");
            registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);
        }
    }

    // ============ Access Control Tests ============

    function test_PatientCanAccessWithProof() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        // Patient can access with correct secret
        PrescriptionRegistry.Prescription memory rx = registry.getPrescriptionWithProof(rxId, PATIENT_SECRET);
        assertEq(rx.prescriptionId, rxId);
        assertEq(rx.patientSecret, PATIENT_SECRET);
    }

    function test_RevertWhen_PatientUsesWrongProof() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        bytes32 wrongSecret = keccak256("wrong-secret");
        vm.expectRevert("Invalid patient proof");
        registry.getPrescriptionWithProof(rxId, wrongSecret);
    }

    function test_PharmacistCanVerifyForDispensing() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        // Pharmacist can verify prescription
        vm.prank(pharmacist);
        PrescriptionRegistry.Prescription memory rx = registry.verifyPrescriptionForDispensing(
            rxId,
            PATIENT_HASH,
            RX_HASH
        );
        assertEq(rx.prescriptionId, rxId);
    }

    function test_RevertWhen_NonPharmacistVerifies() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.prank(patient);
        vm.expectRevert("No credential found");
        registry.verifyPrescriptionForDispensing(rxId, PATIENT_HASH, RX_HASH);
    }

    function test_DoctorCanAccessOwnPrescription() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.prank(doctor);
        PrescriptionRegistry.Prescription memory rx = registry.getPrescriptionAsDoctor(rxId);
        assertEq(rx.prescriptionId, rxId);
    }

    function test_RevertWhen_DoctorAccessesOthersPrescription() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        address otherDoctor = makeAddr("otherDoctor");
        sbt.issueCredential(
            otherDoctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "other-hash",
            "Surgery",
            "QmOther",
            5
        );

        vm.prank(otherDoctor);
        vm.expectRevert("Not the issuing doctor");
        registry.getPrescriptionAsDoctor(rxId);
    }

    function test_MultiSigCanAccessAnyPrescription() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        // Multi-sig can access any prescription
        PrescriptionRegistry.Prescription memory rx = getPrescriptionViaMultiSig(rxId);
        assertEq(rx.prescriptionId, rxId);
    }

    function test_RevertWhen_NonSignerAccessesPrescription() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30, PATIENT_SECRET);

        vm.prank(pharmacist);
        vm.expectRevert("Not a signer");
        bytes memory data = abi.encode(rxId);
        registry.proposeAdminAction(
            PrescriptionRegistry.AdminActionType.AccessPrescription,
            data
        );
    }
}
