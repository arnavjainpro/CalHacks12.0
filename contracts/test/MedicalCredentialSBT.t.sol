// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MedicalCredentialSBT} from "../src/MedicalCredentialSBT.sol";

contract MedicalCredentialSBTTest is Test {
    MedicalCredentialSBT public sbt;

    address public owner;
    address public doctor;
    address public pharmacist;

    // Events to test
    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed holder,
        MedicalCredentialSBT.CredentialType credentialType,
        string specialty,
        string metadataURI,
        uint256 expiresAt
    );

    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed holder,
        uint256 revokedAt
    );

    function setUp() external {
        owner = address(this);
        doctor = makeAddr("doctor");
        pharmacist = makeAddr("pharmacist");

        sbt = new MedicalCredentialSBT();
    }

    // ============ Credential Issuance Tests ============

    function test_IssueCredential() external {
        uint256 validityYears = 3;

        vm.expectEmit(true, true, false, true);
        emit CredentialIssued(
            1,
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "Cardiology",
            "QmTest123",
            block.timestamp + (validityYears * 365 days)
        );

        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            validityYears
        );

        assertEq(tokenId, 1, "Token ID should be 1");
        assertEq(sbt.ownerOf(tokenId), doctor, "Doctor should own the token");
        assertEq(sbt.getTokenIdByHolder(doctor), tokenId, "Mapping should be updated");
    }

    function test_RevertWhen_IssuingToZeroAddress() external {
        vm.expectRevert("Invalid holder address");
        sbt.issueCredential(
            address(0),
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );
    }

    function test_RevertWhen_HolderAlreadyHasCredential() external {
        sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        vm.expectRevert("Holder already has credential");
        sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash456",
            "Surgery",
            "QmTest456",
            3
        );
    }

    function test_RevertWhen_InvalidValidityPeriod() external {
        vm.expectRevert("Invalid validity period");
        sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            0 // Invalid
        );

        vm.expectRevert("Invalid validity period");
        sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            11 // Too long
        );
    }

    // ============ Credential Validation Tests ============

    function test_IsCredentialValid() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        assertTrue(sbt.isCredentialValid(tokenId), "Credential should be valid");
    }

    function test_HasValidCredential() external {
        sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        assertTrue(
            sbt.hasValidCredential(doctor, MedicalCredentialSBT.CredentialType.Doctor),
            "Doctor should have valid doctor credential"
        );

        assertFalse(
            sbt.hasValidCredential(doctor, MedicalCredentialSBT.CredentialType.Pharmacist),
            "Doctor should not have pharmacist credential"
        );
    }

    function test_CredentialExpiry() external {
        uint256 validityYears = 3;
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            validityYears
        );

        assertTrue(sbt.isCredentialValid(tokenId), "Should be valid initially");

        // Fast forward to expiry
        vm.warp(block.timestamp + (validityYears * 365 days));

        assertFalse(sbt.isCredentialValid(tokenId), "Should be expired");
    }

    // ============ Revocation Tests ============

    function test_RevokeCredential() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        vm.expectEmit(true, true, false, true);
        emit CredentialRevoked(tokenId, doctor, block.timestamp);

        sbt.revokeCredential(tokenId);

        assertFalse(sbt.isCredentialValid(tokenId), "Credential should be invalid after revocation");
    }

    function test_ReactivateCredential() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        sbt.revokeCredential(tokenId);
        assertFalse(sbt.isCredentialValid(tokenId));

        sbt.reactivateCredential(tokenId);
        assertTrue(sbt.isCredentialValid(tokenId), "Credential should be valid after reactivation");
    }

    // ============ Soul-Bound Tests ============

    function test_RevertWhen_TransferringToken() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        vm.prank(doctor);
        vm.expectRevert("SBT: Credentials are non-transferable");
        sbt.transferFrom(doctor, pharmacist, tokenId);
    }

    // ============ Fuzz Tests ============

    function testFuzz_IssueCredential(address holder, uint256 validityYears) external {
        // Bound inputs to valid ranges
        vm.assume(holder != address(0));
        vm.assume(holder.code.length == 0); // Not a contract
        validityYears = bound(validityYears, 1, 10);

        uint256 tokenId = sbt.issueCredential(
            holder,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            validityYears
        );

        assertEq(sbt.ownerOf(tokenId), holder);
        assertTrue(sbt.isCredentialValid(tokenId));
    }

    function testFuzz_CredentialExpiry(uint256 validityYears, uint256 timeWarp) external {
        validityYears = bound(validityYears, 1, 10);
        timeWarp = bound(timeWarp, 0, 365 days * 15);

        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            validityYears
        );

        vm.warp(block.timestamp + timeWarp);

        bool shouldBeValid = timeWarp < (validityYears * 365 days);
        assertEq(sbt.isCredentialValid(tokenId), shouldBeValid);
    }

    // ============ Access Control Tests ============

    function test_GetMyCredential() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        // Doctor can view their own credential
        vm.prank(doctor);
        MedicalCredentialSBT.Credential memory cred = sbt.getMyCredential();

        assertEq(uint256(cred.credentialType), uint256(MedicalCredentialSBT.CredentialType.Doctor));
        assertEq(cred.licenseHash, "hash123");
        assertEq(cred.specialty, "Cardiology");
        assertEq(cred.metadataURI, "QmTest123");
        assertEq(cred.holder, doctor);
        assertTrue(cred.isActive);
    }

    function test_RevertWhen_GetMyCredentialWithoutCredential() external {
        vm.prank(pharmacist); // No credential issued yet
        vm.expectRevert("No credential found for caller");
        sbt.getMyCredential();
    }

    function test_GetMyTokenId() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        vm.prank(doctor);
        uint256 retrievedTokenId = sbt.getMyTokenId();
        assertEq(retrievedTokenId, tokenId);
    }

    function test_AdminCanAccessCredentials() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        // Owner (admin) can access any credential
        MedicalCredentialSBT.Credential memory cred = sbt.getCredentialByTokenId(tokenId);
        assertEq(cred.holder, doctor);

        // Owner can also look up token by holder
        uint256 retrievedTokenId = sbt.getTokenIdByHolder(doctor);
        assertEq(retrievedTokenId, tokenId);
    }

    function test_RevertWhen_NonAdminAccessesPrivateData() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        // Non-owner cannot access credential by token ID
        vm.prank(pharmacist);
        vm.expectRevert();
        sbt.getCredentialByTokenId(tokenId);

        // Non-owner cannot look up token by holder
        vm.prank(pharmacist);
        vm.expectRevert();
        sbt.getTokenIdByHolder(doctor);
    }

    function test_PublicFunctionsStillWork() external {
        uint256 tokenId = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,
            "hash123",
            "Cardiology",
            "QmTest123",
            3
        );

        // Anyone can check if a credential is valid (needed for prescription verification)
        assertTrue(sbt.isCredentialValid(tokenId));

        // Anyone can check if an address has a valid credential type
        assertTrue(sbt.hasValidCredential(doctor, MedicalCredentialSBT.CredentialType.Doctor));

        // Anyone can get holder token ID via public function
        assertEq(sbt.getHolderTokenId(doctor), tokenId);
    }
}
