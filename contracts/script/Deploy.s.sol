// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MedicalCredentialSBT} from "../src/MedicalCredentialSBT.sol";
import {PrescriptionRegistry} from "../src/PrescriptionRegistry.sol";

/**
 * @title Deploy
 * @dev Deployment script for MedChain contracts
 * @notice Deploy with: forge script script/Deploy.s.sol --rpc-url <network> --broadcast --verify
 */
contract Deploy is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("Deploying MedChain contracts...");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("===========================================");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy MedicalCredentialSBT
        console.log("\n1. Deploying MedicalCredentialSBT...");
        MedicalCredentialSBT sbt = new MedicalCredentialSBT();
        console.log("   MedicalCredentialSBT deployed at:", address(sbt));

        // Step 2: Deploy PrescriptionRegistry
        console.log("\n2. Deploying PrescriptionRegistry...");
        PrescriptionRegistry registry = new PrescriptionRegistry(address(sbt));
        console.log("   PrescriptionRegistry deployed at:", address(registry));

        vm.stopBroadcast();

        // Verification checks
        console.log("\n===========================================");
        console.log("Deployment Verification");
        console.log("===========================================");
        require(address(sbt) != address(0), "SBT deployment failed");
        require(address(registry) != address(0), "Registry deployment failed");
        require(sbt.owner() == deployer, "SBT owner mismatch");
        require(address(registry.credentialSBT()) == address(sbt), "Registry SBT reference mismatch");

        console.log("All checks passed!");

        // Display deployment summary
        console.log("\n===========================================");
        console.log("Deployment Summary");
        console.log("===========================================");
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Deployer:", deployer);
        console.log("MedicalCredentialSBT:", address(sbt));
        console.log("PrescriptionRegistry:", address(registry));
        console.log("===========================================");
        console.log("\nSave these addresses for frontend integration!");
        console.log("===========================================");
    }

    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "Ethereum Mainnet";
        if (chainId == 11155111) return "Sepolia Testnet";
        if (chainId == 8453) return "Base Mainnet";
        if (chainId == 84532) return "Base Sepolia";
        if (chainId == 31337) return "Anvil Local";
        return "Unknown Network";
    }
}
