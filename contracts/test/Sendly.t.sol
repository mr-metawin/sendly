// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Sendly} from "../src/Sendly.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// Reentrant attacker attempting recursive claim
contract ReentrantClaimer {
    Sendly public sendly;
    uint256 public packetId;
    bytes public sig;
    bool public attacked;

    constructor(Sendly _sendly) {
        sendly = _sendly;
    }

    function setAttack(uint256 _packetId, bytes calldata _sig) external {
        packetId = _packetId;
        sig = _sig;
        attacked = false;
    }

    function executeClaim() external {
        sendly.claim(packetId, sig);
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            // Attempt reentrancy
            sendly.claim(packetId, sig);
        }
    }
}

// Reentrant attacker attempting recursive reclaim
contract ReentrantSender {
    Sendly public sendly;
    uint256 public packetId;
    bool public attacked;

    constructor(Sendly _sendly) {
        sendly = _sendly;
    }

    function create(address signer, uint32 slots, uint32 expiryHours, string calldata msgStr) external payable returns (uint256) {
        packetId = sendly.createPacket{value: msg.value}(signer, slots, expiryHours, msgStr);
        return packetId;
    }

    function executeReclaim() external {
        sendly.reclaim(packetId);
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            sendly.reclaim(packetId);
        }
    }
}

// Handler for invariant testing
contract SendlyHandler is Test {
    Sendly public sendly;
    uint256 public signerPrivateKey = 0xABCD1234;
    address public signer;

    uint256[] public packetIds;
    address[] public users;

    constructor(Sendly _sendly) {
        sendly = _sendly;
        signer = vm.addr(signerPrivateKey);

        users.push(makeAddr("inv_user1"));
        users.push(makeAddr("inv_user2"));
        users.push(makeAddr("inv_user3"));
        users.push(makeAddr("inv_user4"));
        users.push(makeAddr("inv_user5"));

        for (uint256 i = 0; i < users.length; i++) {
            vm.deal(users[i], 1000 ether);
        }
    }

    function createPacket(uint256 userIdx, uint32 slots, uint32 expiryHours, uint256 amount) external {
        userIdx = bound(userIdx, 0, users.length - 1);
        slots = uint32(bound(slots, 1, 10));
        expiryHours = uint32(bound(expiryHours, 1, 24));
        amount = bound(amount, slots, 10 ether);

        address sender = users[userIdx];
        vm.prank(sender);
        uint256 id = sendly.createPacket{value: amount}(signer, slots, expiryHours, "Test packet");
        packetIds.push(id);
    }

    function claimPacket(uint256 packetIdx, uint256 userIdx) external {
        if (packetIds.length == 0) return;
        packetIdx = bound(packetIdx, 0, packetIds.length - 1);
        userIdx = bound(userIdx, 0, users.length - 1);

        uint256 id = packetIds[packetIdx];
        address claimer = users[userIdx];

        Sendly.Packet memory p = sendly.getPacket(id);
        if (p.reclaimed || p.claimed >= p.slots || block.timestamp > p.expiresAt || p.sender == claimer || sendly.hasClaimed(id, claimer)) {
            return;
        }

        bytes32 digest = sendly.computeDigest(id, claimer);
        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(digest);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSigned);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(claimer);
        try sendly.claim(id, signature) {} catch {}
    }

    function reclaimPacket(uint256 packetIdx) external {
        if (packetIds.length == 0) return;
        packetIdx = bound(packetIdx, 0, packetIds.length - 1);
        uint256 id = packetIds[packetIdx];

        Sendly.Packet memory p = sendly.getPacket(id);
        if (p.reclaimed || p.remaining == 0 || block.timestamp <= p.expiresAt) {
            return;
        }

        vm.prank(p.sender);
        try sendly.reclaim(id) {} catch {}
    }

    function warp(uint256 secondsToWarp) external {
        secondsToWarp = bound(secondsToWarp, 1, 30 days);
        vm.warp(block.timestamp + secondsToWarp);
    }

    function totalRemaining() external view returns (uint256 sum) {
        uint256 count = sendly.packetCount();
        for (uint256 i = 1; i <= count; i++) {
            Sendly.Packet memory p = sendly.getPacket(i);
            sum += p.remaining;
        }
    }
}

