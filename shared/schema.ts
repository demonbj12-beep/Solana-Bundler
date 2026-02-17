import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be 8+ characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .min(8, "Password must be 8+ characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Need uppercase, lowercase, and digit"
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export interface User {
  id: string;
  email: string;
  walletCount: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  message?: string;
}

export interface Wallet {
  id: string;
  wallet_index: number;
  public_key: string;
  label: string;
  sol_balance: number;
  last_sync: string | null;
  created_at: string;
}

export interface WalletsResponse {
  wallets: Wallet[];
  totalSol?: number;
}

export interface Launch {
  id: string;
  user_id: string;
  token_name: string;
  token_symbol: string;
  token_mint: string | null;
  launchpad: string;
  status: string;
  tx_signature: string | null;
  bundle_id: string | null;
  initial_sol_spent: number;
  bundle_sol_total: number;
  wallet_count: number;
  fee_sol: number;
  fee_paid: number;
  fee_tx: string | null;
  token_url: string | null;
  created_at: string;
  completed_at: string | null;
  error_msg: string | null;
  metadata: string | null;
}

export interface DashboardStats {
  totalLaunches: number;
  successfulLaunches: number;
  failedLaunches: number;
  pendingLaunches: number;
  totalSolSpent: number;
  totalFeesOwed: number;
  totalFeesPaid: number;
  feesUnpaid: number;
  launchpadBreakdown: Record<string, number>;
  recentLaunches: Launch[];
}

export interface BundlerConfig {
  launchpads: string[];
  maxBundleWallets: number;
  feePercentage: number;
  feeWallet: string;
  hasFeeWallet: boolean;
}

export interface EstimateResult {
  walletCount: number;
  solPerWallet: number;
  bundleTotal: number;
  devBuyAmountSol: number;
  totalSpend: number;
  estimatedFee: number;
  jitoTip: number;
  feePercentage: number;
  note: string;
}

export interface FeeTransaction {
  id: string;
  user_id: string;
  launch_id: string;
  amount_sol: number;
  fee_wallet: string;
  tx_signature: string | null;
  status: string;
  created_at: string;
}

export interface PendingFees {
  launches: Launch[];
  totalOwed: number;
  feeWallet: string;
}
