import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useDialogs } from "@/components/ui/dialog-provider";
import { Plus, Pencil, Trash2, Loader2, MapPinned, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/zones")({
  ssr: false,
  component: ZonesPage,
});

type Zone = {
  id: string;
  name: string;
  pincodes: string[];
  active: boolean;
  surgeMultiplier: number; // e.g. 1.25 = +25%
  minOrderMinor?: number;
  deliveryFeeMinor?: number;
  createdAt?: unknown;
};

const EMPTY = {
  name: "",
  pincodesText: "",
  active: true,
  surgeMultiplier: 1,
  minOrderMinor: 0,
  deliveryFeeMinor: 0,
};

function ZonesPage() {
  const [list, setList] = useState<Zone[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { confirm } = useDialogs();

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "zones"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setList(
          snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              name: String(data.name || ""),
              pincodes: Array.isArray(data.pincodes) ? (data.pincodes as string[]) : [],
              active: data.active !== false,
              surgeMultiplier: Number(data.surgeMultiplier || 1),
              minOrderMinor: Number(data.minOrderMinor || 0),
              deliveryFeeMinor: Number(data.deliveryFeeMinor || 0),
              createdAt: data.createdAt,
            } as Zone;
          }),
        );
      },
      () => setList([]),
    );
    return unsub;
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft(EMPTY);
    setOpen(true);
  };

  const openEdit = (z: Zone) => {
    setEditing(z);
    setDraft({
      name: z.name,
      pincodesText: z.pincodes.join(", "),
      active: z.active,
      surgeMultiplier: z.surgeMultiplier,
      minOrderMinor: z.minOrderMinor || 0,
      deliveryFeeMinor: z.deliveryFeeMinor || 0,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Zone name is required");
      return;
    }
    setSaving(true);
    try {
      const pincodes = draft.pincodesText
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      const payload = {
        name: draft.name.trim(),
        pincodes,
        active: draft.active,
        surgeMultiplier: Number(draft.surgeMultiplier) || 1,
        minOrderMinor: Number(draft.minOrderMinor) || 0,
        deliveryFeeMinor: Number(draft.deliveryFeeMinor) || 0,
        updatedAt: serverTimestamp(),
      };
      const db = getDb();
      if (editing) {
        await updateDoc(doc(db, "zones", editing.id), payload);
        toast.success("Zone updated");
      } else {
        await addDoc(collection(db, "zones"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Zone created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({ title: "Delete this zone?", destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "zones", id));
      toast.success("Zone deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggle = async (z: Zone) => {
    try {
      await updateDoc(doc(getDb(), "zones", z.id), {
        active: !z.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const isLoading = list === null;

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Service zones & surge pricing</div>
            <div className="text-xs text-muted-foreground">
              Configure serviceable pincodes, delivery fees, and surge multipliers.
            </div>
          </div>
          <Button onClick={openNew} className="h-10 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="h-4 w-4" /> New zone
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading zones…
            </div>
          ) : list!.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <MapPinned className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No zones yet. Create one to start controlling delivery fees and surge pricing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Zone</th>
                    <th className="text-left px-5 py-3 font-medium">Pincodes</th>
                    <th className="text-right px-5 py-3 font-medium">Surge</th>
                    <th className="text-right px-5 py-3 font-medium">Delivery fee</th>
                    <th className="text-right px-5 py-3 font-medium">Min order</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list!.map((z) => (
                    <tr key={z.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                          <MapPinned className="h-4 w-4" />
                        </div>
                        {z.name}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {z.pincodes.slice(0, 6).map((p) => (
                            <Badge key={p} variant="outline" className="rounded-full font-mono text-xs">
                              {p}
                            </Badge>
                          ))}
                          {z.pincodes.length > 6 && (
                            <Badge variant="outline" className="rounded-full text-xs">
                              +{z.pincodes.length - 6}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {z.surgeMultiplier > 1 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-orange-600">
                            <TrendingUp className="h-3 w-3" />
                            {z.surgeMultiplier.toFixed(2)}×
                          </span>
                        ) : (
                          <span className="text-muted-foreground">1.00×</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        ₹{((z.deliveryFeeMinor || 0) / 100).toFixed(0)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        ₹{((z.minOrderMinor || 0) / 100).toFixed(0)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={
                            z.active
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 rounded-full"
                              : "bg-slate-100 text-slate-700 border-slate-200 rounded-full"
                          }
                        >
                          {z.active ? "Live" : "Paused"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => toggle(z)} className="rounded-lg">
                          {z.active ? "Pause" : "Enable"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(z)} className="rounded-lg">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(z.id)}
                          className="rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit zone" : "New zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zone name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="South Delhi"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Pincodes (comma-separated)</Label>
              <Input
                value={draft.pincodesText}
                onChange={(e) => setDraft({ ...draft, pincodesText: e.target.value })}
                placeholder="110001, 110002, 110003"
                className="rounded-xl font-mono"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Surge ×</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="1"
                  value={draft.surgeMultiplier}
                  onChange={(e) => setDraft({ ...draft, surgeMultiplier: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery ₹</Label>
                <Input
                  type="number"
                  min="0"
                  value={(draft.deliveryFeeMinor || 0) / 100}
                  onChange={(e) =>
                    setDraft({ ...draft, deliveryFeeMinor: Math.round(Number(e.target.value) * 100) })
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Min order ₹</Label>
                <Input
                  type="number"
                  min="0"
                  value={(draft.minOrderMinor || 0) / 100}
                  onChange={(e) =>
                    setDraft({ ...draft, minOrderMinor: Math.round(Number(e.target.value) * 100) })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <Label>Active</Label>
                <div className="text-xs text-muted-foreground">Zone accepts new orders</div>
              </div>
              <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-brand hover:bg-brand-dark text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