contract SendlyTest is Test {
    Sendly public sendly;

    uint256 internal signerPk = 0x12345678;
    address internal signer;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal charlie = makeAddr("charlie");
    address internal dave = makeAddr("dave");

    function setUp() public {
        sendly = new Sendly();
        signer = vm.addr(signerPk);

        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
        vm.deal(charlie, 1000 ether);
        vm.deal(dave, 1000 ether);
    }

    function helperSign(uint256 packetId, address claimer, uint256 privateKey) internal view returns (bytes memory) {
        bytes32 digest = sendly.computeDigest(packetId, claimer);
        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(digest);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSigned);
        return abi.encodePacked(r, s, v);
    }

    // --- createPacket tests ---

    function test_CreatePacket_Success() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 5, 24, "Happy Holidays!");

        assertEq(id, 1);
        assertEq(sendly.packetCount(), 1);

        Sendly.Packet memory p = sendly.getPacket(1);
        assertEq(p.sender, alice);
        assertEq(p.signer, signer);
        assertEq(p.total, 10 ether);
        assertEq(p.remaining, 10 ether);
        assertEq(p.slots, 5);
        assertEq(p.claimed, 0);
        assertEq(p.expiresAt, block.timestamp + 24 hours);
        assertEq(p.message, "Happy Holidays!");
        assertFalse(p.reclaimed);

        uint256[] memory senderIds = sendly.getPacketIdsBySender(alice);
        assertEq(senderIds.length, 1);
        assertEq(senderIds[0], 1);
    }

    function test_CreatePacket_RevertZeroSigner() public {
        vm.prank(alice);
        vm.expectRevert(Sendly.ZeroSigner.selector);
        sendly.createPacket{value: 10 ether}(address(0), 5, 24, "msg");
    }

    function test_CreatePacket_RevertBadSlots() public {
        vm.prank(alice);
        vm.expectRevert(Sendly.InvalidSlots.selector);
        sendly.createPacket{value: 10 ether}(signer, 0, 24, "msg");

        vm.prank(alice);
        vm.expectRevert(Sendly.InvalidSlots.selector);
        sendly.createPacket{value: 10 ether}(signer, 101, 24, "msg");
    }

    function test_CreatePacket_RevertBadExpiry() public {
        vm.prank(alice);
        vm.expectRevert(Sendly.InvalidExpiry.selector);
        sendly.createPacket{value: 10 ether}(signer, 5, 0, "msg");

        vm.prank(alice);
        vm.expectRevert(Sendly.InvalidExpiry.selector);
        sendly.createPacket{value: 10 ether}(signer, 5, 721, "msg");
    }

    function test_CreatePacket_RevertZeroValue() public {
        vm.prank(alice);
        vm.expectRevert(Sendly.ZeroValue.selector);
        sendly.createPacket{value: 0}(signer, 5, 24, "msg");
    }

    function test_CreatePacket_RevertValueBelowSlots() public {
        vm.prank(alice);
        vm.expectRevert(Sendly.InsufficientValue.selector);
        sendly.createPacket{value: 4 wei}(signer, 5, 24, "msg");
    }

    function test_CreatePacket_RevertOverLengthMessage() public {
        bytes memory longBytes = new bytes(141);
        for (uint256 i = 0; i < 141; i++) {
            longBytes[i] = "a";
        }
        string memory longMsg = string(longBytes);

        vm.prank(alice);
        vm.expectRevert(Sendly.MessageTooLong.selector);
        sendly.createPacket{value: 10 ether}(signer, 5, 24, longMsg);
    }

    // --- claim tests ---

    function test_Claim_PaysRightAmount_AndDustRemainder() public {
        uint256 total = 10 ether;
        uint32 slots = 3;

        vm.prank(alice);
        uint256 id = sendly.createPacket{value: total}(signer, slots, 24, "Split 3");

        bytes memory sigBob = helperSign(id, bob, signerPk);
        bytes memory sigCharlie = helperSign(id, charlie, signerPk);
        bytes memory sigDave = helperSign(id, dave, signerPk);

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        sendly.claim(id, sigBob);
        uint256 bobGot = bob.balance - bobBefore;
        assertEq(bobGot, total / slots);

        uint256 charlieBefore = charlie.balance;
        vm.prank(charlie);
        sendly.claim(id, sigCharlie);
        uint256 charlieGot = charlie.balance - charlieBefore;
        assertEq(charlieGot, total / slots);

        uint256 daveBefore = dave.balance;
        vm.prank(dave);
        sendly.claim(id, sigDave);
        uint256 daveGot = dave.balance - daveBefore;

        assertEq(bobGot + charlieGot + daveGot, total);
        assertEq(address(sendly).balance, 0);

        Sendly.Packet memory p = sendly.getPacket(id);
        assertEq(p.claimed, 3);
        assertEq(p.remaining, 0);
    }

    function test_Claim_RevertSenderCannotClaim() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 2, 24, "Self test");

        bytes memory sigAlice = helperSign(id, alice, signerPk);
        vm.prank(alice);
        vm.expectRevert(Sendly.SenderCannotClaim.selector);
        sendly.claim(id, sigAlice);
    }

    function test_Claim_RevertRepeatClaim() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 2, 24, "Repeat test");

        bytes memory sigBob = helperSign(id, bob, signerPk);
        vm.prank(bob);
        sendly.claim(id, sigBob);

        vm.prank(bob);
        vm.expectRevert(Sendly.AlreadyClaimed.selector);
        sendly.claim(id, sigBob);
    }

    function test_Claim_RevertExpiredPacket() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 2, 2, "Expiry test");

        vm.warp(block.timestamp + 2 hours + 1);

        bytes memory sigBob = helperSign(id, bob, signerPk);
        vm.prank(bob);
        vm.expectRevert(Sendly.PacketExpired.selector);
        sendly.claim(id, sigBob);
    }

    function test_Claim_RevertFullPacket() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 1, 24, "Single slot");

        bytes memory sigBob = helperSign(id, bob, signerPk);
        vm.prank(bob);
        sendly.claim(id, sigBob);

        bytes memory sigCharlie = helperSign(id, charlie, signerPk);
        vm.prank(charlie);
        vm.expectRevert(Sendly.PacketFullyClaimed.selector);
        sendly.claim(id, sigCharlie);
    }

    function test_Claim_RevertBadSignature() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 2, 24, "Bad sig");

        uint256 wrongPk = 0x999999;
        bytes memory badSig = helperSign(id, bob, wrongPk);

        vm.prank(bob);
        vm.expectRevert(Sendly.InvalidSignature.selector);
        sendly.claim(id, badSig);
    }

    // --- Front-running protection tests ---

    function test_FrontRunning_SignatureForWalletACannotBeClaimedByWalletB() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 2, 24, "Front-run test");

        bytes memory sigForBob = helperSign(id, bob, signerPk);

        vm.prank(charlie);
        vm.expectRevert(Sendly.InvalidSignature.selector);
        sendly.claim(id, sigForBob);
    }

    function test_FrontRunning_SignatureForPacket1DoesNotWorkOnPacket2() public {
        vm.prank(alice);
        uint256 id1 = sendly.createPacket{value: 10 ether}(signer, 2, 24, "P1");

        vm.prank(alice);
        uint256 id2 = sendly.createPacket{value: 10 ether}(signer, 2, 24, "P2");

        bytes memory sigForP1 = helperSign(id1, bob, signerPk);

        vm.prank(bob);
        vm.expectRevert(Sendly.InvalidSignature.selector);
        sendly.claim(id2, sigForP1);
    }

    // --- reclaim tests ---

    function test_Reclaim_WorksOnlyForSenderAfterExpiry() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 2, 5, "Reclaim test");

        bytes memory sigBob = helperSign(id, bob, signerPk);
        vm.prank(bob);
        sendly.claim(id, sigBob);

        vm.prank(alice);
        vm.expectRevert(Sendly.PacketNotExpired.selector);
        sendly.reclaim(id);

        vm.warp(block.timestamp + 5 hours + 1);

        vm.prank(bob);
        vm.expectRevert(Sendly.NotSender.selector);
        sendly.reclaim(id);

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        sendly.reclaim(id);

        uint256 aliceRefund = alice.balance - aliceBefore;
        assertEq(aliceRefund, 5 ether);
        assertEq(address(sendly).balance, 0);

        Sendly.Packet memory p = sendly.getPacket(id);
        assertTrue(p.reclaimed);
        assertEq(p.remaining, 0);

        vm.prank(alice);
        vm.expectRevert(Sendly.PacketAlreadyReclaimed.selector);
        sendly.reclaim(id);
    }

    function test_Reclaim_RevertsIfNothingLeft() public {
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 1, 1, "Full claim");

        bytes memory sigBob = helperSign(id, bob, signerPk);
        vm.prank(bob);
        sendly.claim(id, sigBob);

        vm.warp(block.timestamp + 1 hours + 1);

        vm.prank(alice);
        vm.expectRevert(Sendly.NothingToReclaim.selector);
        sendly.reclaim(id);
    }

    // --- Reentrancy tests ---

    function test_Reentrancy_ClaimBlocked() public {
        ReentrantClaimer attacker = new ReentrantClaimer(sendly);
        vm.deal(address(attacker), 1 ether);

        vm.prank(alice);
        uint256 id = sendly.createPacket{value: 10 ether}(signer, 2, 24, "Reentrancy test");

        bytes memory sig = helperSign(id, address(attacker), signerPk);
        attacker.setAttack(id, sig);

        vm.expectRevert();
        attacker.executeClaim();
    }

    function test_Reentrancy_ReclaimBlocked() public {
        ReentrantSender attackerSender = new ReentrantSender(sendly);
        vm.deal(address(attackerSender), 10 ether);

        attackerSender.create{value: 5 ether}(signer, 2, 1, "Reentrant sender");

        vm.warp(block.timestamp + 1 hours + 1);

        vm.expectRevert();
        attackerSender.executeReclaim();
    }

    // --- Fuzz test ---

    function testFuzz_PayoutsNeverCreateOrDestroyBOT(
        uint96 totalAmount,
        uint8 slotsCount,
        uint8 claimersCount
    ) public {
        slotsCount = uint8(bound(slotsCount, 1, 50));
        vm.assume(totalAmount >= slotsCount && totalAmount <= 1000 ether);
        claimersCount = uint8(bound(claimersCount, 0, slotsCount));

        vm.deal(alice, totalAmount);
        vm.prank(alice);
        uint256 id = sendly.createPacket{value: totalAmount}(signer, slotsCount, 24, "Fuzz");

        uint256 totalClaimed = 0;
        for (uint256 i = 0; i < claimersCount; i++) {
            address claimer = address(uint160(0x1000 + i));
            bytes memory sig = helperSign(id, claimer, signerPk);
            uint256 balBefore = claimer.balance;

            vm.prank(claimer);
            sendly.claim(id, sig);

            totalClaimed += (claimer.balance - balBefore);
        }

        Sendly.Packet memory p = sendly.getPacket(id);
        assertEq(totalClaimed + p.remaining, totalAmount);
        assertEq(address(sendly).balance, p.remaining);

        if (claimersCount < slotsCount) {
            vm.warp(block.timestamp + 24 hours + 1);
            uint256 senderBalBefore = alice.balance;
            vm.prank(alice);
            sendly.reclaim(id);

            uint256 reclaimedAmt = alice.balance - senderBalBefore;
            assertEq(totalClaimed + reclaimedAmt, totalAmount);
            assertEq(address(sendly).balance, 0);
        } else {
            assertEq(totalClaimed, totalAmount);
            assertEq(p.remaining, 0);
            assertEq(address(sendly).balance, 0);
        }
    }
}

contract SendlyInvariantTest is Test {
    Sendly public sendly;
    SendlyHandler public handler;

    function setUp() public {
        sendly = new Sendly();
        handler = new SendlyHandler(sendly);
        targetContract(address(handler));
    }

    function invariant_ContractBalanceEqualsSumOfRemaining() public view {
        assertEq(address(sendly).balance, handler.totalRemaining());
    }
}
