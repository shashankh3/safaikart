import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ShieldAlert } from "lucide-react";
import logoAsset from "@/assets/safaikart-logo.jpeg.asset.json";
import { toast } from "sonner";
import type { ConfirmationResult } from "firebase/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — SafaiKart" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, role, loading, signIn, signInWithGoogle, startPhoneOtp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (role === "admin") navigate({ to: "/dashboard", replace: true });
    else navigate({ to: "/app/orders", replace: true });
  }, [user, role, loading, navigate]);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn(email.trim(), password);
      toast.success("Welcome back!");
      navigate({ to: res.role === "admin" ? "/dashboard" : "/app/orders", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      toast.success("Signed in!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSendOtp() {
    if (!phone.startsWith("+")) return toast.error("Include country code, e.g. +91…");
    setSubmitting(true);
    try {
      const c = await startPhoneOtp(phone.trim(), "recaptcha-container-login");
      setConfirm(c);
      toast.success("OTP sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyOtp() {
    if (!confirm) return;
    
    const trimmedOtp = otp.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      return toast.error("Please enter a valid 6-digit OTP");
    }

    setSubmitting(true);
    try {
      await confirm.confirm(trimmedOtp);
      toast.success("Signed in!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden bg-brand text-white">
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #F4C73E 0%, transparent 40%), radial-gradient(circle at 80% 70%, #24502D 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-elevated">
              <img src={logoAsset.url} alt="SafaiKart" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-lg font-semibold">SafaiKart</div>
              <div className="text-xs text-white/70">Laundry & Dry Cleaning</div>
            </div>
          </Link>

          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Fresh clothes,
              <br />
              <span className="text-gold">delivered.</span>
            </h2>
            <p className="mt-4 text-white/80 max-w-md">
              Sign in to schedule pickups, track orders, or manage your team's operations.
            </p>
          </div>

          <div className="text-xs text-white/60">
            © {new Date().getFullYear()} SafaiKart
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 bg-white text-brand">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl overflow-hidden ring-1 ring-brand/20">
              <img src={logoAsset.url} alt="SafaiKart" className="h-full w-full object-cover" />
            </div>
            <div className="text-base font-semibold text-brand">SafaiKart</div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-brand">Sign in</h1>
          <p className="mt-2 text-sm text-brand/60">
            Sign in with your phone, Google, or email to continue.
          </p>

          <div className="mt-6">
            <Button
              onClick={onGoogle}
              disabled={submitting}
              variant="outline"
              className="w-full h-11 rounded-xl bg-white dark:bg-white border-brand/30 text-brand hover:bg-brand/5 hover:text-brand"
            >
              Continue with Google
            </Button>
          </div>

          <div className="relative my-4 text-center text-xs text-brand/50">
            <span className="bg-white px-2 relative z-10">or</span>
            <div className="absolute inset-x-0 top-1/2 border-t border-brand/10" />
          </div>

          <Tabs defaultValue="phone">
            <TabsList className="grid grid-cols-2 w-full bg-brand/5 text-brand/70">
              <TabsTrigger value="phone" className="data-[state=active]:bg-brand data-[state=active]:text-gold text-brand/70">Phone OTP</TabsTrigger>
              <TabsTrigger value="email" className="data-[state=active]:bg-brand data-[state=active]:text-gold text-brand/70">Email</TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="mt-4 space-y-3">
              <div>
                <Label className="text-brand/80">Phone number</Label>
                <Input
                  placeholder="+91 98xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!!confirm}
                  className="h-11 rounded-xl bg-white border-brand/20 text-brand"
                />
              </div>
              {confirm && (
                <div>
                  <Label className="text-brand/80">Enter OTP</Label>
                  <Input
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-11 rounded-xl bg-white border-brand/20 text-brand"
                  />
                </div>
              )}
              <div id="recaptcha-container-login" />
              <Button
                onClick={confirm ? onVerifyOtp : onSendOtp}
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : confirm ? "Verify & sign in" : "Send OTP"}
              </Button>
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              <form onSubmit={onEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-brand/80">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@safaikart.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl bg-white border-brand/20 text-brand placeholder:text-brand/40"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-brand/80">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl bg-white border-brand/20 text-brand placeholder:text-brand/40"
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
                  className="w-full h-11 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold shadow-elevated"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-xs text-brand/60">
            <Link to="/" className="hover:text-brand">← Back to SafaiKart</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
