import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate, toDate } from "@/lib/format";
import { Loader2, MessageSquare, Send, Search, Inbox as InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/_authenticated/inbox")({
  ssr: false,
  component: InboxPage,
});

type Message = {
  id: string;
  orderId?: string;
  userId?: string;
  fromAdmin?: boolean;
  authorName?: string;
  text?: string;
  createdAt?: unknown;
};

type Thread = {
  id: string;
  orderId: string;
  userId?: string;
  lastMessageText?: string;
  lastMessageTime?: unknown;
  unread: number;
};

const msgSchema = z.string().trim().min(1).max(1000);

function InboxPage() {
  const { admin } = useAuth();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(
      query(collection(db, "issues"), orderBy("createdAt", "desc")),
      (snap) => {
        setThreads(
          snap.docs.map(
            (d) => {
              const data = d.data();
              return { 
                id: d.id, 
                orderId: data.orderId || d.id, 
                userId: data.userId,
                lastMessageText: data.lastMessageText || data.subject || "Issue created",
                lastMessageTime: data.updatedAt || data.createdAt,
                unread: data.unreadCount || 0
              } as Thread;
            }
          ),
        );
      },
      () => setThreads([]),
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!search) return threads;
    const s = search.toLowerCase();
    return threads.filter(
      (t) =>
        t.orderId.toLowerCase().includes(s) ||
        (t.userId || "").toLowerCase().includes(s) ||
        (t.lastMessageText || "").toLowerCase().includes(s),
    );
  }, [threads, search]);

  useEffect(() => {
    if (!selected) {
      setThreadMessages([]);
      return;
    }
    const db = getDb();
    const unsub = onSnapshot(
      query(collection(db, `issues/${selected}/messages`), orderBy("createdAt", "asc")),
      (snap) => {
        setThreadMessages(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Message,
          ),
        );
      },
      () => setThreadMessages([]),
    );
    return unsub;
  }, [selected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [threadMessages]);

  async function send() {
    if (!selected) return;
    const parsed = msgSchema.safeParse(reply);
    if (!parsed.success) {
      toast.error("Message must be 1-1000 characters");
      return;
    }
    setSending(true);
    try {
      const userId = threads.find((t) => t.id === selected)?.userId;
      await addDoc(collection(getDb(), `issues/${selected}/messages`), {
        orderId: selected,
        userId: userId ?? null,
        fromAdmin: true,
        authorName: admin?.name ?? "Admin",
        authorUid: admin?.uid ?? null,
        text: parsed.data,
        createdAt: serverTimestamp(),
      });
      setReply("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  if (threads.length === 0 && !search) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading inbox…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[70vh]">
      <Card className="rounded-2xl shadow-card border-border/70 lg:col-span-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <InboxIcon className="h-5 w-5 text-brand" />
            <div className="font-semibold">Threads</div>
            <Badge variant="outline" className="ml-auto rounded-full">
              {threads.length}
            </Badge>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order id, customer…"
              className="pl-9 h-10 rounded-xl"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No conversations yet. Messages from customers will appear here.
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/40 transition ${
                  selected === t.id ? "bg-brand/5" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold">
                    {t.orderId.slice(0, 12)}…
                  </span>
                  {t.unread > 0 && (
                    <Badge className="ml-auto rounded-full bg-brand text-white text-[10px]">
                      {t.unread}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {t.lastMessageText || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {formatDate(t.lastMessageTime)}
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70 lg:col-span-2 overflow-hidden flex flex-col">
        {!selected ? (
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <div>Select a conversation to view messages.</div>
            </div>
          </CardContent>
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <div className="text-sm font-semibold">Issue {selected.slice(0, 16)}…</div>
              <div className="text-xs text-muted-foreground">{threadMessages.length} messages</div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
              {threadMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.fromAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      m.fromAdmin
                        ? "bg-brand text-white rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-0.5">
                      {m.fromAdmin ? m.authorName || "Admin" : "Customer"}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    <div className="text-[10px] opacity-60 mt-1">{formatDate(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply…"
                maxLength={1000}
                rows={2}
                className="rounded-xl resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button
                onClick={send}
                disabled={sending || !reply.trim()}
                className="h-auto rounded-xl bg-brand hover:bg-brand-dark text-white px-4"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
