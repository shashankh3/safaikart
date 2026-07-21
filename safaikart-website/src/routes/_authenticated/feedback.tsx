import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, toDate } from "@/lib/format";
import { Star, TrendingUp, MessageSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/feedback")({
  ssr: false,
  component: FeedbackPage,
});

type Feedback = {
  id: string;
  orderId?: string;
  userId?: string;
  rating?: number; // 1-5
  npsScore?: number; // 0-10
  comment?: string;
  createdAt?: unknown;
};

function FeedbackPage() {
  const [items, setItems] = useState<Feedback[] | null>(null);

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Feedback),
        );
      },
      () => setItems([]),
    );
    return unsub;
  }, []);

  const stats = useMemo(() => {
    if (!items) return null;
    const rated = items.filter((f) => typeof f.rating === "number");
    const avg = rated.length ? rated.reduce((s, f) => s + (f.rating || 0), 0) / rated.length : 0;

    const nps = items.filter((f) => typeof f.npsScore === "number");
    let promoters = 0, detractors = 0;
    nps.forEach((f) => {
      const s = f.npsScore!;
      if (s >= 9) promoters++;
      else if (s <= 6) detractors++;
    });
    const npsValue = nps.length ? ((promoters - detractors) / nps.length) * 100 : 0;

    const dist = [1, 2, 3, 4, 5].map((r) => rated.filter((f) => f.rating === r).length);
    return { avg, npsValue, promoters, detractors, count: rated.length, dist };
  }, [items]);

  if (!items || !stats) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading reviews…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl shadow-card border-border/70 md:col-span-2 bg-brand text-white border-brand">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-wider text-gold font-semibold mb-2">Avg rating</div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold">{stats.avg.toFixed(1)}</div>
              <div className="text-lg text-white/70">/ 5.0</div>
            </div>
            <div className="flex gap-0.5 mt-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-6 w-6 ${n <= Math.round(stats.avg) ? "fill-gold text-gold" : "text-white/25"}`}
                />
              ))}
            </div>
            <div className="text-xs text-white/60 mt-3">{stats.count} responses</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                NPS
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{stats.npsValue.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.promoters} promoters · {stats.detractors} detractors
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Distribution
            </div>
            {[5, 4, 3, 2, 1].map((r) => {
              const count = stats.dist[r - 1];
              const pct = stats.count ? (count / stats.count) * 100 : 0;
              return (
                <div key={r} className="flex items-center gap-2 text-xs mb-1">
                  <span className="w-3">{r}</span>
                  <Star className="h-3 w-3 text-gold fill-gold" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No feedback yet. Feedback documents in the <code className="text-xs">reviews</code> collection will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((f) => (
                <div key={f.id} className="p-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {typeof f.rating === "number" && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${n <= f.rating! ? "fill-gold text-gold" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                    )}
                    {typeof f.npsScore === "number" && (
                      <Badge variant="outline" className="rounded-full text-xs">
                        NPS {f.npsScore}
                      </Badge>
                    )}
                    {f.orderId && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {f.orderId.slice(0, 10)}…
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDate(toDate(f.createdAt))}
                    </span>
                  </div>
                  {f.comment && <div className="text-sm mt-2">{f.comment}</div>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


