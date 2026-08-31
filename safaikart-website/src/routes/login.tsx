import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — SafaiKart" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, role, loading, signIn, signInWithGoogle, startPhoneOtp, verifyPhoneOtp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpSent, resendTimer]);

  useEffect(() => {
    if (loading || !user) return;
    if (role === "admin") navigate({ to: "/dashboard", replace: true });
    else navigate({ to: "/app/orders", replace: true });
  }, [user, role, loading, navigate]);

  function getCleanedPhone() {
    let cleaned = phone.trim().replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("91") && cleaned.length === 12) {
        cleaned = "+" + cleaned;
      } else {
        cleaned = "+91" + cleaned;
      }
    }
    return cleaned;
  }

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
    const cleaned = getCleanedPhone();
    if (!/^\+91[6-9]\d{9}$/.test(cleaned) && !/^\+91\d{10}$/.test(cleaned)) {
      return toast.error("Please enter a valid 10-digit Indian mobile number");
    }
    setSubmitting(true);
    try {
      await startPhoneOtp(cleaned);
      setOtpSent(true);
      setResendTimer(30);
      toast.success("OTP sent to " + cleaned);
    } catch (e: any) {
      console.error("sendOtp error:", e);
      toast.error(e?.message || "Failed to send OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyOtp() {
    const cleaned = getCleanedPhone();
    const trimmedOtp = otp.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      return toast.error("Please enter a valid 6-digit OTP code");
    }

    setSubmitting(true);
    try {
      await verifyPhoneOtp(cleaned, trimmedOtp);
      toast.success("Signed in successfully!");
    } catch (e: any) {
      console.error("verifyOtp error:", e);
      toast.error(e?.message || "Invalid OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden bg-brand text-white">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #F4C73E 0%, transparent 40%), radial-gradient(circle at 80% 70%, #24502D 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-elevated bg-[#0C3818] flex items-center justify-center p-0.5">
              <img src="/images/logo.png" alt="SafaiKart" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-lg font-semibold">SafaiKart</div>
              <div className="text-xs text-white/70">Laundry & Dry Cleaning</div>
            </div>
          </Link>

          <div>
            <div className="text-3xl font-display font-bold leading-tight mb-3">
              Premium fabric care,
              <br />
              <span className="text-gold">delivered to your doorstep.</span>
            </div>
            <p className="text-white/70 max-w-md text-sm">
              Track live orders, manage schedules, and experience five-star garment care in Raipur.
            </p>
          </div>

          <div className="text-xs text-white/50">
            © {new Date().getFullYear()} SafaiKart Inc. All rights reserved.
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display text-brand">Welcome to SafaiKart</h1>
            <p className="text-sm text-brand/70 mt-1">Sign in with your mobile number, Google, or email.</p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onGoogle}
            disabled={submitting}
            className="w-full h-11 rounded-xl bg-white border-brand/20 text-brand hover:bg-brand/5 font-semibold flex items-center justify-center gap-2 mb-4"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-4 text-center text-xs text-brand/50">
            <span className="bg-background px-2 relative z-10">or continue with</span>
            <div className="absolute inset-x-0 top-1/2 -z-0 border-t border-brand/10" />
          </div>

          <Tabs defaultValue="phone">
            <TabsList className="grid grid-cols-2 bg-brand/5 p-1 rounded-xl">
              <TabsTrigger value="phone" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-brand font-medium">Phone OTP</TabsTrigger>
              <TabsTrigger value="email" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-brand font-medium">Email</TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="space-y-4 mt-4">
              <div>
                <Label className="text-brand/80">Phone number</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent || submitting}
                  className="h-11 rounded-xl bg-white border-brand/20 text-brand"
                />
              </div>

              {otpSent && (
                <div>
                  <Label className="text-brand/80">Enter 6-digit OTP</Label>
                  <Input
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="h-11 rounded-xl bg-white border-brand/20 text-brand text-center tracking-widest text-lg font-bold"
                    autoFocus
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                      className="hover:underline text-brand"
                    >
                      Change Number
                    </button>
                    {resendTimer > 0 ? (
                      <span>Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={onSendOtp}
                        disabled={submitting}
                        className="text-brand font-semibold hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!otpSent ? (
                <Button
                  onClick={onSendOtp}
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send OTP
                </Button>
              ) : (
                <Button
                  onClick={onVerifyOtp}
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Sign In
                </Button>
              )}
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
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign in
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
