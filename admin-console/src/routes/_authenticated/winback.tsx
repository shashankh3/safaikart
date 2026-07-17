import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR, toDate } from "@/lib/format";
import { Loader2, Megaphone, Sparkles, UserMinus, UserCheck, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { computeTags, type CustomerTag } from "@/lib/tags";

export const Route = createFileRoute("/_authenticated/winback")({
  ssr: false,
  component: WinbackPage,
});

type Profile = { id: string; name?: string; phoneNumber?: string; email?: string };
type Order = { id: string; userId?: string; finalAmountMinor?: number; createdAt?: unknown };
type Complaint = { id: string; userId?: string };

const schema = z.object({
  segment: z.enum(["vip", "at-risk", "new", "complainer"]),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(500),
});

const SEG_META: Record<CustomerTag, { label: string; icon: React.ComponentType<{ className?: string }>; hint: string }> = {
  vip: { label: "VIP customers", icon: Sparkles, hint: ">10 orders lifetime" },
  "at-risk": { label: "At-risk", icon: UserMinus, hint: "45+ days inactive" },
  new: { label: "New", icon: UserCheck, hint: "Joined <7 days ago" },
  complainer: { label: "Complainers", icon: AlertOctagon, hint: "≥1 open complaint" },
};

function WinbackPage() {
  const { admin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [segment, setSegment] = useState<CustomerTag>("at-risk");
  const [title, setTitle] = useState("We miss you at SafaiKart");
  const [message, setMessage] = useState("Enjoy 20% off your next pickup. Use code WELCOME20.");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const db = getDb();
      const [p, o, c] = await Promise.all([
        getDocs(query(collection(db, "profile"))),
        getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "complaints"))),
      ]);
      setProfiles(p.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Profile));
      setOrders(o.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order));
      setComplaints(c.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Complaint));
    })().catch(() => setProfiles([]));
  }, []);

  const targets = useMemo(() => {
    if (!profiles) return [];
    return profiles
      .map((p) => {
        const userOrders = orders.filter((o) => o.userId === p.id);
        const userComplaints = complaints.filter((c) => c.userId === p.id);
        const tags = computeTags({
          createdAt: toDate((p as unknown as { createdAt?: unknown }).createdAt),
          orderCount: userOrders.length,
          lastOrderAt: userOrders[0] ? toDate(userOrders[0].createdAt) : null,
          complaintCount: userComplaints.length,
        });
        const lifetime = userOrders.reduce((s, o) => s + (o.finalAmountMinor || 0), 0);
        return { profile: p, tags, orders: userOrders.length, lifetime };
      })
      .filter((t) => t.tags.includes(segment));
  }, [profiles, orders, complaints, segment]);

  async function send() {
    const parsed = schema.safeParse({ segment, title, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid campaign");
      return;
    }
    if (targets.length === 0) {
      toast.error("No matching customers");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(getDb(), "broadcasts"), {
        title: parsed.data.title,
        message: parsed.data.message,
        segment: parsed.data.segment,
        audienceCount: targets.length,
        audienceUids: targets.slice(0, 500).map((t) => t.profile.id),
        kind: "winback",
        createdAt: serverTimestamp(),
        createdBy: admin?.uid ?? null,
      });
      toast.success(`Campaign queued for ${targets.length} customers`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  const SegIcon = SEG_META[segment].icon;

  if (profiles === null) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading customers…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card className="rounded-2xl shadow-card border-border/70 lg:col-span-1">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand" />
            <div>
              <div className="font-semibold">New win-back campaign</div>
              <div className="text-xs text-muted-foreground">Broadcast to a smart segment</div>
            </div>
          </div>

          <div>
            <Label>Segment</Label>
            <Select value={segment} onValueChange={(v) => setSegment(v as CustomerTag)}>
              <SelectTrigger className="h-11 rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SEG_META) as CustomerTag[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SEG_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mt-1">{SEG_META[segment].hint}</div>
          </div>

          <div>
            <Label>Title</Label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="h-11 rounded-xl mt-1 w-full border border-input bg-background px-3 text-sm"
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="rounded-xl mt-1"
            />
            <div className="text-xs text-muted-foreground mt-1">{message.length}/500</div>
          </div>

          <div className="p-3 rounded-xl bg-brand/5 border border-brand/20">
            <div className="text-xs uppercase tracking-wider text-brand font-semibold flex items-center gap-2">
              <SegIcon className="h-3.5 w-3.5" /> Reach
            </div>
            <div className="text-2xl font-bold mt-1">{targets.length}</div>
            <div className="text-xs text-muted-foreground">matching customers</div>
          </div>

          <Button
            onClick={send}
            disabled={sending || targets.length === 0}
            className="h-11 w-full rounded-xl bg-brand hover:bg-brand-dark text-white gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            Launch campaign
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70 lg:col-span-2 overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5 border-b border-border">
            <div className="text-sm font-semibold">Audience preview</div>
            <div className="text-xs text-muted-foreground">
              First {Math.min(targets.length, 100)} of {targets.length} customers
            </div>
          </div>
          {targets.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              No customers match this segment.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[560px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-left px-5 py-3 font-medium">Phone</th>
                    <th className="text-right px-5 py-3 font-medium">Orders</th>
                    <th className="text-right px-5 py-3 font-medium">Lifetime</th>
                    <th className="text-left px-5 py-3 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.slice(0, 100).map((t) => (
                    <tr key={t.profile.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="font-medium">{t.profile.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{t.profile.email || "—"}</div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {t.profile.phoneNumber || "—"}
                      </td>
                      <td className="px-5 py-3 text-right">{t.orders}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatINR(t.lifetime)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {t.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="rounded-full text-[10px] capitalize"
                            >
                              {tag}
                            </Badge>
                          ))}
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
    </div>
  );
}
