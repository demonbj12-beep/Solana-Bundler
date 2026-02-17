import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import type { DashboardStats, Launch } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Rocket,
  Wallet,
  DollarSign,
  TrendingUp,
  ExternalLink,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

const LP_COLORS: Record<string, string> = {
  "pump.fun": "text-green-400",
  "bags.fm": "text-cyan-400",
  "bonk.fun": "text-orange-400",
};

function formatSol(n: number | null | undefined): string {
  if (n == null) return "--";
  return `${parseFloat(String(n)).toFixed(4)} SOL`;
}

function formatDate(d: string | null): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shortenAddr(a: string | null, chars = 4): string {
  if (!a) return "";
  return `${a.slice(0, chars)}...${a.slice(-chars)}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="font-mono text-xl font-bold" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </div>
        )}
        {sub && (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          Welcome back
        </p>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
          {user?.email?.split("@")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your Solana token launches and bundled buys
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Rocket}
          label="Total Launches"
          value={loading ? "--" : String(stats?.totalLaunches || 0)}
          sub={`${stats?.successfulLaunches || 0} successful`}
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="SOL Spent"
          value={loading ? "--" : formatSol(stats?.totalSolSpent)}
          sub="across all launches"
          loading={loading}
        />
        <StatCard
          icon={DollarSign}
          label="Fees Paid"
          value={loading ? "--" : formatSol(stats?.totalFeesPaid)}
          sub="5% of bundle spend"
          loading={loading}
        />
        <StatCard
          icon={Wallet}
          label="Unpaid Fees"
          value={loading ? "--" : formatSol(stats?.feesUnpaid)}
          sub={stats?.feesUnpaid ? "action required" : "all clear"}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              Recent Launches
            </span>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="font-mono text-xs gap-1" data-testid="link-view-all-history">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !stats?.recentLaunches?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Rocket className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="font-mono text-sm text-muted-foreground">
                  No launches yet
                </p>
                <Link href="/launch">
                  <Button size="sm" className="mt-3 font-mono text-xs gap-1" data-testid="button-first-launch">
                    <Rocket className="h-3.5 w-3.5" /> Start your first launch
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.recentLaunches.slice(0, 5).map((launch: Launch) => (
                  <div
                    key={launch.id}
                    className="flex items-center gap-3 rounded-md bg-muted/30 p-3"
                    data-testid={`launch-item-${launch.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold truncate">
                          {launch.token_name}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ({launch.token_symbol})
                        </span>
                        <Badge
                          variant={launch.status === "success" ? "default" : launch.status === "failed" ? "destructive" : "secondary"}
                          className="font-mono text-[9px]"
                        >
                          {launch.status === "success" ? (
                            <CheckCircle className="mr-1 h-2.5 w-2.5" />
                          ) : launch.status === "failed" ? (
                            <XCircle className="mr-1 h-2.5 w-2.5" />
                          ) : (
                            <Clock className="mr-1 h-2.5 w-2.5" />
                          )}
                          {launch.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`font-mono text-[10px] font-bold ${LP_COLORS[launch.launchpad] || "text-muted-foreground"}`}>
                          {launch.launchpad}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatDate(launch.created_at)}
                        </span>
                        {launch.token_mint && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {shortenAddr(launch.token_mint)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-bold">
                        {formatSol(launch.bundle_sol_total + launch.initial_sol_spent)}
                      </p>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider mb-2">
                Launch Token
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Bundle buy on pump.fun, bags.fm, or bonk.fun with up to 12 wallets simultaneously.
              </p>
              <Link href="/launch">
                <Button className="w-full font-mono text-xs gap-2" data-testid="button-start-launch">
                  <Rocket className="h-3.5 w-3.5" /> Start Launch
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Supported Launchpads
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { name: "pump.fun", desc: "The original meme coin launchpad", color: "bg-green-500", url: "https://pump.fun" },
                  { name: "bags.fm", desc: "Fee-share token launches", color: "bg-cyan-500", url: "https://bags.fm" },
                  { name: "bonk.fun", desc: "BONK ecosystem launchpad", color: "bg-orange-500", url: "https://bonk.fun" },
                ].map((lp) => (
                  <a
                    key={lp.name}
                    href={lp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md p-2 hover-elevate"
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${lp.color}`} />
                    <div className="flex-1">
                      <span className="font-mono text-xs font-bold">{lp.name}</span>
                      <p className="font-mono text-[9px] text-muted-foreground">{lp.desc}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {stats && stats.feesUnpaid > 0 && (
            <Card className="border-destructive/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-destructive" />
                  <span className="font-mono text-xs font-bold text-destructive">
                    Unpaid Fees
                  </span>
                </div>
                <p className="font-mono text-lg font-bold mb-3">
                  {formatSol(stats.feesUnpaid)}
                </p>
                <Link href="/fees">
                  <Button variant="destructive" size="sm" className="w-full font-mono text-xs gap-1" data-testid="button-pay-fees">
                    Pay Fees <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
