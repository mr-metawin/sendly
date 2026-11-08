import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  defineChain,
  parseEventLogs,
  toBytes,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { execSync } from 'child_process';
import fs from 'fs';

const botTestnet = defineChain({
  id: 968,
  name: 'BOT Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.bohr.life'] },
  },
  blockExplorers: {
    default: { name: 'BohrScan', url: 'https://scan.bohr.life' },
  },
});

const addressData = JSON.parse(fs.readFileSync('./src/contracts/address.json', 'utf8'));
const contractAddress = addressData.address;
const contractJson = JSON.parse(fs.readFileSync('../contracts/out/Sendly.sol/Sendly.json', 'utf8'));
const sendlyAbi = contractJson.abi;

const publicClient = createPublicClient({
  chain: botTestnet,
  transport: http('https://rpc.bohr.life'),
});

// Read .env
const envContent = fs.readFileSync('./.env', 'utf8');
const lines = envContent.split('\n');
const env = {};
for (const line of lines) {
  const match = line.match(/^\s*([\w]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = match[2]?.trim();
  }
}

const password = env.PASSWORD;
const pk1 = env.WALLET_ADDRESS_1_PK;
const pk2 = env.WALLET_ADDRESS_2_PK;
const pk3 = env.WALLET_ADDRESS_3_PK;

const acc1 = privateKeyToAccount(pk1);
const acc2 = privateKeyToAccount(pk2);
const acc3 = privateKeyToAccount(pk3);

const client1 = createWalletClient({ account: acc1, chain: botTestnet, transport: http('https://rpc.bohr.life') });
const client2 = createWalletClient({ account: acc2, chain: botTestnet, transport: http('https://rpc.bohr.life') });
const client3 = createWalletClient({ account: acc3, chain: botTestnet, transport: http('https://rpc.bohr.life') });

const targets = [acc1.address, acc2.address, acc3.address];

console.log('=== Step 1: Funding 3 Wallets with 0.1 BOT each from sendly cast wallet ===');
for (const target of targets) {
  const bal = await publicClient.getBalance({ address: target });
  console.log(`Current balance of ${target}: ${bal.toString()} wei`);
  if (bal < parseEther('0.05')) {
    console.log(`Sending 0.1 BOT to ${target}...`);
    const cmd = `cast send ${target} --value 0.1ether --rpc-url https://rpc.bohr.life --account sendly --password "${password}"`;
    const out = execSync(cmd, { encoding: 'utf8' });
    console.log(`  Funded: ${out.trim().split('\n').pop()}`);
  } else {
    console.log(`Wallet ${target} already has sufficient funds.`);
  }
}

const summary = {
  contractAddress,
  chainId: 968,
  network: 'BOT Testnet',
  wallet1: { address: acc1.address, transactions: [] },
  wallet2: { address: acc2.address, transactions: [] },
  wallet3: { address: acc3.address, transactions: [] },
};

// Helper: create packet
async function createPacket(client, walletRecord, message, valueEther = '0.005') {
  const pKey = generatePrivateKey();
  const signerAcc = privateKeyToAccount(pKey);
  const signerAddress = signerAcc.address;

  console.log(`[${client.account.address}] Creating packet: "${message}" (${valueEther} BOT, 2 slots)`);
  const hash = await client.writeContract({
    address: contractAddress,
    abi: sendlyAbi,
    functionName: 'createPacket',
    args: [signerAddress, 2, 24, message],
    value: parseEther(valueEther),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const logs = parseEventLogs({ abi: sendlyAbi, eventName: 'PacketCreated', logs: receipt.logs });
  const packetId = logs[0].args.id;

  console.log(`  ✓ Packet #${packetId} created! Tx: ${hash} (Block: ${receipt.blockNumber})`);

  walletRecord.transactions.push({
    action: 'createPacket',
    packetId: packetId.toString(),
    hash,
    blockNumber: receipt.blockNumber.toString(),
    message,
    value: valueEther + ' BOT',
    explorer: `https://scan.bohr.life/tx/${hash}`,
  });

  return { packetId, privateKey: pKey };
}

// Helper: claim packet
async function claimPacket(client, walletRecord, packetId, privateKey) {
  console.log(`[${client.account.address}] Claiming packet #${packetId}`);

  const digest = await publicClient.readContract({
    address: contractAddress,
    abi: sendlyAbi,
    functionName: 'computeDigest',
    args: [packetId, client.account.address],
  });

  const signerAcc = privateKeyToAccount(privateKey);
  const signature = await signerAcc.signMessage({
    message: { raw: toBytes(digest) },
  });

  const hash = await client.writeContract({
    address: contractAddress,
    abi: sendlyAbi,
    functionName: 'claim',
    args: [packetId, signature],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const logs = parseEventLogs({ abi: sendlyAbi, eventName: 'Claimed', logs: receipt.logs });
  const amount = logs[0]?.args?.amount || 0n;

  console.log(`  ✓ Claimed packet #${packetId} (received ${amount} wei)! Tx: ${hash}`);

  walletRecord.transactions.push({
    action: 'claim',
    packetId: packetId.toString(),
    hash,
    blockNumber: receipt.blockNumber.toString(),
    amount: amount.toString(),
    explorer: `https://scan.bohr.life/tx/${hash}`,
  });
}

console.log('\n=== Step 2: Executing 8 Transactions for Each Wallet ===');

// --- ROUND 1 ---
console.log('\n--- Round 1 ---');
const p1 = await createPacket(client1, summary.wallet1, 'Sendly Gift #1 from Wallet 1'); // W1 Tx 1
const p2 = await createPacket(client2, summary.wallet2, 'Sendly Gift #1 from Wallet 2'); // W2 Tx 1
const p3 = await createPacket(client3, summary.wallet3, 'Sendly Gift #1 from Wallet 3'); // W3 Tx 1

await claimPacket(client2, summary.wallet2, p1.packetId, p1.privateKey); // W2 Tx 2
await claimPacket(client3, summary.wallet3, p1.packetId, p1.privateKey); // W3 Tx 2
await claimPacket(client1, summary.wallet1, p2.packetId, p2.privateKey); // W1 Tx 2
await claimPacket(client3, summary.wallet3, p2.packetId, p2.privateKey); // W3 Tx 3
await claimPacket(client1, summary.wallet1, p3.packetId, p3.privateKey); // W1 Tx 3
await claimPacket(client2, summary.wallet2, p3.packetId, p3.privateKey); // W2 Tx 3

// --- ROUND 2 ---
console.log('\n--- Round 2 ---');
const p4 = await createPacket(client1, summary.wallet1, 'Sendly Gift #2 from Wallet 1'); // W1 Tx 4
const p5 = await createPacket(client2, summary.wallet2, 'Sendly Gift #2 from Wallet 2'); // W2 Tx 4
const p6 = await createPacket(client3, summary.wallet3, 'Sendly Gift #2 from Wallet 3'); // W3 Tx 4

await claimPacket(client2, summary.wallet2, p4.packetId, p4.privateKey); // W2 Tx 5
await claimPacket(client3, summary.wallet3, p4.packetId, p4.privateKey); // W3 Tx 5
await claimPacket(client1, summary.wallet1, p5.packetId, p5.privateKey); // W1 Tx 5
await claimPacket(client3, summary.wallet3, p5.packetId, p5.privateKey); // W3 Tx 6
await claimPacket(client1, summary.wallet1, p6.packetId, p6.privateKey); // W1 Tx 6
await claimPacket(client2, summary.wallet2, p6.packetId, p6.privateKey); // W2 Tx 6

// --- ROUND 3 ---
console.log('\n--- Round 3 ---');
const p7 = await createPacket(client1, summary.wallet1, 'Sendly Gift #3 from Wallet 1'); // W1 Tx 7
const p8 = await createPacket(client2, summary.wallet2, 'Sendly Gift #3 from Wallet 2'); // W2 Tx 7
const p9 = await createPacket(client3, summary.wallet3, 'Sendly Gift #3 from Wallet 3'); // W3 Tx 7

await claimPacket(client2, summary.wallet2, p7.packetId, p7.privateKey); // W2 Tx 8 (Done!)
await claimPacket(client3, summary.wallet3, p7.packetId, p7.privateKey); // W3 Tx 8 (Done!)
await claimPacket(client1, summary.wallet1, p8.packetId, p8.privateKey); // W1 Tx 8 (Done!)

console.log('\n=== All 24 Transactions Completed Successfully! ===');
console.log(`Wallet 1 tx count: ${summary.wallet1.transactions.length}`);
console.log(`Wallet 2 tx count: ${summary.wallet2.transactions.length}`);
console.log(`Wallet 3 tx count: ${summary.wallet3.transactions.length}`);

fs.writeFileSync('./transactions_summary.json', JSON.stringify(summary, null, 2));
fs.writeFileSync('../transactions_summary.json', JSON.stringify(summary, null, 2));
console.log('Saved transactions_summary.json in frontend and root directories.');
