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
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDate } from "@/lib/format";
import { Megaphone, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/broadcasts")({
  ssr: false,
  component: BroadcastsPage,
});

type Broadcast = {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | "VIP" | "NEW" | "CHURNED";
  channel: "IN_APP" | "PUSH" | "BOTH";
  createdAt?: unknown;
  sentAt?: unknown;
  status: "SENT" | "DRAFT";
};

function BroadcastsPage() {
  const [list, setList] = useState<Broadcast[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Broadcast["audience"]>("ALL");
  const [channel, setChannel] = useState<Broadcast["channel"]>("IN_APP");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setList(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Broadcast),
      );
    });
    return unsub;
  }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(getDb(), "broadcasts"), {
        title: title.trim(),
        body: body.trim(),
        audience,
        channel,
        status: "SENT",
        createdAt: serverTimestamp(),
        sentAt: serverTimestamp(),
      });
      toast.success("Broadcast queued");
      setTitle("");
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this broadcast?")) return;
    try {
      await deleteDoc(doc(getDb(), "broadcasts", id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="h-4 w-4 text-brand" /> New broadcast
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Monsoon offer — 20% off dry-cleaning"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Book your first pickup this week and save 20%…"
              rows={3}
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Broadcast["audience"])}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All customers</SelectItem>
                  <SelectItem value="VIP">VIP (5+ orders)</SelectItem>
                  <SelectItem value="NEW">New (0-1 orders)</SelectItem>
                  <SelectItem value="CHURNED">Churned (30d+ inactive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Broadcast["channel"])}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_APP">In-app banner</SelectItem>
                  <SelectItem value="PUSH">Push (FCM)</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={send}
              disabled={sending}
              className="h-11 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send broadcast
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-0">
          {list === null ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : list.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">No broadcasts yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {list.map((b) => (
                <div key={b.id} className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gold/20 text-brand flex items-center justify-center shrink-0">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm">{b.title}</div>
                      <Badge variant="outline" className="rounded-full text-xs">
                        {b.audience}
                      </Badge>
                      <Badge variant="outline" className="rounded-full text-xs bg-brand/5 text-brand border-brand/20">
                        {b.channel}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{b.body}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Sent {formatDate(b.sentAt || b.createdAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(b.id)}
                    className="rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
