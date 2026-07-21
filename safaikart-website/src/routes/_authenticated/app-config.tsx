import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Smartphone, Wrench, AlertOctagon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app-config")({
  ssr: false,
  component: AppConfigPage,
});

type AppConfig = {
  minVersionAndroid?: string;
  minVersionIos?: string;
  latestVersionAndroid?: string;
  latestVersionIos?: string;
  forceUpdate?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  supportPhone?: string;
  supportEmail?: string;
  supportWhatsapp?: string;
  ordersAcceptingNewOrders?: boolean;
  updatedAt?: unknown;
};

const CONFIG_PATH = { col: "config", id: "app" };

function AppConfigPage() {
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<AppConfig>({
    minVersionAndroid: "1.0.0",
    minVersionIos: "1.0.0",
    latestVersionAndroid: "1.0.0",
    latestVersionIos: "1.0.0",
    forceUpdate: false,
    maintenanceMode: false,
    maintenanceMessage: "We're doing quick maintenance. Please check back shortly.",
    supportPhone: "",
    supportEmail: "",
    supportWhatsapp: "",
    ordersAcceptingNewOrders: true,
  });

  useEffect(() => {
    const ref = doc(getDb(), CONFIG_PATH.col, CONFIG_PATH.id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setCfg((prev) => ({ ...prev, ...(snap.data() as AppConfig) }));
        }
        setLoaded(true);
      },
      () => setLoaded(true),
    );
    return unsub;
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(getDb(), CONFIG_PATH.col, CONFIG_PATH.id),
        { ...cfg, updatedAt: serverTimestamp() },
        { merge: true },
      );
      toast.success("Config saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading config…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {cfg.maintenanceMode && (
        <Card className="rounded-2xl shadow-card border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 text-amber-700" />
            <div>
              <div className="font-semibold text-amber-900">Maintenance mode is ON</div>
              <div className="text-xs text-amber-800">Customers see the maintenance screen in the mobile app.</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="h-4 w-4 text-brand" /> Service switches
          </div>
          <ToggleRow
            title="Accepting new orders"
            desc="Turn off to reject new orders app-wide (existing orders unaffected)."
            checked={!!cfg.ordersAcceptingNewOrders}
            onChange={(v) => setCfg({ ...cfg, ordersAcceptingNewOrders: v })}
          />
          <ToggleRow
            title="Maintenance mode"
            desc="Show a full-screen maintenance notice in the mobile app."
            checked={!!cfg.maintenanceMode}
            onChange={(v) => setCfg({ ...cfg, maintenanceMode: v })}
          />
          {cfg.maintenanceMode && (
            <div className="space-y-2">
              <Label>Maintenance message</Label>
              <Textarea
                rows={2}
                value={cfg.maintenanceMessage || ""}
                onChange={(e) => setCfg({ ...cfg, maintenanceMessage: e.target.value })}
                className="rounded-xl"
              />
            </div>
          )}
          <ToggleRow
            title="Force update"
            desc="Users on older versions must update before using the app."
            checked={!!cfg.forceUpdate}
            onChange={(v) => setCfg({ ...cfg, forceUpdate: v })}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="h-4 w-4 text-brand" /> App versions
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latest Android</Label>
              <Input
                value={cfg.latestVersionAndroid || ""}
                onChange={(e) => setCfg({ ...cfg, latestVersionAndroid: e.target.value })}
                className="rounded-xl"
                placeholder="1.2.3"
              />
            </div>
            <div className="space-y-2">
              <Label>Latest iOS</Label>
              <Input
                value={cfg.latestVersionIos || ""}
                onChange={(e) => setCfg({ ...cfg, latestVersionIos: e.target.value })}
                className="rounded-xl"
                placeholder="1.2.3"
              />
            </div>
            <div className="space-y-2">
              <Label>Min Android <Badge variant="outline" className="ml-1 text-[10px]">enforces force-update</Badge></Label>
              <Input
                value={cfg.minVersionAndroid || ""}
                onChange={(e) => setCfg({ ...cfg, minVersionAndroid: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Min iOS</Label>
              <Input
                value={cfg.minVersionIos || ""}
                onChange={(e) => setCfg({ ...cfg, minVersionIos: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-6 space-y-5">
          <div className="text-sm font-semibold">Support channels</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={cfg.supportPhone || ""}
                onChange={(e) => setCfg({ ...cfg, supportPhone: e.target.value })}
                className="rounded-xl"
                placeholder="+91…"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={cfg.supportEmail || ""}
                onChange={(e) => setCfg({ ...cfg, supportEmail: e.target.value })}
                className="rounded-xl"
                placeholder="help@safaikart.com"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={cfg.supportWhatsapp || ""}
                onChange={(e) => setCfg({ ...cfg, supportWhatsapp: e.target.value })}
                className="rounded-xl"
                placeholder="+91…"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="h-11 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save configuration
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Stored at Firestore <code>{CONFIG_PATH.col}/{CONFIG_PATH.id}</code>. The mobile app should
        subscribe to this document.
      </p>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-4">
      <div className="pr-4">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
