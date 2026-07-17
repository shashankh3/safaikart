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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { Plus, Pencil, Trash2, Loader2, Bike, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/drivers")({
  ssr: false,
  component: DriversPage,
});

type Driver = {
  id: string;
  name: string;
  phone?: string;
  vehicleNumber?: string;
  zone?: string;
  active: boolean;
  createdAt?: unknown;
};

const EMPTY: Omit<Driver, "id"> = {
  name: "",
  phone: "",
  vehicleNumber: "",
  zone: "",
  active: true,
};

function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [draft, setDraft] = useState<Omit<Driver, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "drivers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDrivers(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Driver),
        );
      },
      (err) => toast.error(err.message),
    );
    return unsub;
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft(EMPTY);
    setOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    setDraft({
      name: d.name,
      phone: d.phone || "",
      vehicleNumber: d.vehicleNumber || "",
      zone: d.zone || "",
      active: d.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const db = getDb();
      const payload = { ...draft, updatedAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(db, "drivers", editing.id), payload);
        toast.success("Runner updated");
      } else {
        await addDoc(collection(db, "drivers"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Runner added");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this runner?")) return;
    try {
      await deleteDoc(doc(getDb(), "drivers", id));
      toast.success("Runner removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggle = async (d: Driver) => {
    try {
      await updateDoc(doc(getDb(), "drivers", d.id), {
        active: !d.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const isLoading = drivers === null;

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Runners & Drivers</div>
            <div className="text-xs text-muted-foreground">
              Assign to orders from the order detail sheet.
            </div>
          </div>
          <Button onClick={openNew} className="h-10 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="h-4 w-4" /> New runner
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : drivers!.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              No runners yet. Add one to start assigning orders.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-5 py-3 font-medium">Phone</th>
                    <th className="text-left px-5 py-3 font-medium">Vehicle</th>
                    <th className="text-left px-5 py-3 font-medium">Zone</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Added</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers!.map((d) => (
                    <tr key={d.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                          <Bike className="h-4 w-4" />
                        </div>
                        {d.name}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {d.phone ? (
                          <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                            <Phone className="h-3 w-3" /> {d.phone}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{d.vehicleNumber || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{d.zone || "—"}</td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={
                            d.active
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 rounded-full"
                              : "bg-slate-100 text-slate-700 border-slate-200 rounded-full"
                          }
                        >
                          {d.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(d.createdAt)}</td>
                      <td className="px-5 py-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => toggle(d)} className="rounded-lg">
                          {d.active ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(d)} className="rounded-lg">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(d.id)}
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
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit runner" : "New runner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ramesh Kumar"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  placeholder="+91…"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Input
                  value={draft.vehicleNumber}
                  onChange={(e) => setDraft({ ...draft, vehicleNumber: e.target.value })}
                  placeholder="DL 1A 1234"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zone / area</Label>
              <Input
                value={draft.zone}
                onChange={(e) => setDraft({ ...draft, zone: e.target.value })}
                placeholder="South Delhi"
                className="rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <Label>Active</Label>
                <div className="text-xs text-muted-foreground">Available for assignment</div>
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
