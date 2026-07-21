import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatINR } from "@/lib/format";
import { Loader2, Pencil, Plus, Trash2, Tag, Layers } from "lucide-react";
import { toast } from "sonner";
import { SERVICE_TYPES, GENDERS } from "@/lib/taxonomy";

export const Route = createFileRoute("/_authenticated/catalog")({
  ssr: false,
  component: CatalogPage,
});

type Category = { id: string; name?: string; iconName?: string };
type ServiceAddon = { name: string; priceMinor: number };
type Service = {
  id: string;
  categoryId?: string;
  name?: string;
  priceMinor?: number;
  unit?: string;
  priceType?: "fixed" | "variable" | string;
  addons?: ServiceAddon[];
  serviceType?: string;
  gender?: string;
};

async function loadCategories(): Promise<Category[]> {
  const db = getDb();
  const snap = await getDocs(query(collection(db, "categories"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Category[];
}
async function loadServices(): Promise<Service[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, "services"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Service[];
}

function CatalogPage() {
  return (
    <Tabs defaultValue="categories" className="space-y-4">
      <TabsList className="rounded-xl bg-muted">
        <TabsTrigger value="categories" className="rounded-lg data-[state=active]:bg-brand data-[state=active]:text-gold">
          <Layers className="h-4 w-4 mr-2" /> Categories
        </TabsTrigger>
        <TabsTrigger value="services" className="rounded-lg data-[state=active]:bg-brand data-[state=active]:text-gold">
          <Tag className="h-4 w-4 mr-2" /> Services
        </TabsTrigger>
      </TabsList>
      <TabsContent value="categories">
        <CategoriesPanel />
      </TabsContent>
      <TabsContent value="services">
        <ServicesPanel />
      </TabsContent>
    </Tabs>
  );
}

import { runSeed } from "@/seedScript";

function CategoriesPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["categories"], queryFn: loadCategories });
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (c: Category) => {
      const db = getDb();
      const payload = { name: c.name ?? "", iconName: c.iconName ?? "" };
      if (c.id) {
        await setDoc(doc(db, "categories", c.id), payload, { merge: true });
      } else {
        await addDoc(collection(db, "categories"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    },
    onSuccess: () => {
      toast.success("Category saved");
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(getDb(), "categories", id));
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <Card className="rounded-2xl shadow-card border-border/70">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Categories</div>
            <div className="text-xs text-muted-foreground">
              Top-level service groupings shown in the app.
            </div>
            {process.env.NODE_ENV === "development" && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={async () => {
                  if (!window.confirm("This will DELETE all existing services and categories and replace them with the JSON payload. Continue?")) return;
                  setSeeding(true);
                  try {
                    await runSeed();
                    toast.success("Seed completed!");
                    qc.invalidateQueries({ queryKey: ["categories"] });
                    qc.invalidateQueries({ queryKey: ["services"] });
                  } catch (e) {
                    toast.error("Seed failed: " + e);
                  }
                  setSeeding(false);
                }}
                disabled={seeding}
              >
                {seeding ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                Seed Catalog JSON
              </Button>
            )}
          </div>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="rounded-xl bg-brand text-gold hover:opacity-90"
                onClick={() => setEditing({ id: "", name: "", iconName: "" })}
              >
                <Plus className="h-4 w-4 mr-1" /> New category
              </Button>
            </DialogTrigger>
            <CategoryDialog
              value={editing}
              onChange={setEditing}
              onSave={() => editing && saveMutation.mutate(editing)}
              saving={saveMutation.isPending}
            />
          </Dialog>
        </div>

        {isLoading ? (
          <div className="p-6 flex items-center text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(data || []).map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border p-4 bg-card hover:shadow-card transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{c.name || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      icon: {c.iconName || "—"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDelete
                      title={`Delete "${c.name}"?`}
                      onConfirm={() => deleteMutation.mutate(c.id)}
                    />
                  </div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-3">{c.id}</div>
              </div>
            ))}
            {(!data || data.length === 0) && (
              <div className="col-span-full p-8 text-center text-muted-foreground text-sm">
                No categories yet. Create the first one.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryDialog({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: Category | null;
  onChange: (c: Category) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!value) return null;
  return (
    <DialogContent className="rounded-2xl sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{value.id ? "Edit category" : "New category"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={value.name ?? ""}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Icon name</Label>
          <Input
            value={value.iconName ?? ""}
            onChange={(e) => onChange({ ...value, iconName: e.target.value })}
            placeholder="e.g. shirt, hanger"
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSave} disabled={saving || !value.name} className="rounded-xl bg-brand text-gold hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ServicesPanel() {
  const qc = useQueryClient();
  const services = useQuery({ queryKey: ["services"], queryFn: loadServices });
  const categories = useQuery({ queryKey: ["categories"], queryFn: loadCategories });
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<string>("ALL");

  const catNameById = useMemo(() => {
    const m = new Map<string, string>();
    (categories.data || []).forEach((c) => m.set(c.id, c.name || c.id));
    return m;
  }, [categories.data]);

  const filtered = useMemo(() => {
    if (!services.data) return [];
    if (catFilter === "ALL") return services.data;
    return services.data.filter((s) => s.categoryId === catFilter);
  }, [services.data, catFilter]);

  const saveMutation = useMutation({
    mutationFn: async (s: Service) => {
      const db = getDb();
      const payload = {
        categoryId: s.categoryId ?? "",
        name: s.name ?? "",
        priceMinor: Number(s.priceMinor ?? 0),
        unit: s.unit ?? "",
        priceType: s.priceType ?? "fixed",
        serviceType: s.serviceType ?? "",
        gender: s.gender ?? "",
        addons: (s.addons || []).map((a) => ({
          name: a.name,
          priceMinor: Number(a.priceMinor ?? 0),
        })),
      };
      if (s.id) {
        await updateDoc(doc(db, "services", s.id), payload);
      } else {
        await addDoc(collection(db, "services"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    },
    onSuccess: () => {
      toast.success("Service saved");
      qc.invalidateQueries({ queryKey: ["services"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(getDb(), "services", id));
    },
    onSuccess: () => {
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <Card className="rounded-2xl shadow-card border-border/70">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Services</div>
            <div className="text-xs text-muted-foreground">
              Individual services with pricing and add-ons.
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="h-11 w-56 rounded-xl">
                <SelectValue placeholder="Filter category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {(categories.data || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="rounded-xl bg-brand text-gold hover:opacity-90"
                  onClick={() =>
                    setEditing({
                      id: "",
                      categoryId: catFilter !== "ALL" ? catFilter : "",
                      name: "",
                      priceMinor: 0,
                      unit: "piece",
                      priceType: "fixed",
                      addons: [],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> New service
                </Button>
              </DialogTrigger>
              <ServiceDialog
                value={editing}
                onChange={setEditing}
                categories={categories.data || []}
                onSave={() => editing && saveMutation.mutate(editing)}
                saving={saveMutation.isPending}
              />
            </Dialog>
          </div>
        </div>

        {services.isLoading ? (
          <div className="p-6 flex items-center text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Unit</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium">Add-ons</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{s.name || "Untitled"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {catNameById.get(s.categoryId || "") || s.categoryId || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {s.priceType || "fixed"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.unit || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatINR(s.priceMinor)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.addons?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditing({ ...s, addons: s.addons || [] });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDelete
                          title={`Delete "${s.name}"?`}
                          onConfirm={() => deleteMutation.mutate(s.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                      No services.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceDialog({
  value,
  onChange,
  categories,
  onSave,
  saving,
}: {
  value: Service | null;
  onChange: (s: Service) => void;
  categories: Category[];
  onSave: () => void;
  saving: boolean;
}) {
  if (!value) return null;
  const addons = value.addons || [];
  return (
    <DialogContent className="rounded-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{value.id ? "Edit service" : "New service"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={value.name ?? ""}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="rounded-xl h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={value.categoryId || ""}
              onValueChange={(v) => onChange({ ...value, categoryId: v })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Price type</Label>
            <Select
              value={value.priceType || "fixed"}
              onValueChange={(v) => onChange({ ...value, priceType: v })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="variable">Variable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Service type</Label>
            <Select
              value={value.serviceType || ""}
              onValueChange={(v) => onChange({ ...value, serviceType: v })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Auto-detect from name" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[10px] text-muted-foreground">
              Groups the item under Dry Cleaning / Steam Press / etc.
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gender / group</Label>
            <Select
              value={value.gender || ""}
              onValueChange={(v) => onChange({ ...value, gender: v })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Auto-detect from name" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[10px] text-muted-foreground">
              Men / Women / Kids / Unisex / Home.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Price (₹)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={(value.priceMinor ?? 0) / 100}
              onChange={(e) =>
                onChange({
                  ...value,
                  priceMinor: Math.round((Number(e.target.value) || 0) * 100),
                })
              }
              className="rounded-xl h-11"
            />
            <div className="text-[10px] text-muted-foreground">
              Stored as {value.priceMinor ?? 0} (minor units)
            </div>
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input
              value={value.unit ?? ""}
              onChange={(e) => onChange({ ...value, unit: e.target.value })}
              placeholder="piece, kg, pair"
              className="rounded-xl h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Add-ons</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() =>
                onChange({
                  ...value,
                  addons: [...addons, { name: "", priceMinor: 0 }],
                })
              }
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {addons.map((a, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={a.name}
                  onChange={(e) => {
                    const next = [...addons];
                    next[i] = { ...a, name: e.target.value };
                    onChange({ ...value, addons: next });
                  }}
                  placeholder="Add-on name"
                  className="rounded-xl h-10 flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={a.priceMinor / 100}
                  onChange={(e) => {
                    const next = [...addons];
                    next[i] = {
                      ...a,
                      priceMinor: Math.round((Number(e.target.value) || 0) * 100),
                    };
                    onChange({ ...value, addons: next });
                  }}
                  placeholder="Price"
                  className="rounded-xl h-10 w-28"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => {
                    const next = addons.filter((_, idx) => idx !== i);
                    onChange({ ...value, addons: next });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {addons.length === 0 && (
              <div className="text-xs text-muted-foreground">No add-ons.</div>
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={onSave}
          disabled={saving || !value.name || !value.categoryId}
          className="rounded-xl bg-brand text-gold hover:opacity-90"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ConfirmDelete({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl bg-destructive text-destructive-foreground hover:opacity-90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
