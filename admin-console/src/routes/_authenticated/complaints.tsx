import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDate } from "@/lib/format";
import { AlertTriangle, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/complaints")({
  ssr: false,
  component: ComplaintsPage,
});

type Complaint = {
  id: string;
  orderId?: string;
  userId?: string;
  subject?: string;
  message?: string;
  category?: string;
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  reply?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

function statusColor(s?: string) {
  switch (s) {
    case "RESOLVED":
    case "CLOSED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-800 border-sky-200";
    default:
      return "bg-rose-100 text-rose-800 border-rose-200";
  }
}

function priorityColor(p?: string) {
  switch (p) {
    case "HIGH":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function ComplaintsPage() {
  const [items, setItems] = useState<Complaint[] | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Complaint),
        );
      },
      () => setItems([]),
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === "ALL") return items;
    return items.filter((c) => c.status === filter);
  }, [items, filter]);

  const stats = useMemo(() => {
    if (!items) return { open: 0, inProgress: 0, resolved: 0 };
    return {
      open: items.filter((c) => c.status === "OPEN" || !c.status).length,
      inProgress: items.filter((c) => c.status === "IN_PROGRESS").length,
      resolved: items.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length,
    };
  }, [items]);

  const openTicket = (c: Complaint) => {
    setSelected(c);
    setReply(c.reply || "");
  };

  const updateStatus = async (id: string, status: string) => {
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "complaints", id), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Marked ${status}`);
      setSelected((s) =>
        s && s.id === id ? { ...s, status: status as Complaint["status"] } : s,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const saveReply = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "complaints", selected.id), {
        reply,
        status: selected.status === "OPEN" || !selected.status ? "IN_PROGRESS" : selected.status,
        updatedAt: serverTimestamp(),
      });
      toast.success("Reply saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const isLoading = items === null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-card border-border/70 bg-rose-50 border-rose-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-rose-800 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" /> Open
            </div>
            <div className="text-3xl font-bold text-rose-900 mt-2">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              In progress
            </div>
            <div className="text-3xl font-bold mt-2">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
            </div>
            <div className="text-3xl font-bold mt-2">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56 h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All tickets</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading tickets…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No complaints. Docs added to <code className="text-xs">complaints</code> will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openTicket(c)}
                  className="w-full text-left p-5 hover:bg-muted/40 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={`${statusColor(c.status)} rounded-full text-xs`}>
                          {c.status || "OPEN"}
                        </Badge>
                        {c.priority && (
                          <Badge variant="outline" className={`${priorityColor(c.priority)} rounded-full text-xs`}>
                            {c.priority}
                          </Badge>
                        )}
                        {c.category && (
                          <Badge variant="outline" className="rounded-full text-xs">{c.category}</Badge>
                        )}
                        {c.orderId && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {c.orderId.slice(0, 10)}…
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-sm">{c.subject || "(no subject)"}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {c.message}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle>{selected.subject || "Ticket"}</SheetTitle>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className={`${statusColor(selected.status)} rounded-full`}>
                    {selected.status || "OPEN"}
                  </Badge>
                  {selected.priority && (
                    <Badge variant="outline" className={`${priorityColor(selected.priority)} rounded-full`}>
                      {selected.priority}
                    </Badge>
                  )}
                </div>
              </SheetHeader>
              <div className="px-6 py-6 space-y-5">
                <div>
                  <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                    Customer message
                  </div>
                  <div className="rounded-xl bg-muted/50 border border-border p-4 text-sm">
                    {selected.message || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatDate(selected.createdAt)} · {selected.userId || "anonymous"}
                    {selected.orderId ? ` · order ${selected.orderId.slice(0, 10)}…` : ""}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                    Internal reply
                  </div>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    placeholder="Notes / response to the customer…"
                    className="rounded-xl"
                  />
                  <Button
                    onClick={saveReply}
                    disabled={saving}
                    className="mt-3 rounded-xl bg-brand hover:bg-brand-dark text-white"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save reply"}
                  </Button>
                </div>

                <div>
                  <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                    Set status
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selected.status === s ? "default" : "outline"}
                        onClick={() => updateStatus(selected.id, s)}
                        disabled={saving}
                        className="rounded-full"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
