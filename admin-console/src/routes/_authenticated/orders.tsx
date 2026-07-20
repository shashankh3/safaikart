import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  where,
  writeBatch,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getBucket, getDb } from "@/lib/firebase";
import { useOrdersStream } from "@/hooks/useOrdersStream";
import { adminUpdateOrderStatus, adminAssignDriver, adminSetOrderPhotos } from "@/lib/admin-callables";
import { generateInvoicePdf } from "@/lib/invoice";
import { OrderTimeline, slaBadge } from "@/components/order-timeline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDate,
  formatINR,
  ORDER_STATUSES,
  paymentStatusColor,
  statusColor,
  toDate,
} from "@/lib/format";
import {
  Loader2,
  Search,
  MapPin,
  CalendarClock,
  Package,
  User,
  Copy,
  Download,
  Radio,
  FileText,
  Bike,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { logOrderChange } from "@/lib/audit";
import { useDialogs } from "@/components/ui/dialog-provider";


export const Route = createFileRoute("/_authenticated/orders")({
  ssr: false,
  component: OrdersPage,
});

type OrderItem = {
  name?: string;
  serviceName?: string;
  quantity?: number;
  qty?: number;
  priceMinor?: number;
  unitPriceMinor?: number;
  addons?: Array<{ name?: string; priceMinor?: number }>;
};

type Order = {
  id: string;
  userId?: string;
  status?: string;
  paymentStatus?: string;
  finalAmountMinor?: number;
  currency?: string;
  addressSnapshot?: Record<string, unknown>;
  pickupSlotSnapshot?: Record<string, unknown>;
  items?: OrderItem[];
  createdAt?: unknown;
  driverId?: string;
  driverName?: string;
  refundedAt?: unknown;
  refundReason?: string;
  photos?: Array<{ url: string; path: string; kind?: string; uploadedAt?: unknown }>;
};

type Driver = { id: string; name: string; active?: boolean };

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function exportOrdersToCsv(orders: Order[]) {
  const headers = [
    "Order ID",
    "Created",
    "User ID",
    "Status",
    "Payment",
    "Items",
    "Amount (INR)",
    "Currency",
    "Customer Name",
    "Phone",
    "Address",
    "Pincode",
  ];
  const rows = orders.map((o) => {
    const addr = (o.addressSnapshot ?? {}) as Record<string, unknown>;
    const addressLine = [addr.line1, addr.line2, addr.city, addr.state]
      .filter(Boolean)
      .join(", ");
    const created = toDate(o.createdAt);
    return [
      o.id,
      created ? created.toISOString() : "",
      o.userId ?? "",
      o.status ?? "",
      o.paymentStatus ?? "",
      o.items?.length ?? 0,
      ((o.finalAmountMinor ?? 0) / 100).toFixed(2),
      o.currency ?? "INR",
      addr.name ?? "",
      addr.phone ?? "",
      addressLine,
      addr.pincode ?? addr.postalCode ?? "",
    ]
      .map(csvEscape)
      .join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `safaikart-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SavedView = { id: string; name: string; search: string; statusFilter: string };
const BUILTIN_VIEWS: SavedView[] = [
  { id: "all", name: "All", search: "", statusFilter: "ALL" },
  { id: "unpaid", name: "Unpaid", search: "pending", statusFilter: "ALL" },
  { id: "today-pickups", name: "Today's pickups", search: "", statusFilter: "PICKUP_SCHEDULED" },
  { id: "in-cleaning", name: "In cleaning", search: "", statusFilter: "CLEANING_IN_PROGRESS" },
  { id: "out-for-delivery", name: "Out for delivery", search: "", statusFilter: "OUT_FOR_DELIVERY" },
];

function OrdersPage() {
  const [limitCount, setLimitCount] = useState(200);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkDriver, setBulkDriver] = useState<string>("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeView, setActiveView] = useState<string>("all");
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("safaikart:orders:views");
      if (raw) setSavedViews(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persistViews = (views: SavedView[]) => {
    setSavedViews(views);
    try {
      localStorage.setItem("safaikart:orders:views", JSON.stringify(views));
    } catch {
      // ignore
    }
  };

  const applyView = (v: SavedView) => {
    setSearch(v.search);
    setStatusFilter(v.statusFilter);
    setActiveView(v.id);
  };

  const { confirm: confirmDialog, prompt: promptDialog } = useDialogs();

  const saveCurrentView = async () => {
    const name = await promptDialog({ title: "Name this view?" });
    if (!name) return;
    const view: SavedView = {
      id: `custom-${Date.now()}`,
      name,
      search,
      statusFilter,
    };
    persistViews([...savedViews, view]);
    setActiveView(view.id);
  };

  const deleteView = (id: string) => {
    persistViews(savedViews.filter((v) => v.id !== id));
    if (activeView === id) setActiveView("all");
  };

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(getDb(), "drivers"), where("active", "==", true)),
      (snap) => {
        setDrivers(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Driver),
        );
      },
      () => {
        // fallback: try without filter (in case field missing)
        getDocs(collection(getDb(), "drivers")).then((snap) => {
          setDrivers(
            snap.docs.map(
              (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Driver,
            ),
          );
        });
      },
    );
    return unsub;
  }, []);

  const { orders: rawOrdersRaw, loading: ordersLoading } = useOrdersStream({ limitCount });
  const rawOrders = ordersLoading ? null : rawOrdersRaw;

  // Real-time notifications
  useEffect(() => {
    if (!rawOrders) return;
    if (seenIds.current) {
      const newOnes = rawOrders.filter((o) => !seenIds.current!.has(o.id));
      if (newOnes.length > 0 && newOnes.length <= 5) {
        newOnes.forEach((o) =>
          toast.success("New order received", {
            description: `${o.id.slice(0, 10)}… · ${formatINR(o.finalAmountMinor, o.currency)}`,
          }),
        );
      } else if (newOnes.length > 5) {
        toast.success(`${newOnes.length} new orders received`);
      }
    }
    seenIds.current = new Set(rawOrders.map((o) => o.id));
  }, [rawOrders]);

  const filtered = useMemo(() => {
    if (!rawOrders) return [];
    const s = search.trim().toLowerCase();
    return rawOrders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (!s) return true;
      return (
        o.id.toLowerCase().includes(s) ||
        (o.userId || "").toLowerCase().includes(s) ||
        (o.status || "").toLowerCase().includes(s)
      );
    });
  }, [rawOrders, search, statusFilter]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((o) => next.delete(o.id));
      } else {
        filtered.forEach((o) => next.add(o.id));
      }
      return next;
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

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      const prev = rawOrders?.find((o) => o.id === id)?.status;
      // Route via callable — Firestore rules block direct order writes.
      await adminUpdateOrderStatus(id, status);
      void logOrderChange(id, "updated status", { from: prev, to: status });
      toast.success(`Order marked as ${status}`);
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  const assignDriver = async (id: string, driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    setUpdating(true);
    try {
      await adminAssignDriver(id, driverId, driver?.name);
      void logOrderChange(id, "assigned runner", { driverId, driverName: driver?.name });
      toast.success(`Assigned to ${driver?.name || "runner"}`);
      setSelected((prev) =>
        prev && prev.id === id ? { ...prev, driverId, driverName: driver?.name } : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setUpdating(false);
    }
  };

  const refundOrder = async (id: string) => {
    const reason = await promptDialog({ title: "Refund reason?", defaultValue: "Customer request" });
    if (reason === null) return;
    setUpdating(true);
    try {
      // Route via callable — server owns REFUNDED transition + payment state.
      await adminUpdateOrderStatus(id, "REFUNDED", { reason: reason || null });
      void logOrderChange(id, "refunded order", { reason });
      toast.success("Order refunded");
      setSelected((prev) =>
        prev && prev.id === id
          ? { ...prev, status: "REFUNDED", paymentStatus: "REFUNDED", refundReason: reason }
          : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setUpdating(false);
    }
  };

  const uploadPhoto = async (id: string, file: File, kind: "pickup" | "delivery") => {
    setUpdating(true);
    try {
      const path = `orders/${id}/${kind}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const r = storageRef(getBucket(), path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      const photo = { url, path, kind, uploadedAt: new Date().toISOString() };
      const currentPhotos = rawOrders?.find((o) => o.id === id)?.photos || [];
      const newPhotos = [...currentPhotos, photo];
      await adminSetOrderPhotos(id, newPhotos);
      void logOrderChange(id, `uploaded ${kind} photo`, { path });
      toast.success(`${kind} photo uploaded`);
      setSelected((prev) =>
        prev && prev.id === id
          ? { ...prev, photos: [...(prev.photos || []), photo] }
          : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUpdating(false);
    }
  };

  const removePhoto = async (id: string, photo: NonNullable<Order["photos"]>[number]) => {
    if (!(await confirmDialog({ title: "Remove this photo?", destructive: true }))) return;
    try {
      await updateDoc(doc(getDb(), "orders", id), {
        photos: arrayRemove(photo),
        updatedAt: serverTimestamp(),
      });
      try {
        await deleteObject(storageRef(getBucket(), photo.path));
      } catch {
        // ignore missing
      }
      setSelected((prev) =>
        prev && prev.id === id
          ? { ...prev, photos: (prev.photos || []).filter((p) => p.path !== photo.path) }
          : prev,
      );
      toast.success("Photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };





  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      const ids = Array.from(selectedIds);
      // Callable is per-order; fan out with limited concurrency.
      const results = await Promise.allSettled(
        ids.map((id) => adminUpdateOrderStatus(id, bulkStatus)),
      );
      const okIds: string[] = [];
      let failed = 0;
      results.forEach((r, i) => {
        if (r.status === "fulfilled") okIds.push(ids[i]);
        else failed += 1;
      });
      okIds.forEach((id) => {
        const prev = rawOrders?.find((o) => o.id === id)?.status;
        void logOrderChange(id, "bulk updated status", { from: prev, to: bulkStatus });
      });
      if (failed > 0) toast.error(`${failed} of ${ids.length} updates failed`);
      if (okIds.length > 0) toast.success(`Updated ${okIds.length} orders to ${bulkStatus}`);
      setSelectedIds(new Set());
      setBulkStatus("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBulkSaving(false);
    }
  };


  const applyBulkDriver = async () => {
    if (!bulkDriver || selectedIds.size === 0) return;
    const driver = drivers.find((d) => d.id === bulkDriver);
    setBulkSaving(true);
    try {
      const db = getDb();
      const ids = Array.from(selectedIds);
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        ids.slice(i, i + 400).forEach((id) =>
          batch.update(doc(db, "orders", id), {
            driverId: bulkDriver,
            driverName: driver?.name || null,
            updatedAt: serverTimestamp(),
          }),
        );
        await batch.commit();
      }
      ids.forEach((id) =>
        void logOrderChange(id, "bulk assigned runner", {
          driverId: bulkDriver,
          driverName: driver?.name,
        }),
      );
      toast.success(`Assigned ${ids.length} orders to ${driver?.name || "runner"}`);
      setSelectedIds(new Set());
      setBulkDriver("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk assign failed");
    } finally {
      setBulkSaving(false);
    }
  };

  const exportSelection = () => {
    if (!rawOrders) return;
    const rows =
      selectedIds.size > 0
        ? rawOrders.filter((o) => selectedIds.has(o.id))
        : filtered;
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    exportOrdersToCsv(rows);
    toast.success(`Exported ${rows.length} orders`);
  };

  const isLoading = rawOrders === null;

  const allViews = [...BUILTIN_VIEWS, ...savedViews];

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          {allViews.map((v) => {
            const active = activeView === v.id;
            const isCustom = v.id.startsWith("custom-");
            return (
              <div key={v.id} className="flex items-center">
                <button
                  onClick={() => applyView(v)}
                  className={`h-8 px-3 text-xs font-medium rounded-full border transition-colors ${
                    active
                      ? "bg-brand text-white border-brand"
                      : "bg-card border-border hover:bg-muted"
                  }`}
                >
                  {v.name}
                </button>
                {isCustom && active && (
                  <button
                    onClick={() => deleteView(v.id)}
                    className="ml-1 text-xs text-muted-foreground hover:text-rose-600"
                    title="Delete view"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={saveCurrentView}
            className="h-8 rounded-full text-xs"
          >
            + Save current
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order id, user id, or status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full md:w-56 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={exportSelection}
            className="h-11 rounded-xl gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
            <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            Live
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <Card className="rounded-2xl shadow-card border-brand/30 bg-brand/5">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="text-sm font-medium">
              {selectedIds.size} selected
            </div>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="h-10 w-full md:w-56 rounded-xl bg-card">
                <SelectValue placeholder="Set status to…" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={applyBulkStatus}
              disabled={!bulkStatus || bulkSaving}
              className="h-10 rounded-xl bg-brand hover:bg-brand-dark text-white"
            >
              {bulkSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
            <div className="hidden md:block h-6 w-px bg-border" />
            <Select value={bulkDriver} onValueChange={setBulkDriver}>
              <SelectTrigger className="h-10 w-full md:w-48 rounded-xl bg-card">
                <SelectValue placeholder="Assign runner…" />
              </SelectTrigger>
              <SelectContent>
                {drivers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No runners</div>
                ) : (
                  drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={applyBulkDriver}
              disabled={!bulkDriver || bulkSaving}
              variant="outline"
              className="h-10 rounded-xl gap-2"
            >
              <Bike className="h-4 w-4" /> Assign
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="h-10 rounded-xl"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              onClick={exportSelection}
              className="h-10 rounded-xl gap-2 md:ml-auto"
            >
              <Download className="h-4 w-4" /> Export selection
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading orders…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No orders found</h3>
              <p className="text-muted-foreground max-w-sm">We couldn't find any orders matching your current filters. Try adjusting your search criteria.</p>
              {search && (
                <Button variant="outline" onClick={() => setSearch("")} className="mt-4">
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="text-left px-5 py-3 font-medium">Order ID</th>
                    <th className="text-left px-5 py-3 font-medium">Created</th>
                    <th className="text-left px-5 py-3 font-medium">Items</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Payment</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const checked = selectedIds.has(o.id);
                    return (
                      <tr
                        key={o.id}
                        className={`border-t border-border hover:bg-muted/40 cursor-pointer transition-colors ${
                          checked ? "bg-brand/5" : ""
                        }`}
                        onClick={() => setSelected(o)}
                      >
                        <td
                          className="px-4 py-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOne(o.id);
                          }}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleOne(o.id)}
                            aria-label={`Select ${o.id}`}
                          />
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">{o.id.slice(0, 12)}…</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(o.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? "" : "s"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`${statusColor(o.status || "")} font-medium rounded-full`}
                            >
                              {o.status || "—"}
                            </Badge>
                            {(() => {
                              const sla = slaBadge(o.status, toDate(o.createdAt));
                              if (!sla) return null;
                              const tone =
                                sla.tone === "danger"
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : sla.tone === "warn"
                                  ? "bg-amber-100 text-amber-900 border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-200";
                              return (
                                <Badge
                                  variant="outline"
                                  className={`${tone} rounded-full font-mono text-[10px]`}
                                >
                                  {sla.label}
                                </Badge>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant="outline"
                            className={`${paymentStatusColor(o.paymentStatus || "")} font-medium rounded-full`}
                          >
                            {o.paymentStatus || "—"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                          {formatINR(o.finalAmountMinor, o.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rawOrders && rawOrders.length >= limitCount && (
                <div className="p-4 border-t border-border flex justify-center">
                  <Button variant="outline" onClick={() => setLimitCount(c => c + 200)} className="rounded-xl">
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <OrderDetailSheet
        order={selected}
        drivers={drivers}
        onOpenChange={(o) => !o && setSelected(null)}
        onStatusChange={(status) => selected && updateStatus(selected.id, status)}
        onAssignDriver={(driverId) => selected && assignDriver(selected.id, driverId)}
        onRefund={() => selected && refundOrder(selected.id)}
        onUploadPhoto={(file, kind) => selected && uploadPhoto(selected.id, file, kind)}
        onRemovePhoto={(photo) => selected && removePhoto(selected.id, photo)}
        updating={updating}
      />
    </div>
  );
}

function OrderDetailSheet({
  order,
  drivers,
  onOpenChange,
  onStatusChange,
  onAssignDriver,
  onRefund,
  onUploadPhoto,
  onRemovePhoto,
  updating,
}: {
  order: Order | null;
  drivers: Driver[];
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: string) => void;
  onAssignDriver: (driverId: string) => void;
  onRefund: () => void;
  onUploadPhoto: (file: File, kind: "pickup" | "delivery") => void;
  onRemovePhoto: (photo: NonNullable<Order["photos"]>[number]) => void;
  updating: boolean;
}) {
  const addr = (order?.addressSnapshot ?? {}) as Record<string, unknown>;
  const pickup = (order?.pickupSlotSnapshot ?? {}) as Record<string, unknown>;

  const addressLine = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.pincode ?? addr.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const pickupDate = toDate(pickup.date ?? pickup.startAt ?? pickup.start);
  const pickupWindow =
    pickup.window ||
    pickup.slot ||
    (pickup.startTime && pickup.endTime
      ? `${pickup.startTime} – ${pickup.endTime}`
      : undefined);

  return (
    <Sheet open={!!order} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {order && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="text-lg">Order details</SheetTitle>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(order.id);
                    toast.success("Order ID copied");
                  }}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {order.id} <Copy className="h-3 w-3" />
                </button>
              </div>
              <SheetDescription>
                Placed {formatDate(order.createdAt)}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge
                  variant="outline"
                  className={`${statusColor(order.status || "")} rounded-full font-medium`}
                >
                  {order.status || "—"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${paymentStatusColor(order.paymentStatus || "")} rounded-full font-medium`}
                >
                  Payment: {order.paymentStatus || "—"}
                </Badge>
              </div>
            </SheetHeader>

            <div className="px-6 py-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateInvoicePdf(order)}
                  className="rounded-xl gap-2"
                >
                  <FileText className="h-4 w-4" /> Download invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={onRefund}
                  disabled={updating || order.status === "REFUNDED"}
                  className="rounded-xl gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <Undo2 className="h-4 w-4" />
                  {order.status === "REFUNDED" ? "Refunded" : "Refund"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <section className="rounded-xl border border-border p-4 bg-muted/30">
                  <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                    Update Status
                  </div>
                  <Select value={order.status} onValueChange={onStatusChange} disabled={updating}>
                    <SelectTrigger className="h-11 rounded-xl bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                <section className="rounded-xl border border-border p-4 bg-muted/30">
                  <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5">
                    <Bike className="h-3.5 w-3.5" /> Assign Runner
                  </div>
                  <Select
                    value={order.driverId || ""}
                    onValueChange={onAssignDriver}
                    disabled={updating || drivers.length === 0}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-card">
                      <SelectValue
                        placeholder={drivers.length === 0 ? "No runners yet" : "Select runner"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {order.driverName && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Currently: <span className="font-medium text-foreground">{order.driverName}</span>
                    </div>
                  )}
                </section>
              </div>

              {updating && (
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </div>
              )}

              <OrderTimeline status={order.status} />

              <PhotoProof
                photos={order.photos || []}
                onUpload={onUploadPhoto}
                onRemove={onRemovePhoto}
                disabled={updating}
              />




              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoBlock icon={User} title="Customer">
                  <div className="text-sm font-mono break-all">{order.userId || "—"}</div>
                </InfoBlock>

                <InfoBlock icon={CalendarClock} title="Pickup slot">
                  <div className="text-sm">
                    {pickupDate ? formatDate(pickupDate) : "—"}
                  </div>
                  {pickupWindow ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      {String(pickupWindow)}
                    </div>
                  ) : null}
                </InfoBlock>

                <InfoBlock icon={MapPin} title="Delivery address" className="md:col-span-2">
                  <div className="text-sm">
                    {addr.name ? <div className="font-medium">{String(addr.name)}</div> : null}
                    {addr.phone ? (
                      <div className="text-xs text-muted-foreground">
                        {String(addr.phone)}
                      </div>
                    ) : null}
                    <div className="mt-1">{addressLine || "—"}</div>
                    {addr.landmark ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        Landmark: {String(addr.landmark)}
                      </div>
                    ) : null}
                  </div>
                </InfoBlock>
              </div>

              <section>
                <div className="flex items-center gap-2 text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-3">
                  <Package className="h-3.5 w-3.5" /> Items
                </div>
                <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                  {(order.items || []).length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No items.</div>
                  ) : (
                    (order.items || []).map((item, idx) => {
                      const price = item.priceMinor ?? item.unitPriceMinor ?? 0;
                      const qty = item.quantity ?? item.qty ?? 1;
                      return (
                        <div key={idx} className="flex items-start justify-between p-4 gap-4">
                          <div>
                            <div className="text-sm font-medium">
                              {item.name || item.serviceName || "Item"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Qty {qty} · {formatINR(price, order.currency)} each
                            </div>
                            {item.addons && item.addons.length > 0 && (
                              <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
                                {item.addons.map((a, i) => (
                                  <li key={i}>
                                    + {a.name || "Addon"}{" "}
                                    {a.priceMinor
                                      ? `(${formatINR(a.priceMinor, order.currency)})`
                                      : ""}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="text-sm font-semibold whitespace-nowrap">
                            {formatINR(price * qty, order.currency)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-xl bg-brand text-white p-5 shadow-elevated">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gold font-semibold">
                      Total
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {formatINR(order.finalAmountMinor, order.currency)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-white/70">
                    Currency: {order.currency || "INR"}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border p-4 bg-card ${className || ""}`}>
      <div className="flex items-center gap-2 text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

function PhotoProof({
  photos,
  onUpload,
  onRemove,
  disabled,
}: {
  photos: NonNullable<Order["photos"]>;
  onUpload: (file: File, kind: "pickup" | "delivery") => void;
  onRemove: (photo: NonNullable<Order["photos"]>[number]) => void;
  disabled?: boolean;
}) {
  const pickupInput = useRef<HTMLInputElement>(null);
  const deliveryInput = useRef<HTMLInputElement>(null);
  return (
    <section className="rounded-xl border border-border p-4 bg-card">
      <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-3">
        Photo proof
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          ref={pickupInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f, "pickup");
            e.target.value = "";
          }}
        />
        <input
          ref={deliveryInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f, "delivery");
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => pickupInput.current?.click()}
          disabled={disabled}
          className="rounded-xl"
        >
          + Pickup photo
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => deliveryInput.current?.click()}
          disabled={disabled}
          className="rounded-xl"
        >
          + Delivery photo
        </Button>
      </div>
      {photos.length === 0 ? (
        <div className="text-xs text-muted-foreground">No photos yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.path} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <a href={p.url} target="_blank" rel="noreferrer">
                <img src={p.url} alt={p.kind || "photo"} className="w-full h-full object-cover" />
              </a>
              {p.kind && (
                <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/70 text-white uppercase font-semibold">
                  {p.kind}
                </span>
              )}
              <button
                onClick={() => onRemove(p)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

