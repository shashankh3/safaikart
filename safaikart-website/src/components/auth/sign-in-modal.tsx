import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SignInModal({
  open,
  onOpenChange,
  onAuthed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAuthed?: () => void;
}) {
  const { signIn, signUpEmail, signInWithGoogle, startPhoneOtp, verifyPhoneOtp } = useAuth();
  const [busy, setBusy] = useState(false);

  // email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // phone
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

  async function handleEmail(mode: "signin" | "signup") {
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUpEmail(email.trim(), password);
      toast.success("Signed in!");
      onOpenChange(false);
      onAuthed?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      await signInWithGoogle();
      toast.success("Signed in!");
      onOpenChange(false);
      onAuthed?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp() {
    const cleanedPhone = getCleanedPhone();
    if (!/^\+91[6-9]\d{9}$/.test(cleanedPhone) && !/^\+91\d{10}$/.test(cleanedPhone)) {
      return toast.error("Please enter a valid 10-digit Indian mobile number");
    }

    setBusy(true);
    try {
      await startPhoneOtp(cleanedPhone);
      setOtpSent(true);
      setResendTimer(30);
      toast.success("OTP sent to " + cleanedPhone);
    } catch (e: any) {
      console.error("handleSendOtp error:", e);
      toast.error(e?.message || "Failed to send OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    const cleanedPhone = getCleanedPhone();
    const trimmedOtp = otp.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      return toast.error("Please enter a valid 6-digit OTP code");
    }

    setBusy(true);
    try {
      await verifyPhoneOtp(cleanedPhone, trimmedOtp);
      toast.success("Signed in successfully!");
      onOpenChange(false);
      onAuthed?.();
    } catch (e: any) {
      console.error("handleVerifyOtp error:", e);
      toast.error(e?.message || "Invalid OTP code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription>Complete your booking with an account.</DialogDescription>
        </DialogHeader>

        <Button
          onClick={handleGoogle}
          disabled={busy}
          variant="outline"
          className="w-full h-11 rounded-xl"
        >
          Continue with Google
        </Button>

        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="bg-background px-2">or</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-border" />
        </div>

        <Tabs defaultValue="phone">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="phone">Phone OTP</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="phone" className="space-y-3 mt-3">
            <Label>Phone number</Label>
            <Input
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={otpSent || busy}
            />

            {otpSent && (
              <>
                <Label>Enter 6-digit OTP</Label>
                <Input
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center tracking-widest text-lg font-bold"
                  autoFocus
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="hover:underline text-foreground"
                  >
                    Change Number
                  </button>
                  {resendTimer > 0 ? (
                    <span>Resend in {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={busy}
                      className="text-brand font-medium hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </>
            )}

            {!otpSent ? (
              <Button onClick={handleSendOtp} disabled={busy} className="w-full h-11 rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send OTP
              </Button>
            ) : (
              <Button onClick={handleVerifyOtp} disabled={busy} className="w-full h-11 rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify & Sign In
              </Button>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-3 mt-3">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => handleEmail("signin")} disabled={busy} className="flex-1 h-11 rounded-xl">
                Sign in
              </Button>
              <Button onClick={() => handleEmail("signup")} disabled={busy} variant="outline" className="flex-1 h-11 rounded-xl">
                Sign up
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
