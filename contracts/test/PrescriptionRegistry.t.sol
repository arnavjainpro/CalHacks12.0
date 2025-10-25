// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

    uint256 public doctorTokenId;
    uint256 public pharmacistTokenId;

    bytes32 constant PATIENT_HASH = keccak256("patient-data");
    bytes32 constant RX_HASH = keccak256("prescription-data");
    string constant IPFS_CID = "QmPrescription123";

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

        // Deploy contracts
        sbt = new MedicalCredentialSBT();
        registry = new PrescriptionRegistry(address(sbt));

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
            validityDays
        );

        vm.stopPrank();

        assertEq(rxId, 1, "Prescription ID should be 1");
        assertEq(registry.totalPrescriptions(), 1, "Should have 1 prescription");

        // Verify prescription details
        (
            uint256 docTokenId,
            bytes32 patientHash,
            bytes32 rxHash,
            string memory ipfsCid,
            PrescriptionRegistry.PrescriptionStatus status,
            ,
            ,
            ,
        ) = registry.getPrescriptionDetails(rxId);

        assertEq(docTokenId, doctorTokenId);
        assertEq(patientHash, PATIENT_HASH);
        assertEq(rxHash, RX_HASH);
        assertEq(ipfsCid, IPFS_CID);
        assertTrue(status == PrescriptionRegistry.PrescriptionStatus.Active);
    }

    function test_RevertWhen_UnauthorizedCreation() external {
        vm.prank(patient); // Patient has no credential
        vm.expectRevert("No credential found");
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);
    }

    function test_RevertWhen_InvalidPrescriptionData() external {
        vm.startPrank(doctor);

        vm.expectRevert("Invalid patient data hash");
        registry.createPrescription(bytes32(0), RX_HASH, IPFS_CID, 30);

        vm.expectRevert("Invalid prescription data hash");
        registry.createPrescription(PATIENT_HASH, bytes32(0), IPFS_CID, 30);

        vm.expectRevert("IPFS CID required");
        registry.createPrescription(PATIENT_HASH, RX_HASH, "", 30);

        vm.expectRevert("Invalid validity period");
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 0);

        vm.expectRevert("Invalid validity period");
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 366);

        vm.stopPrank();
    }

    // ============ Prescription Dispensing Tests ============

    function test_DispensePrescription() external {
        // Create prescription
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        // Dispense prescription
        vm.startPrank(pharmacist);

        vm.expectEmit(true, true, true, true);
        emit PrescriptionDispensed(rxId, pharmacistTokenId, pharmacist, block.timestamp);

        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        vm.stopPrank();

        // Verify status changed
        PrescriptionRegistry.Prescription memory rx = registry.getPrescription(rxId);
        assertTrue(rx.status == PrescriptionRegistry.PrescriptionStatus.Dispensed);
        assertEq(rx.pharmacistTokenId, pharmacistTokenId);
    }

    function test_RevertWhen_UnauthorizedDispensing() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        vm.prank(patient);
        vm.expectRevert("No credential found");
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);
    }

    function test_RevertWhen_DataMismatch() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

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
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        vm.prank(pharmacist);
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        vm.prank(pharmacist);
        vm.expectRevert("Prescription not active");
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);
    }

    function test_RevertWhen_Expired() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        // Fast forward past expiry
        vm.warp(block.timestamp + 31 days);

        vm.prank(pharmacist);
        vm.expectRevert("Prescription expired");
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);
    }

    // ============ Prescription Cancellation Tests ============

    function test_CancelPrescription() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        vm.prank(doctor);
        registry.cancelPrescription(rxId, "Patient requested cancellation");

        PrescriptionRegistry.Prescription memory rx = registry.getPrescription(rxId);
        assertTrue(rx.status == PrescriptionRegistry.PrescriptionStatus.Cancelled);
    }

    function test_RevertWhen_NotIssuingDoctor() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

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
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        assertTrue(registry.isPrescriptionDispensable(rxId), "Should be dispensable");

        // After dispensing
        vm.prank(pharmacist);
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        assertFalse(registry.isPrescriptionDispensable(rxId), "Should not be dispensable after filling");
    }

    function test_DoctorCanViewOwnPrescriptions() external {
        vm.startPrank(doctor);
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);
        registry.createPrescription(PATIENT_HASH, RX_HASH, "QmRx2", 30);

        // Doctor can view their own prescriptions
        uint256[] memory rxIds = registry.getMyPrescriptions();
        assertEq(rxIds.length, 2, "Doctor should have 2 prescriptions");
        assertEq(rxIds[0], 1);
        assertEq(rxIds[1], 2);
        vm.stopPrank();
    }

    function test_PharmacistCanViewOwnDispensals() external {
        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        vm.startPrank(pharmacist);
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        // Pharmacist can view their own dispensals
        uint256[] memory rxIds = registry.getMyDispensals();
        assertEq(rxIds.length, 1, "Pharmacist should have 1 dispensal");
        assertEq(rxIds[0], 1);
        vm.stopPrank();
    }

    function test_AdminCanAccessAuditTrails() external {
        // Owner is admin by default
        vm.startPrank(doctor);
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);
        registry.createPrescription(PATIENT_HASH, RX_HASH, "QmRx2", 30);
        vm.stopPrank();

        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, "QmRx3", 30);

        vm.prank(pharmacist);
        registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

        // Admin (owner) can access all audit trails
        uint256[] memory doctorRxIds = registry.getDoctorPrescriptions(doctorTokenId);
        assertEq(doctorRxIds.length, 3, "Should see all doctor prescriptions");

        uint256[] memory pharmRxIds = registry.getPharmacistDispensals(pharmacistTokenId);
        assertEq(pharmRxIds.length, 1, "Should see all pharmacist dispensals");
    }

    function test_RevertWhen_NonAdminAccessesAuditTrails() external {
        vm.prank(doctor);
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        // Non-admin cannot access other provider's audit trails
        vm.prank(pharmacist);
        vm.expectRevert("Only admin can call this function");
        registry.getDoctorPrescriptions(doctorTokenId);

        vm.prank(doctor);
        vm.expectRevert("Only admin can call this function");
        registry.getPharmacistDispensals(pharmacistTokenId);
    }

    function test_SetAdmin() external {
        address newAdmin = makeAddr("newAdmin");

        // Owner (current admin) can set new admin
        registry.setAdmin(newAdmin);
        assertEq(registry.admin(), newAdmin);

        // New admin can now access audit trails
        vm.prank(doctor);
        registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, 30);

        vm.prank(newAdmin);
        uint256[] memory rxIds = registry.getDoctorPrescriptions(doctorTokenId);
        assertEq(rxIds.length, 1);
    }

    function test_RevertWhen_NonAdminSetsAdmin() external {
        address newAdmin = makeAddr("newAdmin");

        vm.prank(doctor);
        vm.expectRevert("Only admin can call this function");
        registry.setAdmin(newAdmin);
    }

    // ============ Fuzz Tests ============

    function testFuzz_CreatePrescription(uint256 validityDays) external {
        validityDays = bound(validityDays, 1, 365);

        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, validityDays);

        assertTrue(registry.isPrescriptionDispensable(rxId));
    }

    function testFuzz_DispenseAfterTime(uint256 validityDays, uint256 timeElapsed) external {
        validityDays = bound(validityDays, 1, 365);
        timeElapsed = bound(timeElapsed, 0, 365 days * 2);

        vm.prank(doctor);
        uint256 rxId = registry.createPrescription(PATIENT_HASH, RX_HASH, IPFS_CID, validityDays);

        vm.warp(block.timestamp + timeElapsed);

        bool shouldBeValid = timeElapsed < (validityDays * 1 days);

        if (shouldBeValid) {
            vm.prank(pharmacist);
            registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);

            PrescriptionRegistry.Prescription memory rx = registry.getPrescription(rxId);
            assertTrue(rx.status == PrescriptionRegistry.PrescriptionStatus.Dispensed);
        } else {
            vm.prank(pharmacist);
            vm.expectRevert("Prescription expired");
            registry.dispensePrescription(rxId, PATIENT_HASH, RX_HASH);
        }
    }
}
