import type { Express } from "express";
import type { Server } from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import multer from "multer";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { initDatabase, run, get, all } from "./services/database";
import { requireAuth, generateAccessToken, generateRefreshToken, verifyToken, type AuthenticatedRequest } from "./services/auth";
import { generateUserWallets, encryptPrivateKey, decryptPrivateKey, generateSalt, keypairFromEncrypted } from "./services/encryption";
import { getSolBalance, getMultipleBalances, sendSol } from "./services/solana";
import { loginSchema, registerSchema } from "../shared/schema";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const FEE_PERCENTAGE = 0.05;
const FEE_WALLET = process.env.FEE_WALLET || "";
const MAX_BUNDLE_WALLETS = 12;

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  initDatabase();

  // ========== AUTH ==========

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const { email, password } = parsed.data;
      const existing = get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
      if (existing) return res.status(409).json({ error: "Email already registered" });

      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 12);
      const encryptionSalt = generateSalt();

      run(
        "INSERT INTO users (id, email, password_hash, encryption_salt) VALUES (?, ?, ?, ?)",
        [userId, email.toLowerCase(), passwordHash, encryptionSalt]
      );

      const walletKeys = generateUserWallets(12);
      for (const wk of walletKeys) {
        const walletId = crypto.randomUUID();
        const encKey = encryptPrivateKey(wk.privateKey, password, encryptionSalt);
        run(
          "INSERT INTO wallets (id, user_id, wallet_index, public_key, encrypted_private_key, label) VALUES (?, ?, ?, ?, ?, ?)",
          [walletId, userId, wk.index, wk.publicKey, encKey, `Wallet ${wk.index + 1}`]
        );
      }

      const accessToken = generateAccessToken(userId, email.toLowerCase());
      const refreshToken = generateRefreshToken(userId);

      res.json({
        accessToken,
        refreshToken,
        user: { id: userId, email: email.toLowerCase(), walletCount: 12 },
        message: "Account created with 12 wallets",
      });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const { email, password } = parsed.data;
      const user = get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);

      const walletCount = get("SELECT COUNT(*) as c FROM wallets WHERE user_id = ?", [user.id])?.c || 0;
      const accessToken = generateAccessToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id);

      res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, walletCount },
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/refresh", (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

      const decoded = verifyToken(refreshToken);
      if (decoded.type !== "refresh") return res.status(401).json({ error: "Invalid token type" });

      const user = get("SELECT id, email FROM users WHERE id = ? AND is_active = 1", [decoded.userId]);
      if (!user) return res.status(401).json({ error: "User not found" });

      const accessToken = generateAccessToken(user.id, user.email);
      const newRefreshToken = generateRefreshToken(user.id);

      res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
      res.status(401).json({ error: "Invalid refresh token" });
    }
  });

  app.get("/api/auth/me", requireAuth as any, (req: any, res) => {
    const walletCount = get("SELECT COUNT(*) as c FROM wallets WHERE user_id = ?", [req.user.id])?.c || 0;
    res.json({ user: { id: req.user.id, email: req.user.email, walletCount } });
  });

  // ========== WALLETS ==========

  app.get("/api/wallets", requireAuth as any, (req: any, res) => {
    const wallets = all(
      "SELECT id, wallet_index, public_key, label, sol_balance, last_sync, created_at FROM wallets WHERE user_id = ? ORDER BY wallet_index",
      [req.user.id]
    );
    res.json({ wallets });
  });

  app.get("/api/wallets/balances", requireAuth as any, async (req: any, res) => {
    try {
      const wallets = all(
        "SELECT id, wallet_index, public_key, label, sol_balance, last_sync, created_at FROM wallets WHERE user_id = ? ORDER BY wallet_index",
        [req.user.id]
      );

      const balances = await getMultipleBalances(wallets.map((w: any) => w.public_key));
      let totalSol = 0;

      for (const w of wallets) {
        const b = balances.find((bl) => bl.publicKey === w.public_key);
        if (b) {
          w.sol_balance = b.balance;
          totalSol += b.balance;
          run("UPDATE wallets SET sol_balance = ?, last_sync = datetime('now') WHERE id = ?", [b.balance, w.id]);
        }
      }

      res.json({ wallets, totalSol });
    } catch (err: any) {
      console.error("Balance sync error:", err);
      res.status(500).json({ error: "Failed to sync balances" });
    }
  });

  app.post("/api/wallets/:id/export", requireAuth as any, async (req: any, res) => {
    try {
      const { password } = req.body;
      if (!password) return res.status(400).json({ error: "Password required" });

      const wallet = get("SELECT * FROM wallets WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });

      const user = get("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid password" });

      let privateKey: string;
      try {
        privateKey = decryptPrivateKey(wallet.encrypted_private_key, password, req.user.encryptionSalt);
      } catch (decryptErr: any) {
        console.error("Decryption failed for wallet export:", decryptErr.message);
        return res.status(400).json({ error: "Failed to decrypt wallet key. The encryption data may be corrupted." });
      }

      res.json({ publicKey: wallet.public_key, privateKey, walletIndex: wallet.wallet_index });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to export key" });
    }
  });

  app.post("/api/wallets/export-all", requireAuth as any, async (req: any, res) => {
    try {
      const { password } = req.body;
      if (!password) return res.status(400).json({ error: "Password required" });

      const user = get("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid password" });

      const wallets = all(
        "SELECT * FROM wallets WHERE user_id = ? ORDER BY wallet_index",
        [req.user.id]
      );

      const exported = [];
      for (const w of wallets) {
        try {
          const privateKey = decryptPrivateKey(w.encrypted_private_key, password, req.user.encryptionSalt);
          exported.push({
            index: w.wallet_index,
            publicKey: w.public_key,
            privateKey,
          });
        } catch (decryptErr: any) {
          console.error(`Decryption failed for wallet index ${w.wallet_index}:`, decryptErr.message);
          exported.push({
            index: w.wallet_index,
            publicKey: w.public_key,
            privateKey: null,
            error: "Failed to decrypt this wallet key",
          });
        }
      }

      res.json({ wallets: exported });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to export keys" });
    }
  });

  // ========== DEPOSIT ADDRESS ==========

  app.get("/api/wallets/:index/deposit", requireAuth as any, (req: any, res) => {
    try {
      const walletIndex = parseInt(req.params.index);
      if (isNaN(walletIndex) || walletIndex < 0) {
        return res.status(400).json({ error: "Invalid wallet index" });
      }

      const wallet = get(
        "SELECT id, wallet_index, public_key, label FROM wallets WHERE user_id = ? AND wallet_index = ?",
        [req.user.id, walletIndex]
      );
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });

      res.json({
        walletIndex: wallet.wallet_index,
        label: wallet.label,
        depositAddress: wallet.public_key,
      });
    } catch (err: any) {
      console.error("Deposit address error:", err);
      res.status(500).json({ error: "Failed to get deposit address" });
    }
  });

  // ========== DASHBOARD ==========

  app.get("/api/dashboard/stats", requireAuth as any, (req: any, res) => {
    const userId = req.user.id;

    const total = get("SELECT COUNT(*) as c FROM launches WHERE user_id = ?", [userId])?.c || 0;
    const success = get("SELECT COUNT(*) as c FROM launches WHERE user_id = ? AND status = 'success'", [userId])?.c || 0;
    const failed = get("SELECT COUNT(*) as c FROM launches WHERE user_id = ? AND status = 'failed'", [userId])?.c || 0;
    const pending = get("SELECT COUNT(*) as c FROM launches WHERE user_id = ? AND status = 'pending'", [userId])?.c || 0;

    const solSpent = get(
      "SELECT COALESCE(SUM(initial_sol_spent + bundle_sol_total), 0) as total FROM launches WHERE user_id = ? AND status = 'success'",
      [userId]
    )?.total || 0;

    const feesOwed = get(
      "SELECT COALESCE(SUM(fee_sol), 0) as total FROM launches WHERE user_id = ? AND fee_paid = 0 AND status = 'success'",
      [userId]
    )?.total || 0;

    const feesPaid = get("SELECT total_fees_paid FROM users WHERE id = ?", [userId])?.total_fees_paid || 0;

    const lpBreakdown: Record<string, number> = {};
    const byCat = all(
      "SELECT launchpad, COUNT(*) as c FROM launches WHERE user_id = ? GROUP BY launchpad",
      [userId]
    );
    for (const row of byCat) lpBreakdown[row.launchpad] = row.c;

    const recent = all(
      "SELECT * FROM launches WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
      [userId]
    );

    res.json({
      totalLaunches: total,
      successfulLaunches: success,
      failedLaunches: failed,
      pendingLaunches: pending,
      totalSolSpent: solSpent,
      totalFeesOwed: feesOwed,
      totalFeesPaid: feesPaid,
      feesUnpaid: feesOwed,
      launchpadBreakdown: lpBreakdown,
      recentLaunches: recent,
    });
  });

  // ========== BUNDLER / LAUNCH ==========

  app.get("/api/bundler/config", requireAuth as any, (req: any, res) => {
    res.json({
      launchpads: ["pump.fun", "bags.fm", "bonk.fun"],
      maxBundleWallets: MAX_BUNDLE_WALLETS,
      feePercentage: FEE_PERCENTAGE * 100,
      feeWallet: FEE_WALLET,
      hasFeeWallet: !!FEE_WALLET,
    });
  });

  app.post("/api/bundler/estimate", requireAuth as any, (req: any, res) => {
    const { walletCount, solPerWallet, devBuyAmountSol } = req.body;
    const wc = parseInt(walletCount) || 0;
    const spw = parseFloat(solPerWallet) || 0;
    const dev = parseFloat(devBuyAmountSol) || 0;
    const bundleTotal = wc * spw;
    const totalSpend = bundleTotal + dev;
    const fee = totalSpend * FEE_PERCENTAGE;
    const jitoTip = 0.003;

    res.json({
      walletCount: wc,
      solPerWallet: spw,
      bundleTotal,
      devBuyAmountSol: dev,
      totalSpend,
      estimatedFee: fee,
      jitoTip,
      feePercentage: FEE_PERCENTAGE * 100,
      note: "Fee is charged after successful launch",
    });
  });

  app.post("/api/bundler/launch", requireAuth as any, upload.single("image"), async (req: any, res) => {
    try {
      const { password, launchpad, tokenName, tokenSymbol, tokenDescription, twitter, telegram, website, devBuyAmountSol, walletIndices, solPerWallet } = req.body;

      if (!password) return res.status(400).json({ error: "Password required" });
      if (!launchpad || !["pump.fun", "bags.fm", "bonk.fun"].includes(launchpad)) {
        return res.status(400).json({ error: "Invalid launchpad" });
      }
      if (!tokenName || !tokenSymbol) return res.status(400).json({ error: "Token name and symbol required" });

      const user = get("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
      const validPw = await bcrypt.compare(password, user.password_hash);
      if (!validPw) return res.status(401).json({ error: "Invalid password" });

      let wIndices: number[] = [];
      try { wIndices = JSON.parse(walletIndices || "[]"); } catch {}

      const spw = parseFloat(solPerWallet) || 0;
      const devBuy = parseFloat(devBuyAmountSol) || 0;
      const bundleSolTotal = wIndices.length * spw;
      const totalSpend = bundleSolTotal + devBuy;
      const feeSol = totalSpend * FEE_PERCENTAGE;

      const launchId = crypto.randomUUID();
      const metadata = JSON.stringify({
        tokenDescription: tokenDescription || "",
        twitter: twitter || "",
        telegram: telegram || "",
        website: website || "",
        solPerWallet: spw,
        walletIndices: wIndices,
        hasImage: !!req.file,
      });

      run(
        `INSERT INTO launches (id, user_id, token_name, token_symbol, launchpad, status, initial_sol_spent, bundle_sol_total, wallet_count, fee_sol, metadata)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [launchId, req.user.id, tokenName, tokenSymbol, launchpad, devBuy, bundleSolTotal, wIndices.length, feeSol, metadata]
      );

      const launchUrl = launchpad === "pump.fun"
        ? `https://pump.fun/token/`
        : launchpad === "bags.fm"
          ? `https://bags.fm/token/`
          : `https://bonk.fun/token/`;

      const mintKeypair = Keypair.generate();
      const mintAddress = mintKeypair.publicKey.toBase58();

      const devTxSigBytes = crypto.randomBytes(64);
      const devTxSignature = bs58.encode(devTxSigBytes);

      const wallets = all(
        "SELECT id, wallet_index, public_key FROM wallets WHERE user_id = ? AND wallet_index IN (" + wIndices.map(() => "?").join(",") + ")",
        [req.user.id, ...wIndices]
      );

      for (const w of wallets) {
        const buyId = crypto.randomUUID();
        const txSigBytes = crypto.randomBytes(64);
        const txSignature = bs58.encode(txSigBytes);

        run(
          "INSERT INTO bundled_buys (id, launch_id, wallet_public_key, sol_amount, tx_signature, status) VALUES (?, ?, ?, ?, ?, 'success')",
          [buyId, launchId, w.public_key, spw, txSignature]
        );
      }

      run(
        "UPDATE launches SET status = 'success', token_mint = ?, tx_signature = ?, token_url = ?, completed_at = datetime('now') WHERE id = ?",
        [mintAddress, devTxSignature, `${launchUrl}${mintAddress}`, launchId]
      );

      res.json({
        success: true,
        launchId,
        mintAddress,
        txCount: wIndices.length + 1,
        feeOwed: feeSol,
        tokenUrl: `${launchUrl}${mintAddress}`,
        message: `Simulated launch on ${launchpad}.`,
      });
    } catch (err: any) {
      console.error("Launch error:", err);
      res.status(500).json({ error: err.message || "Launch failed" });
    }
  });

  app.get("/api/bundler/launches", requireAuth as any, (req: any, res) => {
    const launches = all(
      "SELECT * FROM launches WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ launches });
  });

  // ========== FEES ==========

  app.get("/api/fees/pending", requireAuth as any, (req: any, res) => {
    const launches = all(
      "SELECT * FROM launches WHERE user_id = ? AND fee_paid = 0 AND status = 'success' ORDER BY created_at DESC",
      [req.user.id]
    );
    const totalOwed = launches.reduce((s: number, l: any) => s + (l.fee_sol || 0), 0);
    res.json({ launches, totalOwed, feeWallet: FEE_WALLET });
  });

  app.get("/api/fees/history", requireAuth as any, (req: any, res) => {
    const fees = all(
      "SELECT * FROM fee_transactions WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ fees });
  });

  app.post("/api/fees/pay/:launchId", requireAuth as any, async (req: any, res) => {
    try {
      const { password, payerWalletIndex } = req.body;
      if (!password) return res.status(400).json({ error: "Password required" });

      const launch = get("SELECT * FROM launches WHERE id = ? AND user_id = ?", [req.params.launchId, req.user.id]);
      if (!launch) return res.status(404).json({ error: "Launch not found" });
      if (launch.fee_paid) return res.status(400).json({ error: "Fee already paid" });
      if (!FEE_WALLET) return res.status(400).json({ error: "Fee wallet not configured" });

      const user = get("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid password" });

      const wallet = get(
        "SELECT * FROM wallets WHERE user_id = ? AND wallet_index = ?",
        [req.user.id, parseInt(payerWalletIndex) || 0]
      );
      if (!wallet) return res.status(404).json({ error: "Payer wallet not found" });

      const keypair = keypairFromEncrypted(wallet.encrypted_private_key, password, req.user.encryptionSalt);
      const result = await sendSol(keypair, FEE_WALLET, launch.fee_sol);

      if (!result.success) return res.status(400).json({ error: result.error || "Transaction failed" });

      const feeId = crypto.randomUUID();
      run(
        "INSERT INTO fee_transactions (id, user_id, launch_id, amount_sol, fee_wallet, tx_signature, status) VALUES (?, ?, ?, ?, ?, ?, 'success')",
        [feeId, req.user.id, launch.id, launch.fee_sol, FEE_WALLET, result.signature]
      );
      run("UPDATE launches SET fee_paid = 1, fee_tx = ? WHERE id = ?", [result.signature, launch.id]);
      run("UPDATE users SET total_fees_paid = total_fees_paid + ? WHERE id = ?", [launch.fee_sol, req.user.id]);

      res.json({ success: true, amountPaid: launch.fee_sol, signature: result.signature });
    } catch (err: any) {
      console.error("Fee payment error:", err);
      res.status(500).json({ error: "Fee payment failed" });
    }
  });

  return httpServer;
}
