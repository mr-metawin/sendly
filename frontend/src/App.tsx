import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  parseEventLogs,
  toBytes,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { contractAddress, sendlyAbi, botTestnet } from './contracts';
import { Packet, PacketStatus, TxStatus, AppRoute } from './types';
import {
  shortenAddress,
  formatBOT,
  formatExpiryCountdown,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getFriendlyErrorMessage,
} from './utils';
import './App.css';

const publicClient = createPublicClient({
  chain: botTestnet,
  transport: http('https://rpc.bohr.life'),
});

function parseHashRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) {
    return { type: 'home' };
  }
  const parts = hash.split('/');
  if (parts[0] === 'claim' && parts.length >= 3) {
    try {
      const packetId = BigInt(parts[1]);
      let rawKey = parts[2].trim();
      if (!rawKey.startsWith('0x')) {
        rawKey = '0x' + rawKey;
      }
      if (/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
        return { type: 'claim', packetId, privateKey: rawKey as `0x${string}` };
      }
    } catch {
      // Fall through to home
    }
  }
  return { type: 'home' };
}

export const App: React.FC = () => {
  // Routing
  const [route, setRoute] = useState<AppRoute>(parseHashRoute);

  // Wallet
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Packet creation form
  const [totalBot, setTotalBot] = useState<string>('0.1');
  const [slots, setSlots] = useState<number>(3);
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [message, setMessage] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // My packets list
  const [myPackets, setMyPackets] = useState<Packet[]>([]);
  const [loadingPackets, setLoadingPackets] = useState<boolean>(false);

  // Claim page state
  const [claimPacket, setClaimPacket] = useState<Packet | null>(null);
  const [loadingClaimPacket, setLoadingClaimPacket] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [hasUserClaimed, setHasUserClaimed] = useState<boolean>(false);
  const [claimedAmount, setClaimedAmount] = useState<bigint | null>(null);
  const [claiming, setClaiming] = useState<boolean>(false);

  // Active transaction status
  const [txStatus, setTxStatus] = useState<TxStatus>({ state: 'idle' });

  // Expiry countdown tick
  const [, setClock] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hash route listener
  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute());
      setTxStatus({ state: 'idle' });
      setClaimedAmount(null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Listen for account/network changes
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts && accounts[0]) {
          setAccount(accounts[0] as `0x${string}`);
        }
      })
      .catch(console.error);

    window.ethereum
      .request({ method: 'eth_chainId' })
      .then((hexId: string) => setChainId(parseInt(hexId, 16)))
      .catch(console.error);

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0] as `0x${string}`);
      } else {
        setAccount(null);
      }
    };

    const handleChainChanged = (hexId: string) => {
      setChainId(parseInt(hexId, 16));
    };

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  // Network switch
  const switchToBotTestnet = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x3c8' }], // 968 in hex
      });
      setChainId(968);
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x3c8',
                chainName: 'BOT Testnet',
                nativeCurrency: {
                  name: 'BOT',
                  symbol: 'BOT',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.bohr.life'],
                blockExplorerUrls: ['https://scan.bohr.life'],
              },
            ],
          });
          setChainId(968);
        } catch (addError) {
          console.error('Failed to add BOT Testnet:', addError);
        }
      } else {
        console.error('Failed to switch network:', switchError);
      }
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet to connect.');
      return;
    }
    try {
      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts && accounts[0]) {
        setAccount(accounts[0] as `0x${string}`);
      }
      const chainHex: string = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChain = parseInt(chainHex, 16);
      setChainId(currentChain);
      if (currentChain !== botTestnet.id) {
        await switchToBotTestnet();
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setTxStatus({
        state: 'error',
        message: getFriendlyErrorMessage(err),
      });
    }
  };

  const getAuthorizedWalletClient = async () => {
    if (!window.ethereum) {
      throw new Error('Please install a Web3 wallet.');
    }
    const accounts: string[] = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    const activeAccount = accounts[0] as `0x${string}`;
    setAccount(activeAccount);

    const currentChainHex = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChain = parseInt(currentChainHex, 16);
    setChainId(currentChain);

    if (currentChain !== botTestnet.id) {
      await switchToBotTestnet();
    }

    return createWalletClient({
      account: activeAccount,
      chain: botTestnet,
      transport: custom(window.ethereum),
    });
  };

  // Fetch my packets
  const fetchMyPackets = useCallback(async () => {
    if (!account) {
      setMyPackets([]);
      return;
    }
    setLoadingPackets(true);
    try {
      const packetIds = await publicClient.readContract({
        address: contractAddress,
        abi: sendlyAbi,
        functionName: 'getPacketIdsBySender',
        args: [account],
      });

      const list: Packet[] = [];
      // Fetch newest first
      const reversedIds = [...packetIds].reverse();
      for (const id of reversedIds) {
        const raw = await publicClient.readContract({
          address: contractAddress,
          abi: sendlyAbi,
          functionName: 'getPacket',
          args: [id],
        });
        list.push({
          id,
          sender: raw.sender as `0x${string}`,
          signer: raw.signer as `0x${string}`,
          total: raw.total,
          remaining: raw.remaining,
          slots: Number(raw.slots),
          claimed: Number(raw.claimed),
          expiresAt: raw.expiresAt,
          message: raw.message,
          reclaimed: raw.reclaimed,
        });
      }
      setMyPackets(list);
    } catch (err) {
      console.error('Failed to load my packets:', err);
    } finally {
      setLoadingPackets(false);
    }
  }, [account]);

  useEffect(() => {
    if (route.type === 'home' && account) {
      fetchMyPackets();
    }
  }, [route.type, account, fetchMyPackets]);

  // Create packet
  const handleCreatePacket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      await connectWallet();
      return;
    }

    const valueNum = parseFloat(totalBot);
    if (!valueNum || valueNum <= 0) {
      alert('Please enter a valid BOT amount.');
      return;
    }
    if (slots < 1 || slots > 100) {
      alert('Number of people must be between 1 and 100.');
      return;
    }
    if (expiryHours < 1 || expiryHours > 720) {
      alert('Expiry duration must be between 1 and 720 hours.');
      return;
    }

    setCreating(true);
    setNewShareUrl(null);
    setCopiedLink(false);
    setTxStatus({ state: 'pending', action: 'Creating gift packet...' });

    try {
      const walletClient = await getAuthorizedWalletClient();

      // Generate random private key on client
      const randomPrivateKey = generatePrivateKey();
      const signerAccount = privateKeyToAccount(randomPrivateKey);
      const signerAddress = signerAccount.address;

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: sendlyAbi,
        functionName: 'createPacket',
        args: [signerAddress, slots, expiryHours, message],
        value: parseEther(totalBot),
      });

      setTxStatus({
        state: 'pending',
        hash,
        action: 'Waiting for transaction confirmation...',
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: sendlyAbi,
        eventName: 'PacketCreated',
        logs: receipt.logs,
      });

      if (logs.length > 0) {
        const createdId = logs[0].args.id;
        // Save private key in localStorage
        const storageKey = `sendly_pk_${contractAddress.toLowerCase()}_${createdId.toString()}`;
        localStorage.setItem(storageKey, randomPrivateKey);

        const url = `${window.location.origin}${window.location.pathname}#/claim/${createdId.toString()}/${randomPrivateKey}`;
        setNewShareUrl(url);

        setTxStatus({
          state: 'success',
          hash,
          message: 'Gift packet created successfully! Share the link below.',
        });

        // Reset form & refresh list
        setMessage('');
        fetchMyPackets();
      } else {
        setTxStatus({
          state: 'success',
          hash,
          message: 'Packet created, but could not parse packet ID from logs.',
        });
      }
    } catch (err: any) {
      console.error('Error creating packet:', err);
      setTxStatus({
        state: 'error',
        message: getFriendlyErrorMessage(err),
      });
    } finally {
      setCreating(false);
    }
  };

  // Reclaim unclaimed BOT
  const handleReclaim = async (packetId: bigint) => {
    if (!account) {
      await connectWallet();
      return;
    }

    setTxStatus({ state: 'pending', action: 'Reclaiming unclaimed BOT...' });
    try {
      const walletClient = await getAuthorizedWalletClient();
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: sendlyAbi,
        functionName: 'reclaim',
        args: [packetId],
      });

      setTxStatus({
        state: 'pending',
        hash,
        action: 'Confirming reclaim on blockchain...',
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setTxStatus({
        state: 'success',
        hash,
        message: 'Unclaimed BOT has been refunded to your wallet!',
      });

      fetchMyPackets();
    } catch (err: any) {
      console.error('Reclaim error:', err);
      setTxStatus({
        state: 'error',
        message: getFriendlyErrorMessage(err),
      });
    }
  };

  // Fetch claim page packet
  const loadClaimPagePacket = useCallback(async (packetId: bigint, privateKey: `0x${string}`) => {
    setLoadingClaimPacket(true);
    setClaimError(null);
    setClaimPacket(null);
    setHasUserClaimed(false);

    try {
      // Validate private key and derive address
      let signerAcc;
      try {
        signerAcc = privateKeyToAccount(privateKey);
      } catch {
        setClaimError('This link looks invalid.');
        setLoadingClaimPacket(false);
        return;
      }

      const raw = await publicClient.readContract({
        address: contractAddress,
        abi: sendlyAbi,
        functionName: 'getPacket',
        args: [packetId],
      });

      // Compare derived signer address with packet signer
      if (signerAcc.address.toLowerCase() !== raw.signer.toLowerCase()) {
        setClaimError('This link looks invalid.');
        setLoadingClaimPacket(false);
        return;
      }

      const p: Packet = {
        id: packetId,
        sender: raw.sender as `0x${string}`,
        signer: raw.signer as `0x${string}`,
        total: raw.total,
        remaining: raw.remaining,
        slots: Number(raw.slots),
        claimed: Number(raw.claimed),
        expiresAt: raw.expiresAt,
        message: raw.message,
        reclaimed: raw.reclaimed,
      };

      setClaimPacket(p);

      // Check if current connected user has already claimed
      if (account) {
        const alreadyClaimed = await publicClient.readContract({
          address: contractAddress,
          abi: sendlyAbi,
          functionName: 'hasClaimed',
          args: [packetId, account],
        });
        setHasUserClaimed(alreadyClaimed);
      }
    } catch (err: any) {
      console.error('Failed to load packet for claiming:', err);
      setClaimError('Packet not found or invalid.');
    } finally {
      setLoadingClaimPacket(false);
    }
  }, [account]);

  useEffect(() => {
    if (route.type === 'claim') {
      loadClaimPagePacket(route.packetId, route.privateKey);
    }
  }, [route, loadClaimPagePacket]);

  // Execute claim
  const handleExecuteClaim = async () => {
    if (route.type !== 'claim' || !claimPacket) return;

    if (!account) {
      await connectWallet();
      return;
    }

    setClaiming(true);
    setTxStatus({ state: 'pending', action: 'Signing and claiming gift...' });

    try {
      const walletClient = await getAuthorizedWalletClient();

      // Sign locally using privateKey from fragment
      const digest = await publicClient.readContract({
        address: contractAddress,
        abi: sendlyAbi,
        functionName: 'computeDigest',
        args: [route.packetId, account],
      });

      const signerAcc = privateKeyToAccount(route.privateKey);
      const signature = await signerAcc.signMessage({
        message: { raw: toBytes(digest) },
      });

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: sendlyAbi,
        functionName: 'claim',
        args: [route.packetId, signature],
      });

      setTxStatus({
        state: 'pending',
        hash,
        action: 'Confirming your claim on the blockchain...',
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: sendlyAbi,
        eventName: 'Claimed',
        logs: receipt.logs,
      });

      if (logs.length > 0) {
        const received = logs[0].args.amount;
        setClaimedAmount(received);
      }

      setTxStatus({
        state: 'success',
        hash,
        message: 'Packet opened successfully!',
      });

      // Reload packet state
      loadClaimPagePacket(route.packetId, route.privateKey);
    } catch (err: any) {
      console.error('Claim error:', err);
      setTxStatus({
        state: 'error',
        message: getFriendlyErrorMessage(err),
      });
    } finally {
      setClaiming(false);
    }
  };

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Packet status calculator
  const getPacketStatus = (p: Packet): { status: PacketStatus; className: string } => {
    if (p.reclaimed) {
      return { status: 'Reclaimed', className: 'badge-reclaimed' };
    }
    if (p.claimed >= p.slots) {
      return { status: 'Fully claimed', className: 'badge-claimed' };
    }
    const { isExpired } = formatExpiryCountdown(p.expiresAt);
    if (isExpired) {
      return { status: 'Expired', className: 'badge-expired' };
    }
    return { status: 'Active', className: 'badge-active' };
  };

  // One line summary calculation
  const summaryText = useMemo(() => {
    const val = parseFloat(totalBot) || 0;
    const s = slots || 1;
    const perPerson = val / s;
    return `${s} ${s === 1 ? 'person gets' : 'people each get'} about ${perPerson.toFixed(4)} BOT.`;
  }, [totalBot, slots]);

  const isWrongChain = account && chainId !== botTestnet.id;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper" onClick={() => (window.location.hash = '')}>
          <img src="/sendly.jpeg" alt="Sendly Logo" className="brand-icon" />
          <div>
            <h1 className="brand-title">Sendly</h1>
            <p className="brand-tagline">Send BOT with a link.</p>
          </div>
        </div>

        <div className="header-actions">
          {isWrongChain && (
            <button className="btn btn-warning btn-sm" onClick={switchToBotTestnet}>
              Switch to BOT Testnet
            </button>
          )}

          {account ? (
            <div className="wallet-badge" title={account}>
              <span className="wallet-dot"></span>
              {shortenAddress(account)}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Transaction Status Banner */}
      {txStatus.state !== 'idle' && (
        <div
          className={`tx-banner ${
            txStatus.state === 'pending'
              ? 'tx-pending'
              : txStatus.state === 'success'
              ? 'tx-success'
              : 'tx-error'
          }`}
        >
          <div>
            {txStatus.state === 'pending' && '⏳ '}
            {txStatus.state === 'success' && '✨ '}
            {txStatus.state === 'error' && '⚠️ '}
            <span>{txStatus.message || txStatus.action}</span>
            {txStatus.hash && (
              <a
                href={getExplorerTxUrl(txStatus.hash)}
                target="_blank"
                rel="noreferrer"
                className="tx-link"
              >
                View on BohrScan ↗
              </a>
            )}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setTxStatus({ state: 'idle' })}
          >
            ✕
          </button>
        </div>
      )}

      {/* Router: Claim Page */}
      {route.type === 'claim' ? (
        <main className="claim-container">
          {loadingClaimPacket ? (
            <div className="card">
              <p>Loading gift packet...</p>
            </div>
          ) : claimError || !claimPacket ? (
            <div className="card">
              <div className="envelope-seal">⚠️</div>
              <h2 className="card-title" style={{ justifyContent: 'center', marginBottom: 12 }}>
                {claimError || 'This link looks invalid.'}
              </h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>
                Please verify the link or ask the sender to share the full claim URL.
              </p>
              <button className="btn btn-primary" onClick={() => (window.location.hash = '')}>
                Back to Sendly Home
              </button>
            </div>
          ) : (
            <div className="envelope-wrapper">
              <div className="envelope-seal">🎁</div>
              <div className="envelope-from">
                Gift from{' '}
                <a
                  href={getExplorerAddressUrl(claimPacket.sender)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--gold-light)' }}
                >
                  {shortenAddress(claimPacket.sender)}
                </a>
              </div>

              {claimPacket.message ? (
                <div className="envelope-message">"{claimPacket.message}"</div>
              ) : (
                <div className="envelope-message" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                  "A special gift of BOT for you!"
                </div>
              )}

              <div className="envelope-info-grid">
                <div className="envelope-info-box">
                  <div className="envelope-info-label">Slots Remaining</div>
                  <div className="envelope-info-value">
                    {claimPacket.slots - claimPacket.claimed} / {claimPacket.slots}
                  </div>
                </div>
                <div className="envelope-info-box">
                  <div className="envelope-info-label">Time Remaining</div>
                  <div className="envelope-info-value">
                    {formatExpiryCountdown(claimPacket.expiresAt).text}
                  </div>
                </div>
              </div>

              {/* Claim Celebration */}
              {claimedAmount !== null && (
                <div className="celebration-box">
                  <div style={{ fontSize: 32 }}>🎉</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                    Congratulations!
                  </div>
                  <div className="celebration-amount">{formatBOT(claimedAmount)}</div>
                  <p style={{ fontSize: 13, color: '#a7f3d0' }}>
                    Successfully transferred to your wallet!
                  </p>
                  {txStatus.hash && (
                    <p style={{ marginTop: 8 }}>
                      <a
                        href={getExplorerTxUrl(txStatus.hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="tx-link"
                      >
                        View transaction on BohrScan ↗
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Claim Action Button */}
              {claimedAmount === null && (
                <div>
                  {!account ? (
                    <button className="btn btn-gold" style={{ width: '100%', padding: '14px' }} onClick={connectWallet}>
                      Connect wallet to open
                    </button>
                  ) : (
                    (() => {
                      const isExpired = formatExpiryCountdown(claimPacket.expiresAt).isExpired;
                      const isSender = account.toLowerCase() === claimPacket.sender.toLowerCase();
                      const isFull = claimPacket.claimed >= claimPacket.slots;

                      let disabledReason: string | null = null;
                      if (isSender) {
                        disabledReason = 'You created this packet (senders cannot claim).';
                      } else if (hasUserClaimed) {
                        disabledReason = 'You have already claimed this packet.';
                      } else if (claimPacket.reclaimed) {
                        disabledReason = 'This packet has been reclaimed by the sender.';
                      } else if (isFull) {
                        disabledReason = 'All slots for this packet have been claimed.';
                      } else if (isExpired) {
                        disabledReason = 'This packet has expired.';
                      }

                      if (disabledReason) {
                        return (
                          <div style={{ marginTop: 12 }}>
                            <button className="btn btn-secondary" style={{ width: '100%', padding: '14px' }} disabled>
                              Packet Unavailable
                            </button>
                            <p style={{ color: 'var(--gold-light)', fontSize: 13, marginTop: 10 }}>
                              {disabledReason}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <button
                          className="btn btn-gold"
                          style={{ width: '100%', padding: '14px', fontSize: 16 }}
                          onClick={handleExecuteClaim}
                          disabled={claiming}
                        >
                          {claiming ? 'Opening Packet...' : '🧧 Open Packet'}
                        </button>
                      );
                    })()
                  )}
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => (window.location.hash = '')}
                >
                  Create your own gift on Sendly
                </button>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* Home Route */
        <main>
          {/* Create Packet Form */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span>🧧</span> Create a Gift Packet
              </h2>
              <span className="gold-text" style={{ fontSize: 13, fontWeight: 600 }}>
                BOT Testnet
              </span>
            </div>

            <form onSubmit={handleCreatePacket}>
              <div className="form-group">
                <label className="form-label">Total BOT to Send</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0000000000000001"
                  className="form-input"
                  placeholder="e.g. 1.0"
                  value={totalBot}
                  onChange={(e) => setTotalBot(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Number of People (1 - 100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-input"
                  value={slots}
                  onChange={(e) => setSlots(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Packet Expiry</label>
                <div className="expiry-presets">
                  <button
                    type="button"
                    className={`preset-btn ${expiryHours === 1 ? 'active' : ''}`}
                    onClick={() => setExpiryHours(1)}
                  >
                    1 Hour
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${expiryHours === 24 ? 'active' : ''}`}
                    onClick={() => setExpiryHours(24)}
                  >
                    24 Hours
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${expiryHours === 168 ? 'active' : ''}`}
                    onClick={() => setExpiryHours(168)}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${expiryHours === 720 ? 'active' : ''}`}
                    onClick={() => setExpiryHours(720)}
                  >
                    30 Days
                  </button>
                </div>
              </div>

              <div className="form-group">
                <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gift Message (optional)</span>
                  <span style={{ color: 'var(--text-dim)', textTransform: 'none' }}>
                    {message.length} / 140
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  maxLength={140}
                  placeholder="e.g. Best wishes for the New Year!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {/* Dynamic One-Line Summary */}
              <div className="summary-banner">
                ✨ {summaryText}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: 16 }}
                disabled={creating}
              >
                {creating ? 'Creating Packet...' : 'Create Packet'}
              </button>
            </form>
          </div>

          {/* New Share Box */}
          {newShareUrl && (
            <div className="share-box">
              <div className="share-title">
                <span>🎁</span> Your Packet is Ready to Share!
              </div>
              <div className="share-link-row">
                <input type="text" readOnly className="share-input" value={newShareUrl} />
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => copyToClipboard(newShareUrl)}
                >
                  {copiedLink ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
              <div className="share-warning">
                ⚠️ <strong>Security Notice:</strong> Anyone with this link can claim. Share it only with people you want to receive it. The key is in the link fragment and never stored on a server.
              </div>
            </div>
          )}

          {/* My Packets List */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span>📜</span> My Packets
              </h2>
              {account && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={fetchMyPackets}
                  disabled={loadingPackets}
                >
                  {loadingPackets ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
            </div>

            {!account ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)' }}>
                <p>Connect your wallet to see the gift packets you created.</p>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={connectWallet}>
                  Connect Wallet
                </button>
              </div>
            ) : loadingPackets ? (
              <p style={{ textAlign: 'center', padding: 20 }}>Loading your packets...</p>
            ) : myPackets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)' }}>
                <p>You haven't created any gift packets yet.</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Create one above to send BOT with a link!</p>
              </div>
            ) : (
              <div className="packets-grid">
                {myPackets.map((p) => {
                  const statusInfo = getPacketStatus(p);
                  const countdown = formatExpiryCountdown(p.expiresAt);
                  const pct = Math.min(100, Math.round((p.claimed / p.slots) * 100));

                  const storageKey = `sendly_pk_${contractAddress.toLowerCase()}_${p.id.toString()}`;
                  const savedPrivateKey = localStorage.getItem(storageKey);
                  const shareLink = savedPrivateKey
                    ? `${window.location.origin}${window.location.pathname}#/claim/${p.id.toString()}/${savedPrivateKey}`
                    : null;

                  const canReclaim = countdown.isExpired && p.remaining > 0n && !p.reclaimed;

                  return (
                    <div key={p.id.toString()} className="packet-card">
                      <div>
                        <div className="packet-top">
                          <span className="packet-id">Packet #{p.id.toString()}</span>
                          <span className={`packet-badge ${statusInfo.className}`}>
                            {statusInfo.status}
                          </span>
                        </div>

                        <div className="packet-message">
                          {p.message ? `"${p.message}"` : <em>(No message)</em>}
                        </div>

                        <div className="packet-stats">
                          <div className="stat-row">
                            <span className="stat-label">Total Amount:</span>
                            <span className="stat-val">{formatBOT(p.total)}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Remaining:</span>
                            <span className="stat-val">{formatBOT(p.remaining)}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Claimed Slots:</span>
                            <span className="stat-val">
                              {p.claimed} / {p.slots}
                            </span>
                          </div>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                          <div className="stat-row" style={{ marginTop: 6 }}>
                            <span className="stat-label">Time:</span>
                            <span className="stat-val">{countdown.text}</span>
                          </div>
                        </div>
                      </div>

                      <div className="packet-actions">
                        {shareLink && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => copyToClipboard(shareLink)}
                          >
                            Copy Link
                          </button>
                        )}
                        {canReclaim && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => handleReclaim(p.id)}
                          >
                            Reclaim
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
};
