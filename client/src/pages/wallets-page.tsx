import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import type { Wallet } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Copy,
  Key,
  Download,
  Eye,
  EyeOff,
  Wallet as WalletIcon,
  CheckCircle,
} from "lucide-react";

function formatSol(n: number | null | undefined): string {
  if (n == null) return "0.0000";
  return parseFloat(String(n)).toFixed(4);
}

function shortenAddr(a: string, chars = 6): string {
  return `${a.slice(0, chars)}...${a.slice(-chars)}`;
}

export default function WalletsPage() {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [totalSol, setTotalSol] = useState(0);

  const [exportDialog, setExportDialog] = useState(false);
  const [exportAll, setExportAll] = useState(false);
  const [exportWalletId, setExportWalletId] = useState<string | null>(null);
  const [exportPassword, setExportPassword] = useState("");
  const [exportResult, setExportResult] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const syncBalances = (showToast = false) => {
    setSyncing(true);
    apiClient
      .get("/wallets/balances")
      .then((r) => {
        setWallets(r.data.wallets || []);
        setTotalSol(r.data.totalSol || 0);
        if (showToast) toast({ title: "Balances synced" });
      })
      .catch(() => {
        if (showToast) toast({ title: "Sync failed", variant: "destructive" });
      })
      .finally(() => {
        setSyncing(false);
        setLoading(false);
      });
  };

  useEffect(() => {
    syncBalances(false);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: `${label} copied` });
  };

  const handleExport = async () => {
    if (!exportPassword) return;
    setExportLoading(true);
    try {
      let res;
      if (exportAll) {
        res = await apiClient.post("/wallets/export-all", { password: exportPassword });
      } else {
        res = await apiClient.post(`/wallets/${exportWalletId}/export`, { password: exportPassword });
      }
      setExportResult(res.data);
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.response?.data?.error || "Check password",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const closeExport = () => {
    setExportDialog(false);
    setExportResult(null);
    setExportPassword("");
    setShowKeys(false);
    setExportAll(false);
    setExportWalletId(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Wallet Management
          </p>
          <h1 className="text-2xl font-bold">Your Wallets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {wallets.length} wallets &middot; Total: {formatSol(totalSol)} SOL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="font-mono text-xs gap-1"
            onClick={() => syncBalances(true)}
            disabled={syncing}
            data-testid="button-sync-balances"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs gap-1"
            onClick={() => { setExportAll(true); setExportDialog(true); }}
            data-testid="button-export-all"
          >
            <Download className="h-3 w-3" /> Export All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))
          : wallets.map((w) => (
              <Card key={w.id} data-testid={`wallet-card-${w.wallet_index}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                        <WalletIcon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-mono text-xs font-bold">
                        Wallet {w.wallet_index + 1}
                      </span>
                    </div>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        w.sol_balance > 0 ? "bg-green-500" : "bg-muted-foreground/30"
                      }`}
                    />
                  </div>

                  <div className="font-mono text-lg font-bold mb-2" data-testid={`text-balance-${w.wallet_index}`}>
                    {formatSol(w.sol_balance)} SOL
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    <span className="font-mono text-[10px] text-muted-foreground truncate flex-1">
                      {shortenAddr(w.public_key)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(w.public_key, `W${w.wallet_index + 1}`)}
                      data-testid={`button-copy-${w.wallet_index}`}
                    >
                      {copied === `W${w.wallet_index + 1}` ? (
                        <CheckCircle className="h-3 w-3 text-primary" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full font-mono text-[10px] gap-1"
                    onClick={() => { setExportWalletId(w.id); setExportDialog(true); }}
                    data-testid={`button-export-${w.wallet_index}`}
                  >
                    <Key className="h-3 w-3" /> Export Key
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>

      <Dialog open={exportDialog} onOpenChange={(open) => { if (!open) closeExport(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {exportAll ? "Export All Wallets" : "Export Private Key"}
            </DialogTitle>
          </DialogHeader>

          {exportResult ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3">
                <Key className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="font-mono text-[10px] text-destructive">
                  Never share your private keys. Store them securely offline.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs gap-1"
                onClick={() => setShowKeys(!showKeys)}
              >
                {showKeys ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showKeys ? "Hide Keys" : "Show Keys"}
              </Button>

              {exportAll && exportResult.wallets ? (
                <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
                  {exportResult.wallets.map((ew: any) => (
                    <div key={ew.index} className="rounded-md bg-muted/30 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold">W{ew.index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyToClipboard(ew.privateKey, `key-${ew.index}`)}
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground break-all">
                        {showKeys ? ew.privateKey : "••••••••••••••••••••••••••••••••"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : exportResult.privateKey ? (
                <div className="rounded-md bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold">Private Key</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => copyToClipboard(exportResult.privateKey, "pk")}
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground break-all">
                    {showKeys ? exportResult.privateKey : "••••••••••••••••••••••••••••••••"}
                  </p>
                </div>
              ) : null}

              <Button variant="secondary" onClick={closeExport} className="font-mono text-xs">
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Confirm Password
                </Label>
                <Input
                  type="password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="font-mono text-sm"
                  data-testid="input-export-password"
                />
              </div>
              <Button
                className="w-full font-mono text-xs gap-1"
                disabled={!exportPassword || exportLoading}
                onClick={handleExport}
                data-testid="button-confirm-export"
              >
                {exportLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <Key className="h-3.5 w-3.5" /> Decrypt & Export
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
