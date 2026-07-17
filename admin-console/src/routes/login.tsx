import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";
import logoAsset from "@/assets/safaikart-logo.jpeg.asset.json";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Sign in failed. Check your credentials.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-brand text-white">
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #F4C73E 0%, transparent 40%), radial-gradient(circle at 80% 70%, #24502D 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-elevated">
              <img src={logoAsset.url} alt="SafaiKart" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-lg font-semibold">SafaiKart</div>
              <div className="text-xs text-white/70">Admin Console</div>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Manage every order,
              <br />
              <span className="text-gold">effortlessly.</span>
            </h2>
            <p className="mt-4 text-white/80 max-w-md">
              A premium control room for your laundry & dry-cleaning operations —
              orders, catalog, users, all in one place.
            </p>
          </div>

          <div className="text-xs text-white/60">
            © {new Date().getFullYear()} SafaiKart · Region: asia-south1
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl overflow-hidden ring-1 ring-border">
              <img src={logoAsset.url} alt="SafaiKart" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-base font-semibold">SafaiKart</div>
              <div className="text-xs text-muted-foreground">Admin Console</div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin access only. Contact your team lead if you need an account.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@safaikart.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 p-3 text-sm">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-brand text-gold hover:opacity-90 font-semibold shadow-elevated"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
