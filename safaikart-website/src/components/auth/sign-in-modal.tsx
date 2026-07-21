import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { ConfirmationResult } from "firebase/auth";

export function SignInModal({
  open,
  onOpenChange,
  onAuthed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAuthed?: () => void;
}) {
  const { signIn, signUpEmail, signInWithGoogle, startPhoneOtp } = useAuth();
  const [busy, setBusy] = useState(false);

  // email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // phone
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null);

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
    const cleanedPhone = phone.replace(/[^\d+]/g, "");
    if (!cleanedPhone.startsWith("+") || cleanedPhone.length < 10) {
      return toast.error("Include country code, e.g. +919876543210");
    }
    setBusy(true);
    try {
      const c = await startPhoneOtp(cleanedPhone, "recaptcha-container");
      setConfirm(c);
      toast.success("OTP sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!confirm) return;
    
    const trimmedOtp = otp.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      return toast.error("Please enter a valid 6-digit OTP");
    }

    setBusy(true);
    try {
      await confirm.confirm(trimmedOtp);
      toast.success("Signed in!");
      onOpenChange(false);
      onAuthed?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid OTP");
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
              placeholder="+91 98xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!!confirm}
            />
            {confirm && (
              <>
                <Label>Enter OTP</Label>
                <Input placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} />
              </>
            )}
            <div id="recaptcha-container" />
            {!confirm ? (
              <Button onClick={handleSendOtp} disabled={busy} className="w-full h-11 rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
              </Button>
            ) : (
              <Button onClick={handleVerifyOtp} disabled={busy} className="w-full h-11 rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
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
