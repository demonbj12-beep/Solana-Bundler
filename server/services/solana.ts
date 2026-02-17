import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, Keypair } from "@solana/web3.js";

let _connection: Connection;

export function getConnection(): Connection {
  if (!_connection) {
    const rpc = process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

    _connection = new Connection(rpc, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 90000,
    });
  }
  return _connection;
}

export async function getSolBalance(publicKey: string): Promise<number> {
  try {
    const bal = await getConnection().getBalance(new PublicKey(publicKey));
    return bal / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

export async function getMultipleBalances(publicKeys: string[]): Promise<Array<{ publicKey: string; balance: number }>> {
  const results = await Promise.allSettled(
    publicKeys.map((pk) => getConnection().getBalance(new PublicKey(pk)))
  );
  return publicKeys.map((pk, i) => ({
    publicKey: pk,
    balance: results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<number>).value / LAMPORTS_PER_SOL : 0,
  }));
}

export async function sendSol(
  fromKeypair: Keypair,
  toPublicKey: string,
  amountSol: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const conn = getConnection();
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: fromKeypair.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: new PublicKey(toPublicKey),
        lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
      })
    );

    tx.sign(fromKeypair);
    const sig = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return { success: true, signature: sig };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function isValidPublicKey(key: string): boolean {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}
