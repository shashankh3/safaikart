import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, MapPin } from "lucide-react";

export const Route = createFileRoute("/_customer/app/profile")({
  ssr: false,
  component: ProfilePage,
});

type Address = {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city?: string;
  pincode?: string;
  state?: string;
};

const PINCODE_RE = /^\d{6}$/;

function ProfilePage() {
  const { user, customer } = useAuth();
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [draft, setDraft] = useState<Address>({ id: "", label: "Home", line1: "", city: "", pincode: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setName(customer?.name || "");
    setPhone(customer?.phone || "");
  }, [customer?.name, customer?.phone]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let cancelled = false;
    async function loadAddresses() {
      setLoadingAddresses(true);
      try {
        const snap = await getDocs(query(collection(getDb(), "addresses"), where("userId", "==", uid)));
        if (cancelled) return;
        setAddresses(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Address, "id">) })),
        );
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load addresses");
      } finally {
        if (!cancelled) setLoadingAddresses(false);
      }
    }
    void loadAddresses();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    const displayName = name.trim() || "Customer";
    const cleanPhone = phone.trim();
    setSaving(true);
    try {
      await setDoc(
        doc(getDb(), "profiles", user.uid),
        {
          displayName,
          name: displayName,
          phoneNumber: cleanPhone || null,
          phone: cleanPhone || null,
          email: user.email || customer?.email || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function addAddress() {
    if (!user) return;
    const next = {
      label: draft.label?.trim() || "Address",
      line1: draft.line1.trim(),
      city: draft.city?.trim() || "",
      pincode: draft.pincode?.trim() || "",
      state: draft.state?.trim() || "",
    };
    if (!next.line1 || !next.city || !next.pincode) return toast.error("Address, city and pincode are required");
    if (!PINCODE_RE.test(next.pincode)) return toast.error("Enter a valid 6-digit pincode");
    try {
      const ref = await addDoc(collection(getDb(), "addresses"), {
        userId: user.uid,
        ...next,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAddresses((prev) => [...prev, { id: ref.id, ...next }]);
      setDraft({ id: "", label: "Home", line1: "", city: "", pincode: "" });
      setAdding(false);
      toast.success("Address added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save address");
    }
  }

  async function removeAddress(addressId: string) {
    setAddresses((prev) => prev.filter((x) => x.id !== addressId));
    try {
      await deleteDoc(doc(getDb(), "addresses", addressId));
      toast.success("Address removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete address");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="mt-6 max-w-md space-y-4 rounded-2xl border border-brand/10 bg-white p-6">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={customer?.email || ""} disabled />
        </div>
        <Button onClick={saveProfile} disabled={saving} className="w-full rounded-xl bg-brand text-gold hover:bg-brand/90">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="mt-8 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5" /> Saved addresses</h2>
          {!adding && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="rounded-xl border-brand/20">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>

        {loadingAddresses && (
          <div className="rounded-2xl border border-brand/10 bg-white p-6 text-sm text-brand/60 text-center">
            Loading addresses…
          </div>
        )}

        {!loadingAddresses && addresses.length === 0 && !adding && (
          <div className="rounded-2xl border border-dashed border-brand/20 bg-white p-6 text-sm text-brand/60 text-center">
            No addresses saved yet. Add one for faster checkout.
          </div>
        )}

        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border border-brand/10 bg-white p-4 flex items-start justify-between gap-3">
              <div className="text-sm">
                {a.label && <div className="font-medium">{a.label}</div>}
                <div className="text-brand/70">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</div>
                <div className="text-brand/60 text-xs mt-0.5">{a.city} {a.pincode}</div>
              </div>
              <button
                onClick={() => removeAddress(a.id)}
                className="text-brand/40 hover:text-red-600 transition"
                aria-label="Delete address"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {adding && (
          <div className="mt-3 rounded-2xl border border-brand/10 bg-white p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Label</Label>
                <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Home / Office" />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input value={draft.pincode} onChange={(e) => setDraft({ ...draft, pincode: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Address line</Label>
              <Input value={draft.line1} onChange={(e) => setDraft({ ...draft, line1: e.target.value })} placeholder="House / street" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={addAddress} className="rounded-xl bg-brand text-gold hover:bg-brand/90">Save address</Button>
              <Button variant="outline" onClick={() => setAdding(false)} className="rounded-xl border-brand/20">Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
