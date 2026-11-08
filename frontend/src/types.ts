export interface Packet {
  id: bigint;
  sender: `0x${string}`;
  signer: `0x${string}`;
  total: bigint;
  remaining: bigint;
  slots: number;
  claimed: number;
  expiresAt: bigint;
  message: string;
  reclaimed: boolean;
}

export type PacketStatus = 'Active' | 'Fully claimed' | 'Expired' | 'Reclaimed';

export interface TxStatus {
  state: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
  hash?: `0x${string}`;
  action?: string;
}

export type AppRoute =
  | { type: 'home' }
  | { type: 'claim'; packetId: bigint; privateKey: `0x${string}` };
