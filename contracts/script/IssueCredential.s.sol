// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MedicalCredentialSBT} from "../src/MedicalCredentialSBT.sol";

contract IssueCredential is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address sbtAddress = vm.envAddress("CREDENTIAL_SBT_ADDRESS");
        
        console.log("===========================================");
        console.log("Issuing Medical Credential...");
        console.log("===========================================");
        console.log("SBT Contract:", sbtAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        MedicalCredentialSBT sbt = MedicalCredentialSBT(sbtAddress);
        
        // Issue pharmacist credential to 0xBb9f2f4C9A508701dde03e8d591D67992E35A61b
        address pharmacist = 0xBb9f2f4C9A508701dde03e8d591D67992E35A61b;

        uint256 tokenId1 = sbt.issueCredential(
            pharmacist,
            MedicalCredentialSBT.CredentialType.Pharmacist,  // Pharmacist credential
            "0xPHARM123456",        // License hash (example)
            "Retail Pharmacy",      // Specialty
            "QmPharmacistMetadata", // IPFS CID
            5                        // Valid for 5 years
        );

        console.log("Pharmacist credential issued!");
        console.log("Token ID:", tokenId1);
        console.log("Holder:", pharmacist);

        // Issue doctor credential to 0x18a7Fe083A143f45d524EE8f055c0a027534D2A0
        address doctor = 0x18a7Fe083A143f45d524EE8f055c0a027534D2A0;

        uint256 tokenId2 = sbt.issueCredential(
            doctor,
            MedicalCredentialSBT.CredentialType.Doctor,  // Doctor credential
            "0x1234567890abcdef",  // License hash (example)
            "General Practice",     // Specialty
            "QmTestMetadataURI",    // IPFS CID
            5                        // Valid for 5 years
        );

        console.log("Doctor credential issued!");
        console.log("Token ID:", tokenId2);
        console.log("Holder:", doctor);
        
        vm.stopBroadcast();
        
        console.log("===========================================");
    }
}
