// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Sendly} from "../src/Sendly.sol";

contract DeployScript is Script {
    function run() external returns (Sendly sendly) {
        vm.startBroadcast();
        sendly = new Sendly();
        vm.stopBroadcast();

        console.log("Sendly deployed at:", address(sendly));
    }
}
