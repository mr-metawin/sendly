import { formatEther } from 'viem';

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBOT(amountWei: bigint): string {
  const str = formatEther(amountWei);
  const num = parseFloat(str);
  if (num === 0) return '0 BOT';
  if (num < 0.0001) return '<0.0001 BOT';
  return `${num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })} BOT`;
}

export function formatBOTAmount(amountWei: bigint): string {
  const str = formatEther(amountWei);
  const num = parseFloat(str);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export function formatExpiryCountdown(expiresAtSec: bigint | number): { text: string; isExpired: boolean } {
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof expiresAtSec === 'bigint' ? Number(expiresAtSec) : expiresAtSec;
  const diff = exp - now;

  if (diff <= 0) {
    return { text: 'Expired', isExpired: true };
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (days > 0) {
    return { text: `${days}d ${hours}h left`, isExpired: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m left`, isExpired: false };
  }
  if (minutes > 0) {
    return { text: `${minutes}m ${seconds}s left`, isExpired: false };
  }
  return { text: `${seconds}s left`, isExpired: false };
}

export function getExplorerTxUrl(hash: string): string {
  return `https://scan.bohr.life/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `https://scan.bohr.life/address/${address}`;
}

export function getFriendlyErrorMessage(err: any): string {
  if (!err) return 'An unknown error occurred.';

  const str = String(err?.message || err?.shortMessage || err);

  if (str.includes('SenderCannotClaim')) {
    return 'You created this packet. Senders cannot claim their own gift.';
  }
  if (str.includes('AlreadyClaimed')) {
    return 'Your wallet has already claimed this packet.';
  }
  if (str.includes('PacketExpired')) {
    return 'This packet has expired and can no longer be claimed.';
  }
  if (str.includes('PacketFullyClaimed')) {
    return 'All slots for this packet have already been claimed.';
  }
  if (str.includes('PacketAlreadyReclaimed')) {
    return 'This packet has already been reclaimed by the sender.';
  }
  if (str.includes('InvalidSignature')) {
    return 'Invalid claim signature. Ensure you are using the correct claim link.';
  }
  if (str.includes('ZeroSigner')) {
    return 'Signer address cannot be zero.';
  }
  if (str.includes('InvalidSlots')) {
    return 'Number of people must be between 1 and 100.';
  }
  if (str.includes('InvalidExpiry')) {
    return 'Expiry duration must be between 1 and 720 hours.';
  }
  if (str.includes('ZeroValue')) {
    return 'Total BOT gift amount must be greater than 0.';
  }
  if (str.includes('InsufficientValue')) {
    return 'Total BOT must be at least equal to the number of slots (in wei).';
  }
  if (str.includes('MessageTooLong')) {
    return 'Message must be at most 140 characters.';
  }
  if (str.includes('NothingToReclaim')) {
    return 'There are no remaining funds left in this packet to reclaim.';
  }
  if (str.includes('PacketNotExpired')) {
    return 'Packet has not expired yet. Funds can only be reclaimed after expiration.';
  }
  if (str.includes('NotSender')) {
    return 'Only the original creator can reclaim unclaimed funds.';
  }
  if (str.includes('User rejected') || str.includes('User denied') || str.includes('4001')) {
    return 'Transaction was cancelled in your wallet.';
  }

  return err?.shortMessage || err?.message || 'Transaction failed. Please try again.';
}
