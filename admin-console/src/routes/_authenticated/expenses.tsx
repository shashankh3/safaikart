import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR, formatDate, toDate } from "@/lib/format";
import { Loader2, Plus, Trash2, Fuel, Package, Users, MoreHorizontal, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/_authenticated/expenses")({
  ssr: false,
  component: ExpensesPage,
});

const CATEGORIES = [
  { key: "fuel", label: "Fuel", icon: Fuel },
  { key: "packaging", label: "Packaging", icon: Package },
  { key: "salary", label: "Salary", icon: Users },
  { key: "misc", label: "Misc", icon: MoreHorizontal },
] as const;

type Expense = {
  id: string;
  category?: string;
  amountMinor?: number;
  note?: string;
  createdAt?: unknown;
  createdBy?: string;
};

const schema = z.object({
  category: z.enum(["fuel", "packaging", "salary", "misc"]),
  amount: z.number().positive().max(10_000_000),
  note: z.string().trim().max(200).optional(),
});

function isoMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ExpensesPage() {
  const { admin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [month, setMonth] = useState<string>(isoMonth(new Date()));
  const [category, setCategory] = useState<"fuel" | "packaging" | "salary" | "misc">("fuel");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(
      query(collection(db, "expenses"), orderBy("createdAt", "desc")),
      (snap) => {
        setExpenses(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Expense,
          ),
        );
      },
      () => setExpenses([]),
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((e) => {
      const d = toDate(e.createdAt);
      return d && isoMonth(d) === month;
    });
  }, [expenses, month]);

  const totals = useMemo(() => {
    const byCat: Record<string, number> = {};
    let sum = 0;
    for (const e of filtered) {
      const a = e.amountMinor || 0;
      byCat[e.category || "misc"] = (byCat[e.category || "misc"] || 0) + a;
      sum += a;
    }
    return { byCat, sum };
  }, [filtered]);

  async function add() {
    const parsed = schema.safeParse({
      category,
      amount: Number(amount),
      note: note || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(getDb(), "expenses"), {
        category: parsed.data.category,
        amountMinor: Math.round(parsed.data.amount * 100),
        note: parsed.data.note ?? null,
        createdAt: serverTimestamp(),
        createdBy: admin?.uid ?? null,
      });
      toast.success("Expense added");
      setAmount("");
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteDoc(doc(getDb(), "expenses", id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (expenses === null) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading expenses…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-1">
            <Label>Month</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-11 rounded-xl mt-1"
            />
          </div>
          <div className="md:col-span-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger className="h-11 rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-11 rounded-xl mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Note</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              maxLength={200}
              className="h-11 rounded-xl mt-1"
            />
          </div>
          <Button
            onClick={add}
            disabled={saving}
            className="h-11 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add expense
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="rounded-2xl shadow-card border-border/70 bg-brand text-white col-span-2">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-gold font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Month total
            </div>
            <div className="text-3xl font-bold mt-2">{formatINR(totals.sum)}</div>
            <div className="text-xs text-white/70 mt-1">{filtered.length} entries</div>
          </CardContent>
        </Card>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key} className="rounded-2xl shadow-card border-border/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <Icon className="h-3.5 w-3.5" /> {c.label}
                </div>
                <div className="text-xl font-bold mt-2">{formatINR(totals.byCat[c.key] || 0)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              No expenses recorded this month.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">When</th>
                  <th className="text-left px-5 py-3 font-medium">Category</th>
                  <th className="text-left px-5 py-3 font-medium">Note</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(e.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="rounded-full capitalize">
                        {e.category || "misc"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">{e.note || "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {formatINR(e.amountMinor)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(e.id)}
                        className="rounded-lg text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
