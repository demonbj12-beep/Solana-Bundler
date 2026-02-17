import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff, ArrowRight, Shield, Wallet, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, register, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      const result = await login(email, password);
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error || "Login failed");
      }
    } else {
      const result = await register(email, password);
      if (result.success) {
        toast({
          title: "Account Created",
          description: result.message || "12 wallets generated. Keep your password safe!",
        });
        navigate("/dashboard");
      } else {
        setError(result.error || "Registration failed");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-mono text-2xl font-bold tracking-tight" data-testid="text-brand">
              BundlrX
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Solana Token Bundler
            </p>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center gap-1 pb-4">
              <Button
                variant={mode === "login" ? "default" : "ghost"}
                size="sm"
                className="flex-1 font-mono text-xs"
                onClick={() => { setMode("login"); setError(""); }}
                data-testid="button-login-tab"
              >
                Sign In
              </Button>
              <Button
                variant={mode === "register" ? "default" : "ghost"}
                size="sm"
                className="flex-1 font-mono text-xs"
                onClick={() => { setMode("register"); setError(""); }}
                data-testid="button-register-tab"
              >
                Create Account
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono text-sm"
                    required
                    data-testid="input-email"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={mode === "register" ? "Min 8 chars, upper+lower+digit" : "Enter password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 font-mono text-sm"
                      required
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-mono" data-testid="text-auth-error">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full font-mono text-sm gap-2"
                  disabled={loading || !email || !password}
                  data-testid="button-submit-auth"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      {mode === "login" ? "Sign In" : "Create Account"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {mode === "register" && (
                <div className="mt-4 rounded-md bg-muted/50 p-3">
                  <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                    Registration auto-generates 12 Solana wallets encrypted with your password. Your password is the only way to export private keys.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: Shield, label: "AES-256", desc: "Encrypted keys" },
              { icon: Wallet, label: "12 Wallets", desc: "Auto-generated" },
              { icon: Lock, label: "Jito MEV", desc: "Bundle protection" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1 rounded-md p-3 text-center">
                <f.icon className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] font-bold">{f.label}</span>
                <span className="font-mono text-[9px] text-muted-foreground">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden w-1/2 items-center justify-center bg-muted/30 lg:flex">
        <div className="max-w-sm px-8">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-3 text-xl font-bold">Atomic Bundle Launches</h2>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Launch tokens on pump.fun, bags.fm, and bonk.fun with multi-wallet bundle buys via Jito. All transactions execute atomically with MEV protection.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { name: "pump.fun", desc: "Largest meme coin launchpad", color: "bg-green-500" },
              { name: "bags.fm", desc: "Fee-share token launches", color: "bg-cyan-500" },
              { name: "bonk.fun", desc: "BONK ecosystem launchpad", color: "bg-orange-500" },
            ].map((lp) => (
              <div key={lp.name} className="flex items-center gap-3 rounded-md bg-background/50 p-3">
                <div className={`h-2 w-2 rounded-full ${lp.color}`} />
                <div>
                  <span className="font-mono text-xs font-bold">{lp.name}</span>
                  <p className="font-mono text-[10px] text-muted-foreground">{lp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
