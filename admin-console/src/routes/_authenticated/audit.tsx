import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { History, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit")({
  ssr: false,
  component: AuditPage,
});

type Log = {
  id: string;
  orderId?: string;
  action?: string;
  actorEmail?: string;
  actorUid?: string;
  details?: Record<string, unknown>;
  createdAt?: unknown;
};

function AuditPage() {
  const [logs, setLogs] = useState<Log[] | null>(null);

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "orderLogs"), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(
      q,
      (snap) =>
        setLogs(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Log),
        ),
      () => setLogs([]),
    );
  }, []);

  const isLoading = logs === null;

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex items-center gap-2">
          <History className="h-5 w-5 text-brand" />
          <div>
            <div className="font-semibold">Activity & Audit Log</div>
            <div className="text-xs text-muted-foreground">
              Every order status change, by whom and when
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              No activity yet. Change an order status to see it here.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l) => {
                const from = String(l.details?.from ?? "");
                const to = String(l.details?.to ?? "");
                return (
                  <li key={l.id} className="p-4 md:p-5 flex items-start gap-4 hover:bg-muted/40">
                    <div className="h-9 w-9 rounded-full bg-brand/10 grid place-items-center text-brand shrink-0">
                      <History className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{l.actorEmail || "Someone"}</span>{" "}
                        <span className="text-muted-foreground">{l.action || "changed"}</span>{" "}
                        <span className="font-mono text-xs bg-muted rounded px-1 py-0.5">
                          {(l.orderId || "").slice(0, 12)}…
                        </span>
                      </div>
                      {(from || to) && (
                        <div className="mt-1 text-xs flex items-center gap-2 flex-wrap">
                          {from && (
                            <Badge variant="outline" className="rounded-full">
                              {from}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">→</span>
                          {to && (
                            <Badge
                              variant="outline"
                              className="rounded-full bg-brand/10 text-brand border-brand/30"
                            >
                              {to}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(l.createdAt)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
