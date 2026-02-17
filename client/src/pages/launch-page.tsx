import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import type { Wallet } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket,
  Upload,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Lock,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Image as ImageIcon,
  X,
} from "lucide-react";

const LAUNCHPADS = [
  { id: "pump.fun", name: "pump.fun", color: "bg-green-500", textColor: "text-green-400", desc: "Largest meme coin launchpad" },
  { id: "bags.fm", name: "bags.fm", color: "bg-cyan-500", textColor: "text-cyan-400", desc: "Fee-share token launches" },
  { id: "bonk.fun", name: "bonk.fun", color: "bg-orange-500", textColor: "text-orange-400", desc: "BONK ecosystem launchpad" },
];

export default function LaunchPage() {
  const { toast } = useToast();
  const imageRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [launchpad, setLaunchpad] = useState("pump.fun");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    tokenName: "",
    tokenSymbol: "",
    tokenDescription: "",
    twitter: "",
    telegram: "",
    website: "",
    devBuyAmountSol: "0.5",
  });

  useEffect(() => {
    apiClient
      .get("/wallets/balances")
      .then((r) => setWallets(r.data.wallets || []))
      .catch(() => {})
      .finally(() => setWalletsLoading(false));
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const selectedWallets = Object.entries(allocations)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ index: parseInt(k), sol: v }));

  const totalBundleSol = selectedWallets.reduce((s, w) => s + w.sol, 0);
  const devBuy = parseFloat(form.devBuyAmountSol) || 0;
  const totalSpend = totalBundleSol + devBuy;
  const estimatedFee = totalSpend * 0.05;
  const lp = LAUNCHPADS.find((l) => l.id === launchpad)!;

  const canProceedStep1 = form.tokenName && form.tokenSymbol;
  const canProceedStep2 = selectedWallets.length > 0;

  const executeLaunch = async () => {
    if (!password) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("launchpad", launchpad);
      formData.append("tokenName", form.tokenName);
      formData.append("tokenSymbol", form.tokenSymbol);
      formData.append("tokenDescription", form.tokenDescription);
      formData.append("twitter", form.twitter);
      formData.append("telegram", form.telegram);
      formData.append("website", form.website);
      formData.append("devBuyAmountSol", form.devBuyAmountSol);
      formData.append("walletIndices", JSON.stringify(selectedWallets.map((w) => w.index)));
      formData.append("solPerWallet", String(selectedWallets[0]?.sol || 0));
      if (imageFile) formData.append("image", imageFile);

      const res = await apiClient.post("/bundler/launch", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      setStep(4);
      toast({ title: "Launch Successful!", description: `Token deployed on ${launchpad}` });
    } catch (err: any) {
      toast({
        title: "Launch Failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 4 && result) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="mx-auto max-w-lg w-full">
          <Card className="border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Launch Successful!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your token has been deployed on {launchpad}
              </p>
              <div className="flex flex-col gap-3 text-left">
                {[
                  { label: "Token", value: `${form.tokenName} (${form.tokenSymbol})` },
                  { label: "Mint", value: result.mintAddress ? `${result.mintAddress.slice(0, 8)}...${result.mintAddress.slice(-8)}` : "--" },
                  { label: "Transactions", value: result.txCount },
                  { label: "Fee Owed", value: `${result.feeOwed?.toFixed(4)} SOL` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between rounded-md bg-muted/30 p-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
                    <span className="font-mono text-xs font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
              {result.tokenUrl && (
                <a href={result.tokenUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="mt-4 w-full font-mono text-xs gap-2" data-testid="button-view-token">
                    View Token <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
              <Button
                variant="ghost"
                className="mt-2 w-full font-mono text-xs"
                onClick={() => { setStep(1); setResult(null); setPassword(""); setAllocations({}); }}
                data-testid="button-new-launch"
              >
                New Launch
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          Launch & Bundle
        </p>
        <h1 className="text-2xl font-bold">Create Token Launch</h1>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            <span className={`font-mono text-[10px] ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
              {s === 1 ? "Token Info" : s === 2 ? "Wallets" : "Confirm"}
            </span>
            {s < 3 && <div className={`h-px w-8 ${step > s ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Launchpad</span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {LAUNCHPADS.map((lpad) => (
                    <div
                      key={lpad.id}
                      onClick={() => setLaunchpad(lpad.id)}
                      className={`cursor-pointer rounded-md border p-3 transition-colors ${
                        launchpad === lpad.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      data-testid={`launchpad-${lpad.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-2 w-2 rounded-full ${lpad.color}`} />
                        <span className="font-mono text-xs font-bold">{lpad.name}</span>
                        {launchpad === lpad.id && <CheckCircle className="ml-auto h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground">{lpad.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Token Details</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Name</Label>
                    <Input
                      value={form.tokenName}
                      onChange={(e) => setForm({ ...form, tokenName: e.target.value })}
                      placeholder="My Token"
                      className="font-mono text-sm"
                      data-testid="input-token-name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Symbol</Label>
                    <Input
                      value={form.tokenSymbol}
                      onChange={(e) => setForm({ ...form, tokenSymbol: e.target.value.toUpperCase() })}
                      placeholder="TKN"
                      maxLength={10}
                      className="font-mono text-sm"
                      data-testid="input-token-symbol"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Description</Label>
                  <Textarea
                    value={form.tokenDescription}
                    onChange={(e) => setForm({ ...form, tokenDescription: e.target.value })}
                    placeholder="Token description..."
                    className="font-mono text-sm resize-none"
                    rows={3}
                    data-testid="input-token-description"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Dev Buy Amount (SOL)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.devBuyAmountSol}
                    onChange={(e) => setForm({ ...form, devBuyAmountSol: e.target.value })}
                    className="font-mono text-sm"
                    data-testid="input-dev-buy"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Social Links</span>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                {[
                  { key: "twitter", placeholder: "@handle" },
                  { key: "telegram", placeholder: "t.me/group" },
                  { key: "website", placeholder: "https://..." },
                ].map((field) => (
                  <div key={field.key} className="flex flex-col gap-2">
                    <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{field.key}</Label>
                    <Input
                      value={(form as any)[field.key]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="font-mono text-xs"
                      data-testid={`input-${field.key}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Token Image</span>
              </CardHeader>
              <CardContent>
                <input type="file" ref={imageRef} accept="image/*" onChange={handleImageChange} className="hidden" />
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Token" className="w-full aspect-square rounded-md object-cover" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => imageRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border p-8"
                    data-testid="button-upload-image"
                  >
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="font-mono text-xs text-muted-foreground">Click to upload</p>
                    <p className="font-mono text-[9px] text-muted-foreground/70">PNG, JPG, GIF, WebP (max 5MB)</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full font-mono text-sm gap-2"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              data-testid="button-next-step"
            >
              Next: Select Wallets <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4 max-w-3xl">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Bundle Wallets</span>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs gap-1"
                onClick={() => {
                  setWalletsLoading(true);
                  apiClient.get("/wallets/balances")
                    .then((r) => setWallets(r.data.wallets || []))
                    .finally(() => setWalletsLoading(false));
                }}
                data-testid="button-refresh-wallets"
              >
                <RefreshCw className="h-3 w-3" /> Sync
              </Button>
            </CardHeader>
            <CardContent>
              {walletsLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono text-[10px]"
                      onClick={() => {
                        const alloc: Record<number, number> = {};
                        wallets.forEach((w) => { alloc[w.wallet_index] = 0.1; });
                        setAllocations(alloc);
                      }}
                      data-testid="button-select-all-wallets"
                    >
                      Select All (0.1 SOL)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono text-[10px]"
                      onClick={() => setAllocations({})}
                      data-testid="button-clear-wallets"
                    >
                      Clear
                    </Button>
                  </div>
                  {wallets.map((w) => (
                    <div
                      key={w.id}
                      className={`flex items-center gap-3 rounded-md border p-3 ${
                        allocations[w.wallet_index] > 0 ? "border-primary/30 bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className={`h-1.5 w-1.5 rounded-full ${w.sol_balance > 0 ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-xs font-bold">
                          W{w.wallet_index + 1}
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                          {w.sol_balance?.toFixed(4) || "0.0000"} SOL
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={allocations[w.wallet_index] || ""}
                          onChange={(e) =>
                            setAllocations({ ...allocations, [w.wallet_index]: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-20 font-mono text-xs text-right"
                          data-testid={`input-alloc-${w.wallet_index}`}
                        />
                        <span className="font-mono text-[10px] text-muted-foreground w-7">SOL</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" className="font-mono text-xs gap-1" onClick={() => setStep(1)}>
              <ArrowLeft className="h-3 w-3" /> Back
            </Button>
            <Button
              className="flex-1 font-mono text-sm gap-2"
              disabled={!canProceedStep2}
              onClick={() => setStep(3)}
              data-testid="button-next-confirm"
            >
              Review Launch <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 gap-4 max-w-3xl lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Launch Summary</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                { label: "Launchpad", value: lp.name },
                { label: "Token", value: `${form.tokenName} (${form.tokenSymbol})` },
                { label: "Dev Buy", value: `${devBuy} SOL` },
                { label: "Bundle Wallets", value: String(selectedWallets.length) },
                { label: "Bundle Total", value: `${totalBundleSol.toFixed(4)} SOL` },
                { label: "Total Spend", value: `${totalSpend.toFixed(4)} SOL` },
                { label: "Est. Fee (5%)", value: `${estimatedFee.toFixed(4)} SOL` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
                  <span className="font-mono text-xs font-bold">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                    Sign Transactions
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Your Password
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to sign"
                    className="font-mono text-sm"
                    data-testid="input-launch-password"
                  />
                </div>
                <p className="mt-2 font-mono text-[9px] text-muted-foreground">
                  Used only to decrypt wallet keys locally. Never stored.
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 rounded-md bg-destructive/5 border border-destructive/20 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="font-mono text-[10px] text-destructive/80">
                This action is irreversible. Ensure all wallets are funded before launching.
              </p>
            </div>

            <Button variant="ghost" className="font-mono text-xs gap-1" onClick={() => setStep(2)}>
              <ArrowLeft className="h-3 w-3" /> Back
            </Button>

            <Button
              className="w-full font-mono text-sm gap-2"
              disabled={loading || !password}
              onClick={executeLaunch}
              data-testid="button-execute-launch"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Launching...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" /> Execute Bundle Launch
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
