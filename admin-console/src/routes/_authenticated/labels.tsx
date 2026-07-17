import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, formatINR } from "@/lib/format";
import { Loader2, Printer, QrCode, Search } from "lucide-react";
import QRCode from "qrcode";
import logoAsset from "@/assets/safaikart-logo.jpeg.asset.json";

export const Route = createFileRoute("/_authenticated/labels")({
  ssr: false,
  component: LabelsPage,
});

type Order = {
  id: string;
  status?: string;
  finalAmountMinor?: number;
  currency?: string;
  createdAt?: unknown;
  items?: Array<{ name?: string; serviceName?: string; quantity?: number; qty?: number }>;
  addressSnapshot?: Record<string, unknown>;
};

function LabelsPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(getDb(), "orders"), orderBy("createdAt", "desc"), limit(200)),
      (snap) => {
        setOrders(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order),
        );
      },
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const s = search.trim().toLowerCase();
    return orders.filter(
      (o) =>
        !s ||
        o.id.toLowerCase().includes(s) ||
        (o.status || "").toLowerCase().includes(s),
    );
  }, [orders, search]);

  const selectedOrders = useMemo(
    () => (orders || []).filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds],
  );

  useEffect(() => {
    (async () => {
      const next: Record<string, string> = { ...qrMap };
      for (const o of selectedOrders) {
        if (next[o.id]) continue;
        try {
          next[o.id] = await QRCode.toDataURL(o.id, { margin: 1, width: 220 });
        } catch {
          // ignore
        }
      }
      setQrMap(next);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [selectedOrders]);

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (filtered.every((o) => prev.has(o.id))) return new Set();
      return new Set(filtered.map((o) => o.id));
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; inset: 0; padding: 8mm; }
          .label-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders to label…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {selectedIds.size} selected
          </div>
          <Button
            onClick={handlePrint}
            disabled={selectedIds.size === 0}
            className="h-11 rounded-xl gap-2 bg-brand hover:bg-brand-dark text-white"
          >
            <Printer className="h-4 w-4" /> Print labels
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <QrCode className="h-4 w-4 text-brand" />
              <div className="text-sm font-semibold">Select orders</div>
              <Button
                size="sm"
                variant="outline"
                onClick={toggleAll}
                className="ml-auto rounded-lg"
              >
                {filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id))
                  ? "Clear"
                  : "Select all"}
              </Button>
            </div>
            {orders === null ? (
              <div className="p-16 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                {filtered.map((o) => {
                  const checked = selectedIds.has(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`flex items-center gap-3 px-5 py-3 border-t border-border cursor-pointer hover:bg-muted/40 ${
                        checked ? "bg-brand/5" : ""
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleOne(o.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs truncate">{o.id}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(o.createdAt)} · {o.status || "—"}
                        </div>
                      </div>
                      <div className="text-sm font-semibold whitespace-nowrap">
                        {formatINR(o.finalAmountMinor, o.currency)}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 px-1">
            Preview · {selectedOrders.length} labels
          </div>
          <div className="print-area grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedOrders.length === 0 ? (
              <Card className="rounded-2xl shadow-card border-dashed border-2 border-border/60 col-span-full">
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  Pick orders on the left to generate garment bag labels.
                </CardContent>
              </Card>
            ) : (
              selectedOrders.map((o) => {
                const addr = (o.addressSnapshot ?? {}) as Record<string, unknown>;
                const itemCount = (o.items || []).reduce(
                  (s, it) => s + (it.quantity ?? it.qty ?? 1),
                  0,
                );
                return (
                  <div
                    ref={printRef}
                    key={o.id}
                    className="label-card rounded-xl border-2 border-brand bg-white text-black p-3 flex gap-3"
                  >
                    <div className="shrink-0">
                      {qrMap[o.id] ? (
                        <img src={qrMap[o.id]} alt={o.id} className="h-24 w-24" />
                      ) : (
                        <div className="h-24 w-24 bg-muted grid place-items-center">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <img
                          src={logoAsset.url}
                          alt="SafaiKart"
                          className="h-4 w-4 rounded"
                        />
                        <div className="text-[10px] font-bold tracking-wider text-brand">
                          SAFAIKART
                        </div>
                      </div>
                      <div className="font-mono text-[10px] break-all leading-tight">
                        {o.id}
                      </div>
                      <div className="mt-1.5 text-sm font-semibold truncate">
                        {String(addr.name ?? "—")}
                      </div>
                      <div className="text-[11px] leading-tight text-neutral-700">
                        {[addr.line1, addr.city].filter(Boolean).join(", ") || "—"}
                      </div>
                      <div className="text-[11px] text-neutral-700">
                        PIN {String(addr.pincode ?? addr.postalCode ?? "—")} ·{" "}
                        {String(addr.phone ?? "—")}
                      </div>
                      <div className="mt-1.5 text-[11px] font-semibold">
                        {itemCount} item{itemCount === 1 ? "" : "s"} · {o.status || "—"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
