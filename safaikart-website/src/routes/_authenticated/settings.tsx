import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, ShieldCheck, Globe, Database, Loader2, Save, Camera } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref as sref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getBucket, getDb, getFirebaseAuth } from "@/lib/firebase";
import { z } from "zod";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

function SettingsPage() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(admin?.name || "");
  const [photoURL, setPhotoURL] = useState<string | undefined>(admin?.photoURL);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(admin?.name || "");
    setPhotoURL(admin?.photoURL);
  }, [admin?.name, admin?.photoURL]);

  async function handleLogout() {
    await logout();
    navigate({ to: "/login", replace: true });
  }

  async function save() {
    if (!admin) return;
    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid name");
      return;
    }
    setSaving(true);
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: parsed.data.name,
          photoURL: photoURL || null,
        });
      }
      await setDoc(
        doc(getDb(), "adminUsers", admin.uid),
        {
          name: parsed.data.name,
          email: admin.email ?? null,
          photoURL: photoURL ?? null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file: File) {
    if (!admin) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const path = `admins/${admin.uid}/photo-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
      const r = sref(getBucket(), path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setPhotoURL(url);
      toast.success("Photo uploaded — click Save to persist");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const initials =
    (name || admin?.email || "A")
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "A";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
      <Card className="rounded-2xl shadow-card border-border/70 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {photoURL ? <AvatarImage src={photoURL} alt={name} /> : null}
                <AvatarFallback className="bg-brand text-gold text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-brand text-white grid place-items-center shadow-elevated hover:bg-brand-dark"
                aria-label="Change photo"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
              />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <Label>Display name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="h-11 rounded-xl mt-1"
                />
              </div>
              <div className="text-xs text-muted-foreground">{admin?.email}</div>
              <div className="text-xs font-mono text-muted-foreground">uid: {admin?.uid}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button onClick={handleLogout} variant="outline" className="rounded-xl">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-brand hover:bg-brand-dark text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <InfoCard
        icon={ShieldCheck}
        title="Admin guard"
        body='Access is granted only if your uid exists in the "adminUsers" collection.'
      />
      <InfoCard icon={Globe} title="Region" body="Firebase Functions region: asia-south1" />
      <InfoCard icon={Database} title="Project" body="safaikart-6c4e4 (Firestore)" />
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card className="rounded-2xl shadow-card border-border/70">
      <CardContent className="p-5 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand text-gold grid place-items-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground mt-1">{body}</div>
        </div>
      </CardContent>
    </Card>
  );
}
