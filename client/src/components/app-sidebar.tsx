import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Rocket,
  Wallet,
  History,
  DollarSign,
  LogOut,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/launch", icon: Rocket, label: "Launch & Bundle" },
  { to: "/wallets", icon: Wallet, label: "Wallets" },
  { to: "/history", icon: History, label: "History" },
  { to: "/fees", icon: DollarSign, label: "Fees" },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" data-testid="link-logo">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-mono text-sm font-bold tracking-tight">
                BundlrX
              </span>
              <span className="ml-1 text-xs text-muted-foreground">v1.0</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-widest">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.to}>
                        <item.icon className="h-4 w-4" />
                        <span className="font-mono text-xs">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-widest">
            Launchpads
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex flex-col gap-1 px-2">
              {[
                { name: "pump.fun", color: "text-green-400" },
                { name: "bags.fm", color: "text-cyan-400" },
                { name: "bonk.fun", color: "text-orange-400" },
              ].map((lp) => (
                <div
                  key={lp.name}
                  className="flex items-center gap-2 rounded-md px-2 py-1"
                >
                  <div className={`h-1.5 w-1.5 rounded-full bg-current ${lp.color}`} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {lp.name}
                  </span>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-mono font-bold">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] truncate" data-testid="text-user-email">
              {user?.email}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {user?.walletCount || 12} wallets
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 font-mono text-xs text-muted-foreground"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
