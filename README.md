# Sendly

> **Send BOT with a link.**

Sendly is a minimal, serverless full-stack dApp that lets anyone gift native BOT using a shareable link. The sender locks BOT on-chain and specifies how many people can claim it. Each claimer gets an equal share (with any remainder dust given to the last claimer). If any slots remain unclaimed after the packet expires, the sender can reclaim the remaining BOT.

---

## 🎁 Deployed Contract (BOT Testnet)

- **Network**: BOT Testnet
- **Chain ID**: `968`
- **RPC URL**: `https://rpc.bohr.life`
- **Native Currency**: BOT (18 decimals)
- **Explorer**: `https://scan.bohr.life`
- **Contract Address**: [`0x12cD411ff4a5E07A661973FeFCBCe215B79acb4C`](https://scan.bohr.life/address/0x12cD411ff4a5E07A661973FeFCBCe215B79acb4C)
- **Deployment Transaction**: [`0xfe1f31bf153dd8427d93bb8d4166b614f24f5a257f9fee0e23b0be2084a25712`](https://scan.bohr.life/tx/0xfe1f31bf153dd8427d93bb8d4166b614f24f5a257f9fee0e23b0be2084a25712)

---

## 📊 Pitch Deck

- **PDF Presentation**: [`Sendly_Pitch_Deck.pdf`](Sendly_Pitch_Deck.pdf)
- **Text Summary**: [`Sendly_Pitch_Deck.txt`](Sendly_Pitch_Deck.txt)
- **HTML Slide Viewer**: [`pitch_deck.html`](pitch_deck.html)

---

## 💡 How the Claim Link Works

1. **Client-side Signer Generation**: When creating a packet, the sender's browser generates a random private key using `viem` (`generatePrivateKey`). Only its derived public **address** (`signer`) is sent to the contract.
2. **Key in URL Fragment**: The private key is appended only to the share link's URL fragment (`#/claim/<packetId>/<privateKey>`). Because browsers do not transmit URL fragments to web servers, **the key never reaches a server**.
3. **EIP-191 Claim Signature & Front-Running Protection**: To open the packet, the recipient's browser computes `digest = keccak256(abi.encode(block.chainid, address(this), packetId, claimer))` and signs it using the link's private key. Since the digest includes `msg.sender`, any interceptor or front-runner copying the signature cannot use it for a different address.

> **Important Security Note**: Anyone with the link can claim a share until all slots are filled. Share it only with intended recipients. The key never reaches the contract or a server. This is an unaudited testnet demo.

---

## 📁 Project Structure

```
sendly/
├── contracts/               # Foundry smart contract project
│   ├── src/
│   │   └── Sendly.sol       # Sendly core contract (OZ 5.x)
│   ├── test/
│   │   └── Sendly.t.sol     # Unit, fuzz, reentrancy & invariant tests
│   ├── script/
│   │   └── Deploy.s.sol     # Deployment script
│   └── foundry.toml
├── frontend/                # Vite + React + TypeScript + viem
│   ├── src/
│   │   ├── contracts/       # Address, ABI, BOT testnet chain config
│   │   ├── App.tsx          # Single-page hash router & application
│   │   ├── App.css          # Warm festive red-and-gold styling
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── index.html
│   └── vite.config.ts
└── README.md
```

---

## 🚀 Setup & Testing

### 1. Smart Contracts (Foundry)

Run tests (including unit, fuzz, front-running, and invariant tests):
```bash
cd contracts
forge test
```

Build contracts:
```bash
forge build
```

Deploy to BOT Testnet:
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.bohr.life \
  --account sendly \
  --password-file <path-to-password-file> \
  --broadcast
```

### 2. Frontend (Vite + React + TypeScript)

Install dependencies (if needed):
```bash
cd frontend
npm install
```

Run development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```
