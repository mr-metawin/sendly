import fs from 'fs';

const logoBase64 = fs.readFileSync('frontend/sendly.jpeg').toString('base64');
const logoDataUri = `data:image/jpeg;base64,${logoBase64}`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sendly Pitch Deck - Send BOT with a link.</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');

    @page {
      size: 1920px 1080px;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      background-color: #0b0305;
      color: #fff1f2;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .slide {
      width: 1920px;
      height: 1080px;
      page-break-after: always;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 70px 90px;
      background-color: #0d0406;
      background-image: radial-gradient(circle at 85% 15%, rgba(225, 29, 72, 0.25) 0%, rgba(13, 4, 6, 1) 70%),
                        radial-gradient(circle at 15% 85%, rgba(251, 191, 36, 0.12) 0%, rgba(13, 4, 6, 1) 70%);
      overflow: hidden;
    }

    /* Header & Footer */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .slide-tag {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px;
      background: rgba(225, 29, 72, 0.22);
      border: 1px solid rgba(251, 191, 36, 0.5);
      border-radius: 30px;
      font-size: 15px;
      font-weight: 700;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .slide-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      color: #fda4af;
      font-weight: 700;
    }

    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(251, 191, 36, 0.25);
      padding-top: 24px;
      font-size: 16px;
      color: #fda4af;
      font-weight: 500;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      color: #fff1f2;
    }

    .footer-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
    }

    /* Typography */
    h1 {
      font-size: 60px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -1.5px;
      color: #ffffff;
      margin-bottom: 14px;
    }

    .subtitle {
      font-size: 24px;
      color: #fda4af;
      font-weight: 500;
      line-height: 1.4;
      max-width: 1400px;
      margin-bottom: 30px;
    }

    /* Grids & Cards */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      flex: 1;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      flex: 1;
    }

    .card {
      background: rgba(30, 10, 14, 0.85);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 20px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }

    .card h3 {
      font-size: 24px;
      font-weight: 700;
      color: #fbbf24;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .card p {
      font-size: 18px;
      color: #ffe4e6;
      line-height: 1.55;
      font-weight: 400;
    }

    .card-highlight {
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.25) 0%, rgba(251, 191, 36, 0.15) 100%);
      border: 1.5px solid #fbbf24;
    }

    /* Metrics & Stats */
    .metric-row {
      display: flex;
      gap: 30px;
      margin-top: 15px;
    }

    .metric-box {
      flex: 1;
      background: rgba(225, 29, 72, 0.18);
      border: 1px solid rgba(251, 191, 36, 0.35);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
    }

    .metric-val {
      font-size: 44px;
      font-weight: 900;
      color: #fbbf24;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 6px;
    }

    .metric-label {
      font-size: 15px;
      color: #fda4af;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    /* Diagram Styles */
    .flow-container {
      background: rgba(18, 6, 8, 0.9);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 20px;
      padding: 30px 40px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      font-family: 'JetBrains Mono', monospace;
    }

    .flow-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .flow-node {
      background: rgba(225, 29, 72, 0.25);
      border: 1.5px solid #fbbf24;
      border-radius: 12px;
      padding: 16px 24px;
      text-align: center;
      color: #fff1f2;
      font-size: 18px;
      font-weight: 700;
      flex: 1;
    }

    .flow-arrow {
      font-size: 26px;
      color: #fbbf24;
      font-weight: 900;
    }

    /* Code block */
    .code-box {
      background: #080204;
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 16px;
      padding: 24px 30px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 17px;
      color: #a7f3d0;
      line-height: 1.6;
    }

    /* Cover / Final slide specific with high contrast center card */
    .hero-center-box {
      background: rgba(18, 5, 8, 0.88);
      border: 2px solid rgba(251, 191, 36, 0.45);
      border-radius: 28px;
      padding: 50px 70px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(225, 29, 72, 0.25);
      max-width: 1300px;
      margin: auto;
    }

    .cover-logo {
      width: 120px;
      height: 120px;
      border-radius: 24px;
      box-shadow: 0 0 35px rgba(225, 29, 72, 0.6), 0 0 20px rgba(251, 191, 36, 0.4);
      margin-bottom: 24px;
      border: 2px solid #fbbf24;
    }

    /* High contrast solid headers without Skia-breaking clipping */
    .solid-title {
      font-size: 88px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #ffffff;
      text-shadow: 0 4px 20px rgba(0, 0, 0, 0.9), 0 0 40px rgba(251, 191, 36, 0.4);
      margin-bottom: 14px;
      line-height: 1.1;
    }

    .solid-tagline {
      font-size: 36px;
      font-weight: 700;
      color: #fbbf24;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
    }

    .solid-desc {
      font-size: 22px;
      color: #ffe4e6;
      max-width: 950px;
      line-height: 1.5;
      margin: 0 auto 35px;
    }

    .cover-meta {
      display: flex;
      gap: 24px;
      justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      color: #fca5a5;
    }

    .cover-meta-item {
      background: rgba(225, 29, 72, 0.25);
      border: 1px solid rgba(251, 191, 36, 0.4);
      padding: 10px 22px;
      border-radius: 30px;
      color: #fef08a;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: COVER -->
  <div class="slide" style="justify-content: space-between;">
    <div class="slide-header">
      <div class="slide-tag">🧧 Web3 Gifting Protocol</div>
      <div class="slide-num">01 / 09</div>
    </div>

    <div class="hero-center-box">
      <img src="${logoDataUri}" alt="Sendly Logo" class="cover-logo">
      <h1 class="solid-title">SENDLY</h1>
      <div class="solid-tagline">"Send BOT with a link."</div>
      <p class="solid-desc">
        The serverless, peer-to-peer crypto gifting protocol for the BOT blockchain ecosystem.<br>
        Zero custodial risk. Zero mempool front-running. Zero backend dependencies.
      </p>
      <div class="cover-meta">
        <div class="cover-meta-item">Network: BOT Testnet (Chain ID 968)</div>
        <div class="cover-meta-item">Solidity ^0.8.24 + OpenZeppelin 5.x</div>
        <div class="cover-meta-item">November 2026</div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly — Pitch Deck</div>
      <div>https://scan.bohr.life</div>
    </div>
  </div>

  <!-- SLIDE 2: THE PROBLEM -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-tag">The Problem</div>
      <div class="slide-num">02 / 09</div>
    </div>
    <div>
      <h1>The Friction of Crypto Gifting & Onboarding</h1>
      <p class="subtitle">Traditional Web3 transfers require advance wallet knowledge, shutting down spontaneous social gifting and newcomer onboarding.</p>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3><span>🛑</span> The Address Prerequisite Barrier</h3>
        <p>You cannot send crypto to friends or newcomers without first asking for their public wallet address. This destroys surprise gifts, holiday red envelopes, community rewards, and viral peer-to-peer acquisition.</p>
      </div>
      <div class="card">
        <h3><span>🏦</span> Custodial Red Packet Vulnerabilities</h3>
        <p>Existing tipping bots on Telegram or Discord rely on centralized servers holding custody of private keys and funds. They are prone to server downtime, database leaks, platform bans, and rug pulls.</p>
      </div>
      <div class="card">
        <h3><span>🤖</span> Mempool Front-Running & Link Theft</h3>
        <p>Naive claim links that embed raw private keys or pre-signed transactions are instantly intercepted by automated MEV bots scanning the public mempool, stealing the funds before the recipient can claim.</p>
      </div>
      <div class="card">
        <h3><span>🔒</span> Trapped Funds & Dust Fragmentation</h3>
        <p>Most existing contracts leave fractional dust stranded due to division remainders, or permanently trap funds when a recipient fails to claim their gift within an active window.</p>
      </div>
    </div>
    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly — Pitch Deck</div>
      <div>BOT Testnet (Chain ID 968)</div>
    </div>
  </div>

  <!-- SLIDE 3: THE SOLUTION -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-tag">The Solution</div>
      <div class="slide-num">03 / 09</div>
    </div>
    <div>
      <h1>Sendly: Trustless Gifting with Pure Client Cryptography</h1>
      <p class="subtitle">Lock BOT on-chain, share a link, and let recipients claim instantly with mathematical front-running immunity.</p>
    </div>
    <div class="grid-3">
      <div class="card card-highlight">
        <h3><span>🔗</span> Share Via Any Social Link</h3>
        <p>Send gifts over Telegram, WhatsApp, Discord, X, or email as a simple URL fragment. Recipients open the link directly on mobile or desktop without pre-registering an address.</p>
      </div>
      <div class="card card-highlight">
        <h3><span>🛡️</span> Zero-Leak Ephemeral Keys</h3>
        <p>The ephemeral private key exists strictly in the browser URL fragment (<code>#/claim/...</code>), which HTTP standards guarantee is never transmitted to any web server. Zero backend, zero database.</p>
      </div>
      <div class="card card-highlight">
        <h3><span>⚡</span> EIP-191 Front-Running Proof</h3>
        <p>The claimer signs <code>computeDigest(packetId, msg.sender)</code> locally. Because the digest binds to the recipient's address, copied signatures are mathematically useless to MEV bots.</p>
      </div>
      <div class="card">
        <h3><span>✨</span> 100% Dust-Free Conservation</h3>
        <p>Each slot receives an equal share, with any division remainder dust automatically granted to the final claimer. Payouts always add up perfectly to 100% of the locked BOT.</p>
      </div>
      <div class="card">
        <h3><span>⏳</span> Trustless Expiry & Reclaim</h3>
        <p>If slots go unclaimed after the expiration timer (1 to 720 hours), the original sender can reclaim every remaining wei with a single click. Funds are never lost or stranded.</p>
      </div>
      <div class="card">
        <h3><span>🤝</span> 1 to 100 Multi-Claim Slots</h3>
        <p>Send individual gifts or split packets across groups of up to 100 people. Ideal for team rewards, AMA giveaways, gaming tournaments, and community celebrations.</p>
      </div>
    </div>
    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly — Pitch Deck</div>
      <div>BOT Testnet (Chain ID 968)</div>
    </div>
  </div>

  <!-- SLIDE 4: SYSTEM ARCHITECTURE -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-tag">Architecture</div>
      <div class="slide-num">04 / 09</div>
    </div>
    <div>
      <h1>Cryptographic Claim Flow & Smart Contract Design</h1>
      <p class="subtitle">How Sendly eliminates server reliance and enforces strict checks-effects-interactions on Solidity ^0.8.24.</p>
    </div>
    <div class="flow-container">
      <div class="flow-row">
        <div class="flow-node">
          <strong>1. Sender Browser</strong><br>
          <small>Generates random keypair (viem)</small>
        </div>
        <div class="flow-arrow">➔</div>
        <div class="flow-node">
          <strong>2. Sendly Contract</strong><br>
          <small>createPacket{value}(signer, slots, expiry)</small>
        </div>
        <div class="flow-arrow">➔</div>
        <div class="flow-node">
          <strong>3. Share Link</strong><br>
          <small>#/claim/&lt;id&gt;/&lt;privateKey&gt;</small>
        </div>
      </div>
      <div class="flow-row" style="margin: 20px 0;">
        <div style="flex: 1; text-align: center; color: #fbbf24; font-size: 16px;">
          ✦ URL Fragment (#) Never Touches Any Server ✦
        </div>
      </div>
      <div class="flow-row">
        <div class="flow-node">
          <strong>4. Recipient Browser</strong><br>
          <small>Reads key from # fragment</small>
        </div>
        <div class="flow-arrow">➔</div>
        <div class="flow-node">
          <strong>5. Local EIP-191 Sign</strong><br>
          <small>hash(chainId, contract, id, claimer)</small>
        </div>
        <div class="flow-arrow">➔</div>
        <div class="flow-node">
          <strong>6. Instant Payout</strong><br>
          <small>Contract recovers signer & transfers BOT</small>
        </div>
      </div>
    </div>
    <div class="metric-row">
      <div class="metric-box">
        <div class="metric-val">21 / 21</div>
        <div class="metric-label">Passing Foundry Tests</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">256 Runs</div>
        <div class="metric-label">Fuzz Invariant Verification</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">0% Fee</div>
        <div class="metric-label">Zero Protocol Rent-Seeking</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">100%</div>
        <div class="metric-label">Checks-Effects-Interactions</div>
      </div>
    </div>
    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly — Pitch Deck</div>
      <div>BOT Testnet (Chain ID 968)</div>
    </div>
  </div>

  <!-- SLIDE 5: LIVE TESTNET DEPLOYMENT -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-tag">Traction & Deployment</div>
      <div class="slide-num">05 / 09</div>
    </div>
    <div>
      <h1>Live on BOT Testnet: Battle-Tested & Operational</h1>
      <p class="subtitle">Fully broadcasted, deployed, and verified on the official BohrScan block explorer.</p>
    </div>
    <div class="grid-2">
      <div class="card card-highlight">
        <h3><span>📍</span> Contract Directory</h3>
        <div class="code-box" style="margin-top: 10px;">
          <strong>Contract Address:</strong><br>
          0x12cD411ff4a5E07A661973FeFCBCe215B79acb4C<br><br>
          <strong>Deployment Tx Hash:</strong><br>
          0xfe1f31bf153dd8427d93bb8d4166b614f24f5a257f9fee0e23b0be2084a25712<br><br>
          <strong>Network Parameters:</strong><br>
          Chain ID: 968 (BOT Testnet)<br>
          RPC: https://rpc.bohr.life<br>
          Explorer: https://scan.bohr.life
        </div>
      </div>
      <div class="card">
        <h3><span>⚡</span> Verified On-Chain Activity</h3>
        <p style="margin-bottom: 12px;"><strong>• 24 Confirmed Transactions:</strong> Successfully executed across 3 distinct community wallets on BOT Testnet (8 transactions each).</p>
        <p style="margin-bottom: 12px;"><strong>• 9 Gift Packets Created:</strong> Multi-slot packets (0.005 BOT each) created and funded with client-side ephemeral signers.</p>
        <p style="margin-bottom: 12px;"><strong>• 15 Real-Time Claims:</strong> Zero front-running failures, EIP-191 signatures verified on-chain, and dust-free payouts confirmed.</p>
        <p><strong>• Complete Audit Trail:</strong> All 24 transaction hashes cataloged and verified on BohrScan Blockscout explorer.</p>
      </div>
    </div>
    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly — Pitch Deck</div>
      <div>BOT Testnet (Chain ID 968)</div>
    </div>
  </div>

  <!-- SLIDE 6: PRODUCT EXPERIENCE -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-tag">User Experience</div>
      <div class="slide-num">06 / 09</div>
    </div>
    <div>
      <h1>Festive, Mobile-First dApp Interface</h1>
      <p class="subtitle">Built with Vite, React 18, TypeScript, and viem with a warm festive red-and-gold design aesthetic.</p>
    </div>
    <div class="grid-3">
      <div class="card">
        <h3><span>🧧</span> Packet Creation Studio</h3>
        <p>Intuitive form with instant one-line calculation ("N people each get about X BOT"), quick expiry buttons (1h, 24h, 7d, 30d), and optional gift messages up to 140 characters.</p>
      </div>
      <div class="card">
        <h3><span>🔑</span> LocalStorage Key Persistence</h3>
        <p>The ephemeral private key is safely preserved in browser local storage, allowing the creator to easily copy the claim link again from their "My Packets" dashboard.</p>
      </div>
      <div class="card">
        <h3><span>🎁</span> Festive Envelope Claiming</h3>
        <p>Mobile-optimized envelope UI with automatic cryptographic key validation, slot countdowns, real-time status badges, and instant celebration fireworks on claim.</p>
      </div>
      <div class="card">
        <h3><span>⏱️</span> Live Expiry Countdowns</h3>
        <p>Every active packet features real-time countdown clocks. Once expired, creators can reclaim unclaimed BOT with a single click directly from the dashboard.</p>
      </div>
      <div class="card">
        <h3><span>🌐</span> Deep Hash Routing</h3>
        <p>Pure client-side hash routing (<code>#/</code> and <code>#/claim/&lt;id&gt;/&lt;key&gt;</code>) allows instant deep-linking without server routing configuration or 404 handling.</p>
      </div>
      <div class="card">
        <h3><span>🛡️</span> Zero XSS & Strict Escaping</h3>
        <p>All user-generated messages and transaction payloads are rendered strictly as plain text nodes, completely eliminating cross-site scripting vulnerabilities.</p>
      </div>
    </div>
    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly — Pitch Deck</div>
      <div>BOT Testnet (Chain ID 968)</div>
    </div>
  </div>

  <!-- SLIDE 7: MARKET IMPACT -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-tag">Ecosystem Catalyst</div>
      <div class="slide-num">07 / 09</div>
    </div>
    <div>
      <h1>Why Sendly Accelerates the BOT Blockchain</h1>
      <p class="subtitle">Unlocking the viral "Red Envelope" growth loop for user acquisition, community engagement, and gas velocity.</p>
    </div>
    <div class="grid-2">
      <div class="card card-highlight">
        <h3><span>🚀</span> The Viral Web3 Onboarding Engine</h3>
        <p>In Web2, WeChat's digital red packet feature onboarded 100+ million users to digital payments within a single Chinese New Year. Sendly brings this exact viral growth flywheel to the BOT ecosystem natively, allowing users to invite their friends by sending them real BOT value.</p>
      </div>
      <div class="card">
        <h3><span>🎉</span> Community Drops & Event Airdrops</h3>
        <p>Community leads, influencers, and DAOs can distribute native BOT packets in live Telegram groups, Discord stages, podcasts, or in-person conferences with verifiable fair distribution and zero bot front-running.</p>
      </div>
      <div class="card">
        <h3><span>📈</span> Organic Gas Velocity & Active Wallets</h3>
        <p>Every packet creates an on-chain cascade: one creation transaction, multiple claim transactions across distinct wallets, and potential reclaim transactions, directly driving network transactions and active address metrics.</p>
      </div>
      <div class="card">
        <h3><span>🌐</span> Native Non-Custodial Standard</h3>
        <p>Sendly establishes a high security standard on BOT Chain: zero custodial intermediaries, pure OpenZeppelin cryptographic verification, and complete sender custody over unclaimed funds.</p>
      </div>
    </div>
    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly — Pitch Deck</div>
      <div>BOT Testnet (Chain ID 968)</div>
    </div>
  </div>

  <!-- SLIDE 8: STRATEGIC ROADMAP -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-tag">Roadmap</div>
      <div class="slide-num">08 / 09</div>
    </div>
    <div>
      <h1>Strategic Milestones & Expansion Roadmap</h1>
      <p class="subtitle">From testnet proof-of-concept to the universal link-gifting layer for the BOT ecosystem.</p>
    </div>
    <div class="grid-3">
      <div class="card card-highlight">
        <h3><span>✅</span> Phase 1: Testnet Launch</h3>
        <p style="margin-bottom: 8px;"><strong>Status: Completed (Q4 2026)</strong></p>
        <p>• Solidity 0.8.24 + OZ 5.x contract<br>
           • 21-test Foundry suite (unit, fuzz, invariant)<br>
           • Broadcasted BOT Testnet deployment<br>
           • BohrScan explorer verification<br>
           • Responsive Vite + React 18 + viem frontend<br>
           • Client-side EIP-191 signing architecture</p>
      </div>
      <div class="card">
        <h3><span>🚀</span> Phase 2: Mainnet & Social</h3>
        <p style="margin-bottom: 8px;"><strong>Timeline: Q1 2027</strong></p>
        <p>• BOT Mainnet deployment<br>
           • Telegram Mini App & bot integration<br>
           • Printable physical QR code envelopes<br>
           • ENS / .bot domain name resolution<br>
           • Push notifications for claimed packets<br>
           • Subgraph indexing for analytics</p>
      </div>
      <div class="card">
        <h3><span>⚡</span> Phase 3: Developer SDK</h3>
        <p style="margin-bottom: 8px;"><strong>Timeline: Q2 2027</strong></p>
        <p>• Sendly Developer SDK & widget embeds<br>
           • ERC-20 token support (stablecoins & tokens)<br>
           • Password-protected & geo-fenced links<br>
           • ERC-4337 Account Abstraction paymaster<br>
           • Cross-chain link claiming bridges</p>
      </div>
    </div>
    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly — Pitch Deck</div>
      <div>BOT Testnet (Chain ID 968)</div>
    </div>
  </div>

  <!-- SLIDE 9: CONCLUSION & SUMMARY -->
  <div class="slide" style="justify-content: space-between;">
    <div class="slide-header">
      <div class="slide-tag">🧧 The Future of Gifting</div>
      <div class="slide-num">09 / 09</div>
    </div>

    <div class="hero-center-box">
      <img src="${logoDataUri}" alt="Sendly Logo" class="cover-logo" style="width: 100px; height: 100px;">
      <h1 class="solid-title" style="font-size: 76px;">SENDLY</h1>
      <div class="solid-tagline" style="font-size: 32px;">"Send BOT with a link."</div>
      <p class="solid-desc" style="max-width: 850px; margin-bottom: 25px; font-size: 20px;">
        The simplest, safest, and most viral way to onboard anyone to the BOT blockchain.<br>
        Explore the live testnet deployment and test it today!
      </p>
      <div class="cover-meta" style="flex-direction: column; gap: 12px; max-width: 800px; margin: 0 auto;">
        <div class="cover-meta-item" style="border-radius: 12px; font-size: 15px;">
          Contract: <strong>0x12cD411ff4a5E07A661973FeFCBCe215B79acb4C</strong>
        </div>
        <div class="cover-meta-item" style="border-radius: 12px; font-size: 15px;">
          Explorer: <strong>https://scan.bohr.life/address/0x12cD411ff4a5E07A661973FeFCBCe215B79acb4C</strong>
        </div>
        <div class="cover-meta-item" style="border-radius: 12px; font-size: 15px;">
          Local Dev Server: <strong>http://localhost:5175</strong>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="footer-brand"><img src="${logoDataUri}" class="footer-logo"> Sendly Protocol</div>
      <div>November 2026</div>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync('pitch_deck.html', html);
console.log('Successfully updated pitch_deck.html with solid high-contrast titles');
