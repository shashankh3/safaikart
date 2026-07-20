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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatINR } from "@/lib/format";
import { Plus, Pencil, Trash2, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useDialogs } from "@/components/ui/dialog-provider";

export const Route = createFileRoute("/_authenticated/coupons")({
  ssr: false,
  component: CouponsPage,
});

type Coupon = {
  id: string;
  code: string;
  description?: string;
  type: "percent" | "flat";
  discountValue: number;
  minimumOrderAmount?: number;
  maxUsage?: number;
  usedCount?: number;
  usedBy?: string[];
  isActive: boolean;
  validUntil?: unknown;
  createdAt?: unknown;
};

const EMPTY: Omit<Coupon, "id"> = {
  code: "",
  description: "",
  type: "percent",
  discountValue: 10,
  minimumOrderAmount: 0,
  maxUsage: 0,
  usedCount: 0,
  isActive: true,
};

function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Coupon, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { confirm } = useDialogs();

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setCoupons(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Coupon,
          ),
        );
      },
      () => setCoupons([]),
    );
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({ ...EMPTY, ...c });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim()) {
      toast.error("Code is required");
      return;
    }
    setSaving(true);
    try {
      const db = getDb();
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue) || 0,
        minimumOrderAmount: Number(form.minimumOrderAmount) || 0,
        maxUsage: Number(form.maxUsage) || 0,
      };
      if (editing) {
        await updateDoc(doc(db, "coupons", editing.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        toast.success("Coupon updated");
      } else {
        await addDoc(collection(db, "coupons"), {
          ...payload,
          usedCount: 0,
          usedBy: [],
          createdAt: serverTimestamp(),
        });
        toast.success("Coupon created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      const db = getDb();
      await updateDoc(doc(db, "coupons", c.id), { isActive: !c.isActive });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const remove = async (c: Coupon) => {
    if (!(await confirm({ title: `Delete coupon ${c.code}?`, destructive: true }))) return;
    try {
      const db = getDb();
      await deleteDoc(doc(db, "coupons", c.id));
      toast.success("Coupon deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const isLoading = coupons === null;

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-brand" />
            <div>
              <div className="font-semibold">Coupons & Discounts</div>
              <div className="text-xs text-muted-foreground">
                Manage promotional codes for the mobile app
              </div>
            </div>
          </div>
          <Button
            onClick={openNew}
            className="h-11 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2"
          >
            <Plus className="h-4 w-4" /> New coupon
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              No coupons yet. Create your first one to boost bookings.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Code</th>
                    <th className="text-left px-5 py-3 font-medium">Discount</th>
                    <th className="text-left px-5 py-3 font-medium">Min order</th>
                    <th className="text-left px-5 py-3 font-medium">Usage</th>
                    <th className="text-left px-5 py-3 font-medium">Created</th>
                    <th className="text-center px-5 py-3 font-medium">Active</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="font-mono font-semibold">{c.code}</div>
                        {c.description ? (
                          <div className="text-xs text-muted-foreground">{c.description}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className="bg-gold/20 text-brand border-gold/40 rounded-full font-medium"
                        >
                          {c.type === "percent"
                            ? `${c.discountValue}% off`
                            : `${formatINR(c.discountValue)} off`}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {c.minimumOrderAmount ? formatINR(c.minimumOrderAmount) : "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {c.usedCount ?? 0}
                        {c.maxUsage ? ` / ${c.maxUsage}` : ""}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c)} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(c)}
                            className="rounded-lg"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(c)}
                            className="rounded-lg text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit coupon" : "New coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="WELCOME50"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Welcome offer for new users"
                className="rounded-xl mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as "percent" | "flat" })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent %</SelectItem>
                    <SelectItem value="flat">Flat ₹ (minor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.type === "percent" ? "Percent" : "Amount (minor)"}</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min order (minor)</Label>
                <Input
                  type="number"
                  value={form.minimumOrderAmount}
                  onChange={(e) => setForm({ ...form, minimumOrderAmount: Number(e.target.value) })}
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Usage limit (0 = unlimited)</Label>
              <Input
                type="number"
                value={form.maxUsage}
                onChange={(e) => setForm({ ...form, maxUsage: Number(e.target.value) })}
                className="rounded-xl mt-1"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-brand hover:bg-brand-dark text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
