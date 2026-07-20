import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getBucket, getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { useDialogs } from "@/components/ui/dialog-provider";

export const Route = createFileRoute("/_authenticated/banners")({
  ssr: false,
  component: BannersPage,
});

type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imagePath?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: unknown;
};

const EMPTY = {
  title: "",
  subtitle: "",
  imageUrl: "",
  imagePath: "",
  ctaLabel: "",
  ctaUrl: "",
  active: true,
  sortOrder: 0,
};

function BannersPage() {
  const [items, setItems] = useState<Banner[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { confirm } = useDialogs();

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "banners"), orderBy("sortOrder", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Banner),
        );
      },
      () => setItems([]),
    );
    return unsub;
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft(EMPTY);
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setDraft({
      title: b.title,
      subtitle: b.subtitle || "",
      imageUrl: b.imageUrl || "",
      imagePath: b.imagePath || "",
      ctaLabel: b.ctaLabel || "",
      ctaUrl: b.ctaUrl || "",
      active: b.active,
      sortOrder: b.sortOrder || 0,
    });
    setOpen(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const path = `banners/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const ref = storageRef(getBucket(), path);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      setDraft((d) => ({ ...d, imageUrl: url, imagePath: path }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, updatedAt: serverTimestamp() };
      const db = getDb();
      if (editing) {
        await updateDoc(doc(db, "banners", editing.id), payload);
        toast.success("Banner updated");
      } else {
        await addDoc(collection(db, "banners"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Banner created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Banner) => {
    if (!(await confirm({ title: "Delete this banner?", destructive: true }))) return;
    try {
      await deleteDoc(doc(getDb(), "banners", b.id));
      if (b.imagePath) {
        try {
          await deleteObject(storageRef(getBucket(), b.imagePath));
        } catch {
          // ignore
        }
      }
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggle = async (b: Banner) => {
    try {
      await updateDoc(doc(getDb(), "banners", b.id), {
        active: !b.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const isLoading = items === null;

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Home-screen banners</div>
            <div className="text-xs text-muted-foreground">
              These render on the mobile app in <code>sortOrder</code> ascending.
            </div>
          </div>
          <Button onClick={openNew} className="h-10 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="h-4 w-4" /> New banner
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-16 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading banners…
          </CardContent>
        </Card>
      ) : items!.length === 0 ? (
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-16 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No banners yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items!.map((b) => (
            <Card key={b.id} className="rounded-2xl shadow-card border-border/70 overflow-hidden">
              <div className="aspect-[16/7] bg-muted relative">
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    b.active ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"
                  }`}>
                    {b.active ? "Live" : "Paused"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full font-semibold bg-black/60 text-white">
                    #{b.sortOrder}
                  </span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="font-semibold">{b.title}</div>
                {b.subtitle && (
                  <div className="text-sm text-muted-foreground mt-0.5">{b.subtitle}</div>
                )}
                {b.ctaLabel && (
                  <div className="text-xs text-brand font-medium mt-2">
                    CTA: {b.ctaLabel} → {b.ctaUrl || "—"}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">{formatDate(b.createdAt)}</div>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => toggle(b)} className="rounded-lg">
                    {b.active ? "Pause" : "Enable"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="rounded-lg">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(b)}
                    className="rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 ml-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit banner" : "New banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Banner image</Label>
              {draft.imageUrl ? (
                <div className="relative aspect-[16/7] rounded-xl overflow-hidden border border-border">
                  <img src={draft.imageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/7] rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-40" />
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="rounded-xl gap-2 w-full"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {draft.imageUrl ? "Replace image" : "Upload image"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Monsoon offer — 20% off"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                rows={2}
                placeholder="Free pickup this week only"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA label</Label>
                <Input
                  value={draft.ctaLabel}
                  onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                  placeholder="Book now"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA URL / deep link</Label>
                <Input
                  value={draft.ctaUrl}
                  onChange={(e) => setDraft({ ...draft, ctaUrl: e.target.value })}
                  placeholder="safaikart://services"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center justify-between rounded-xl border border-border p-3 w-full">
                  <Label>Active</Label>
                  <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || uploading} className="rounded-xl bg-brand hover:bg-brand-dark text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
