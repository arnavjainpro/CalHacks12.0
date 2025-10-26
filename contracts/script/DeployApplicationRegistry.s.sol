// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ApplicationRegistry.sol";

contract DeployApplicationRegistry is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy ApplicationRegistry
        ApplicationRegistry registry = new ApplicationRegistry();

        console.log("ApplicationRegistry deployed to:", address(registry));
        console.log("Owner:", registry.owner());

        vm.stopBroadcast();
    }
}
