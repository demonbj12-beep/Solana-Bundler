import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import type { Launch } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Rocket,
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortenAddr(a: string | null, chars = 4): string {
  if (!a) return "";
  return `${a.slice(0, chars)}...${a.slice(-chars)}`;
}

const LP_COLORS: Record<string, string> = {
  "pump.fun": "text-green-400",
  "bags.fm": "text-cyan-400",
  "bonk.fun": "text-orange-400",
};

const STATUS_CONFIG: Record<string, { icon: any; variant: "default" | "destructive" | "secondary" }> = {
  success: { icon: CheckCircle, variant: "default" },
  failed: { icon: XCircle, variant: "destructive" },
  pending: { icon: Clock, variant: "secondary" },
};

export default function HistoryPage() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/bundler/launches")
      .then((r) => setLaunches(r.data.launches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          Launch History
        </p>
        <h1 className="text-2xl font-bold">All Launches</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {launches.length} total launches
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : launches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Rocket className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-mono text-sm text-muted-foreground mb-1">No launches yet</p>
            <p className="font-mono text-[10px] text-muted-foreground/70">
              Go to Launch & Bundle to create your first token launch
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {launches.map((launch) => {
            const sc = STATUS_CONFIG[launch.status] || STATUS_CONFIG.pending;
            const StatusIcon = sc.icon;
            return (
              <Card key={launch.id} data-testid={`history-item-${launch.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm font-bold">
                          {launch.token_name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          ({launch.token_symbol})
                        </span>
                        <Badge variant={sc.variant} className="font-mono text-[9px]">
                          <StatusIcon className="mr-1 h-2.5 w-2.5" />
                          {launch.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`font-mono text-[10px] font-bold ${LP_COLORS[launch.launchpad] || ""}`}>
                          {launch.launchpad}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatDate(launch.created_at)}
                        </span>
                        {launch.token_mint && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Mint: {shortenAddr(launch.token_mint)}
                          </span>
                        )}
                      </div>

                      {launch.error_msg && (
                        <p className="mt-2 font-mono text-[10px] text-destructive">
                          {launch.error_msg}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="font-mono text-sm font-bold">
                        {formatSol(launch.bundle_sol_total + launch.initial_sol_spent)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {launch.wallet_count} wallets
                        </span>
                        {launch.fee_paid ? (
                          <Badge variant="default" className="font-mono text-[8px]">Fee Paid</Badge>
                        ) : launch.fee_sol > 0 ? (
                          <Badge variant="destructive" className="font-mono text-[8px]">
                            Fee: {formatSol(launch.fee_sol)}
                          </Badge>
                        ) : null}
                      </div>
                      {launch.token_url && (
                        <a
                          href={launch.token_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-primary"
                        >
                          View <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
