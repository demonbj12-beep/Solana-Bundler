import crypto from "crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const TAG_LEN = 16;
const SALT_LEN = 32;
const PBKDF2_ITER = 150000;

function deriveKey(password: string, saltHex: string): Buffer {
  return crypto.pbkdf2Sync(password, Buffer.from(saltHex, "hex"), PBKDF2_ITER, KEY_LEN, "sha256");
}

export function encryptPrivateKey(privateKeyBase58: string, password: string, saltHex: string): string {
  const key = deriveKey(password, saltHex);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const enc = Buffer.concat([cipher.update(privateKeyBase58, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, tag, enc]);
  return payload.toString("base64");
}

export function decryptPrivateKey(encryptedBase64: string, password: string, saltHex: string): string {
  const key = deriveKey(password, saltHex);
  const payload = Buffer.from(encryptedBase64, "base64");

  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = payload.subarray(IV_LEN + TAG_LEN);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function generateUserWallets(count = 12): Array<{ index: number; publicKey: string; privateKey: string }> {
  return Array.from({ length: count }, (_, i) => {
    const kp = Keypair.generate();
    return {
      index: i,
      publicKey: kp.publicKey.toBase58(),
      privateKey: bs58.encode(kp.secretKey),
    };
  });
}

export function keypairFromEncrypted(encryptedPrivateKey: string, password: string, saltHex: string): Keypair {
  const privateKeyBase58 = decryptPrivateKey(encryptedPrivateKey, password, saltHex);
  return Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
}

export function generateSalt(): string {
  return crypto.randomBytes(SALT_LEN).toString("hex");
}
