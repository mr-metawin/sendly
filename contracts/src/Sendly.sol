// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract Sendly is ReentrancyGuard {
    struct Packet {
        address sender;
        address signer;
        uint256 total;
        uint256 remaining;
        uint32 slots;
        uint32 claimed;
        uint64 expiresAt;
        string message;
        bool reclaimed;
    }

    // Packet storage
    uint256 public packetCount;
    mapping(uint256 => Packet) private _packets;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(address => uint256[]) private _packetsBySender;

    // Events
    event PacketCreated(uint256 indexed id, address indexed sender, uint256 total, uint32 slots);
    event Claimed(uint256 indexed id, address indexed claimer, uint256 amount);
    event Reclaimed(uint256 indexed id, address indexed sender, uint256 amount);

    // Custom errors
    error ZeroSigner();
    error InvalidSlots();
    error InvalidExpiry();
    error ZeroValue();
    error InsufficientValue();
    error MessageTooLong();
    error PacketNotFound();
    error PacketAlreadyReclaimed();
    error PacketFullyClaimed();
    error PacketExpired();
    error PacketNotExpired();
    error SenderCannotClaim();
    error AlreadyClaimed();
    error InvalidSignature();
    error NothingToReclaim();
    error NotSender();
    error TransferFailed();

    /**
     * @notice Create a packet with BOT locked for claiming via signature.
     * @param signer The address whose private key will authorize claims.
     * @param slots Total number of claimers allowed (1 - 100).
     * @param expiryHours Expiry duration in hours (1 - 720).
     * @param message Optional message attached to the gift (max 140 bytes).
     */
    function createPacket(
        address signer,
        uint32 slots,
        uint32 expiryHours,
        string calldata message
    ) external payable returns (uint256 id) {
        if (signer == address(0)) revert ZeroSigner();
        if (slots == 0 || slots > 100) revert InvalidSlots();
        if (expiryHours == 0 || expiryHours > 720) revert InvalidExpiry();
        if (msg.value == 0) revert ZeroValue();
        if (msg.value < slots) revert InsufficientValue();
        if (bytes(message).length > 140) revert MessageTooLong();

        id = ++packetCount;
        uint64 expiresAt = uint64(block.timestamp + uint256(expiryHours) * 1 hours);

        _packets[id] = Packet({
            sender: msg.sender,
            signer: signer,
            total: msg.value,
            remaining: msg.value,
            slots: slots,
            claimed: 0,
            expiresAt: expiresAt,
            message: message,
            reclaimed: false
        });

        _packetsBySender[msg.sender].push(id);

        emit PacketCreated(id, msg.sender, msg.value, slots);
    }

    /**
     * @notice Claim a share of the packet using an EIP-191 signature signed by packet.signer.
     * @param id The ID of the packet.
     * @param signature The EIP-191 signature covering computeDigest(id, msg.sender).
     */
    function claim(uint256 id, bytes calldata signature) external nonReentrant {
        if (id == 0 || id > packetCount) revert PacketNotFound();
        Packet storage packet = _packets[id];

        if (packet.reclaimed) revert PacketAlreadyReclaimed();
        if (packet.claimed >= packet.slots) revert PacketFullyClaimed();
        if (block.timestamp > packet.expiresAt) revert PacketExpired();
        if (msg.sender == packet.sender) revert SenderCannotClaim();
        if (hasClaimed[id][msg.sender]) revert AlreadyClaimed();

        bytes32 digest = computeDigest(id, msg.sender);
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(digest);
        address recovered = ECDSA.recover(ethSignedMessageHash, signature);
        if (recovered != packet.signer) revert InvalidSignature();

        uint32 nextClaimed = packet.claimed + 1;
        uint256 amount;
        if (nextClaimed == packet.slots) {
            amount = packet.remaining;
        } else {
            amount = packet.total / packet.slots;
        }

        hasClaimed[id][msg.sender] = true;
        packet.claimed = nextClaimed;
        packet.remaining -= amount;

        emit Claimed(id, msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Reclaim any unclaimed BOT remaining in the packet after it expires.
     * @param id The ID of the packet.
     */
    function reclaim(uint256 id) external nonReentrant {
        if (id == 0 || id > packetCount) revert PacketNotFound();
        Packet storage packet = _packets[id];

        if (msg.sender != packet.sender) revert NotSender();
        if (block.timestamp <= packet.expiresAt) revert PacketNotExpired();
        if (packet.reclaimed) revert PacketAlreadyReclaimed();
        if (packet.remaining == 0) revert NothingToReclaim();

        uint256 amount = packet.remaining;
        packet.reclaimed = true;
        packet.remaining = 0;

        emit Reclaimed(id, msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Get packet details by ID.
     */
    function getPacket(uint256 id) external view returns (Packet memory) {
        if (id == 0 || id > packetCount) revert PacketNotFound();
        return _packets[id];
    }

    /**
     * @notice Get all packet IDs created by a sender.
     */
    function getPacketIdsBySender(address sender) external view returns (uint256[] memory) {
        return _packetsBySender[sender];
    }

    /**
     * @notice Compute EIP-191 digest for packet claiming.
     */
    function computeDigest(uint256 packetId, address claimer) public view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), packetId, claimer));
    }
}
