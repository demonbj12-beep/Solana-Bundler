import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import type { Launch, Wallet, FeeTransaction } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

function formatSol(n: number | null | undefined): string {
  if (n == null) return "--";
  return `${parseFloat(String(n)).toFixed(4)} SOL`;
}

function formatDate(d: string | null): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FeesPage() {
  const { toast } = useToast();
  const [pending, setPending] = useState<Launch[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [feeWallet, setFeeWallet] = useState("");
  const [history, setHistory] = useState<FeeTransaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  const [payDialog, setPayDialog] = useState(false);
  const [payingLaunch, setPayingLaunch] = useState<Launch | null>(null);
  const [payerIndex, setPayerIndex] = useState("0");
  const [payPassword, setPayPassword] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState<any>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get("/fees/pending"),
      apiClient.get("/fees/history"),
      apiClient.get("/wallets"),
    ])
      .then(([pendingRes, historyRes, walletsRes]) => {
        setPending(pendingRes.data.launches || []);
        setTotalOwed(pendingRes.data.totalOwed || 0);
        setFeeWallet(pendingRes.data.feeWallet || "");
        setHistory(historyRes.data.fees || []);
        setWallets(walletsRes.data.wallets || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePay = async () => {
    if (!payingLaunch || !payPassword) return;
    setPayLoading(true);
    try {
      const res = await apiClient.post(`/fees/pay/${payingLaunch.id}`, {
        password: payPassword,
        payerWalletIndex: parseInt(payerIndex),
      });
      setPayResult(res.data);
      toast({ title: "Fee Paid!", description: `${formatSol(res.data.amountPaid)} sent` });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Payment Failed",
        description: err.response?.data?.error || "Check password and wallet balance",
        variant: "destructive",
      });
    } finally {
      setPayLoading(false);
    }
  };

  const closePay = () => {
    setPayDialog(false);
    setPayingLaunch(null);
    setPayPassword("");
    setPayResult(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          Fee Management
        </p>
        <h1 className="text-2xl font-bold">Platform Fees</h1>
        <p className="text-sm text-muted-foreground mt-1">
          5% fee on each successful launch
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Total Owed
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className={`font-mono text-xl font-bold ${totalOwed > 0 ? "text-destructive" : ""}`} data-testid="text-total-owed">
                {formatSol(totalOwed)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Payments Made
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="font-mono text-xl font-bold" data-testid="text-payments-count">
                {history.length}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Pending
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="font-mono text-xl font-bold" data-testid="text-pending-count">
                {pending.length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider mb-3 text-destructive">
            Outstanding Fees ({pending.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pending.map((launch) => (
              <Card key={launch.id} className="border-destructive/20" data-testid={`pending-fee-${launch.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold">
                          {launch.token_name} ({launch.token_symbol})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {launch.launchpad}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatDate(launch.created_at)}
                        </span>
                      </div>
                      <div className="mt-2 font-mono text-lg font-bold text-destructive">
                        {formatSol(launch.fee_sol)}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="font-mono text-xs"
                      onClick={() => {
                        setPayingLaunch(launch);
                        setPayDialog(true);
                      }}
                      data-testid={`button-pay-${launch.id}`}
                    >
                      Pay {formatSol(launch.fee_sol)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-mono text-xs font-bold uppercase tracking-wider mb-3">
          Payment History
        </h2>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-mono text-sm text-muted-foreground">No payments yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((fee) => (
              <div
                key={fee.id}
                className="flex items-center justify-between rounded-md bg-muted/30 p-3 flex-wrap gap-2"
                data-testid={`fee-history-${fee.id}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-xs font-bold">
                      {formatSol(fee.amount_sol)}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatDate(fee.created_at)}
                  </span>
                </div>
                {fee.tx_signature && (
                  <a
                    href={`https://solscan.io/tx/${fee.tx_signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-primary"
                  >
                    {fee.tx_signature.slice(0, 8)}... <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={payDialog} onOpenChange={(open) => { if (!open) closePay(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">Pay Platform Fee</DialogTitle>
          </DialogHeader>

          {payResult ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle className="h-12 w-12 text-primary" />
              <h3 className="font-mono text-sm font-bold">Fee Paid!</h3>
              <p className="font-mono text-xs text-muted-foreground">
                Amount: {formatSol(payResult.amountPaid)}
              </p>
              {payResult.signature && (
                <a
                  href={`https://solscan.io/tx/${payResult.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-primary break-all"
                >
                  {payResult.signature}
                </a>
              )}
              <Button variant="secondary" onClick={closePay} className="w-full font-mono text-xs">
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {payingLaunch && (
                <div className="rounded-md bg-muted/30 p-3">
                  <p className="font-mono text-xs font-bold">
                    {payingLaunch.token_name} ({payingLaunch.token_symbol})
                  </p>
                  <p className="font-mono text-lg font-bold text-destructive mt-1">
                    {formatSol(payingLaunch.fee_sol)}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Pay From Wallet
                </Label>
                <Select value={payerIndex} onValueChange={setPayerIndex}>
                  <SelectTrigger className="font-mono text-xs" data-testid="select-payer-wallet">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem key={w.wallet_index} value={String(w.wallet_index)} className="font-mono text-xs">
                        W{w.wallet_index + 1} - {formatSol(w.sol_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Confirm Password
                </Label>
                <Input
                  type="password"
                  value={payPassword}
                  onChange={(e) => setPayPassword(e.target.value)}
                  placeholder="Enter password"
                  className="font-mono text-sm"
                  data-testid="input-pay-password"
                />
              </div>

              <Button
                variant="destructive"
                className="w-full font-mono text-xs"
                disabled={!payPassword || payLoading}
                onClick={handlePay}
                data-testid="button-confirm-pay"
              >
                {payLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  "Confirm Payment"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
