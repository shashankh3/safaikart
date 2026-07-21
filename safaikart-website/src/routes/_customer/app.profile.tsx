import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
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
};

function ProfilePage() {
  const { user, customer } = useAuth();
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>(customer?.addresses || []);
  const [draft, setDraft] = useState<Address>({ id: "", label: "Home", line1: "", city: "", pincode: "" });
  const [adding, setAdding] = useState(false);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "customers", user.uid), { name, phone });
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function saveAddresses(next: Address[]) {
    if (!user) return;
    setAddresses(next);
    try {
      await updateDoc(doc(getDb(), "customers", user.uid), { addresses: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save address");
    }
  }

  async function addAddress() {
    if (!draft.line1 || !draft.pincode) return toast.error("Address line and pincode required");
    const next = [...addresses, { ...draft, id: crypto.randomUUID() }];
    await saveAddresses(next);
    setDraft({ id: "", label: "Home", line1: "", city: "", pincode: "" });
    setAdding(false);
    toast.success("Address added");
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

        {addresses.length === 0 && !adding && (
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
                onClick={() => saveAddresses(addresses.filter((x) => x.id !== a.id))}
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
