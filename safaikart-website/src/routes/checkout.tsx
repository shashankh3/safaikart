import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { collection, query, where, getDocs, orderBy, addDoc } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { getFns, getDb } from "@/lib/firebase";
import { payWithRazorpay } from "@/lib/razorpay";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/context/auth-context";
import { validateCoupon, type Coupon } from "@/lib/coupons";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, CreditCard, Wallet, MapPin, Tag, X, Check } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({ meta: [{ title: "Checkout — SafaiKart" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const cart = useCart();
  const { user, customer } = useAuth();
  const navigate = useNavigate();

  const [selectedAddrId, setSelectedAddrId] = useState<string>("new");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ["addresses", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const db = getDb();
      const q = query(collection(db, "addresses"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    },
    enabled: !!user,
  });

  const { data: pickupSlots = [], isError } = useQuery({
    queryKey: ["pickupSlots"],
    queryFn: async () => {
      const db = getDb();
      // Remove orderBy from query to avoid requiring a composite index, sort in JS instead
      const q = query(collection(db, "pickupSlots"), where("isActive", "==", true));
      const snap = await getDocs(q);
      const slots = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          capacity: data.capacity || 0,
          bookedCount: data.bookedCount || 0,
        };
      });
      // Sort by date then startTime
      slots.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
      return slots;
    }
  });

  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discountMinor: number } | null>(null);

  const discountMinor = appliedCoupon?.discountMinor || 0;
  const totalMinor = Math.max(0, cart.subtotalMinor - discountMinor);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    const res = await validateCoupon(couponCode, cart.subtotalMinor);
    setApplyingCoupon(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setAppliedCoupon({ coupon: res.coupon, discountMinor: res.discountMinor });
    toast.success(`Applied ${res.coupon.code} — saved ${formatINR(res.discountMinor)}`);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
  }

  function resolveAddress() {
    if (selectedAddrId !== "new") {
      const saved = savedAddresses.find((a) => a.id === selectedAddrId);
      if (saved) return { line1: saved.line1, city: saved.city || "", pincode: saved.pincode || "" };
    }
    return { line1, city, pincode };
  }

  async function placeOrder() {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    if (cart.items.length === 0) return toast.error("Cart is empty");
    
    let addressId = selectedAddrId;
    
    if (addressId === "new") {
      if (!line1 || !pincode || !city) {
         return toast.error("Please fill all delivery details");
      }
      try {
        const db = getDb();
        const docRef = await addDoc(collection(db, "addresses"), {
          userId: user.uid,
          line1,
          city,
          pincode,
          state: "State" // Default or input
        });
        addressId = docRef.id;
      } catch (err: any) {
        return toast.error("Failed to save address: " + err.message);
      }
    }

    if (!addressId || !slot) {
      return toast.error("Please select an address and pickup slot");
    }

    setPlacing(true);
    try {
      const createOrderDraft = httpsCallable<
        Record<string, unknown>,
        { orderId: string, finalAmountMinor: number }
      >(getFns(), "createOrderDraft");
      
      const { data: created } = await createOrderDraft({
        addressId,
        pickupSlotId: slot,
        couponCode: appliedCoupon?.coupon.code || null,
        notes,
        directItems: cart.items.map((i) => ({
          serviceId: i.serviceId,
          quantity: i.quantity,
        })),
      });
      const orderId = created.orderId;
      cart.clear();

      try {
        const createPayment = httpsCallable<any, any>(getFns(), "createPaymentOrder");
        const { data: paymentRes } = await createPayment({ orderId });
        
        await payWithRazorpay({
          orderId,
          razorpayOrderId: paymentRes.razorpayOrderId,
          razorpayKeyId: paymentRes.razorpayKeyId,
          amountMinor: paymentRes.amountMinor,
          customerName: user.displayName || "Customer",
          customerPhone: user.phoneNumber || "+919999999999",
          description: `SafaiKart order ${orderId.slice(0, 6).toUpperCase()}`,
        });
        
        const verifyPayment = httpsCallable<any, any>(getFns(), "verifyPaymentStatus");
        await verifyPayment({ orderId });
        
        toast.success("Payment successful!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Payment failed — you can retry from order details");
      }

      navigate({ to: "/app/orders/$id", params: { id: orderId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  const usingSaved = selectedAddrId !== "new" && savedAddresses.some((a) => a.id === selectedAddrId);

  return (
    <div className="min-h-screen bg-white text-brand">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>

          <div className="mt-6 space-y-4">

            {savedAddresses.length > 0 && (
              <div>
                <Label className="mb-2 block flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Saved addresses</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {savedAddresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAddrId(a.id)}
                      className={`p-3 rounded-xl border text-left text-sm ${
                        selectedAddrId === a.id ? "border-brand bg-brand/5" : "border-brand/15"
                      }`}
                    >
                      <div className="font-medium">{a.label || "Address"}</div>
                      <div className="text-brand/60 text-xs mt-0.5 truncate">{a.line1}, {a.city} {a.pincode}</div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedAddrId("new")}
                    className={`p-3 rounded-xl border text-left text-sm border-dashed ${
                      selectedAddrId === "new" ? "border-brand bg-brand/5" : "border-brand/20"
                    }`}
                  >
                    <div className="font-medium">+ Use a new address</div>
                    <div className="text-brand/60 text-xs mt-0.5">Enter delivery details below</div>
                  </button>
                </div>
              </div>
            )}

            {!usingSaved && (
              <>
                <div>
                  <Label>Address line</Label>
                  <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="House / street" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>City</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input value={pincode} onChange={(e) => setPincode(e.target.value)} />
                  </div>
                </div>
                {user && (
                  <div className="text-xs text-brand/60">
                    Tip: save addresses to your <Link to="/app/profile" className="underline">profile</Link> for faster checkout.
                  </div>
                )}
              </>
            )}

            <div>
              <Label className="mb-2 block flex items-center gap-1.5">Preferred pickup slot</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(() => {
                  const availableSlots = pickupSlots.filter((s: any) => s.capacity - s.bookedCount > 0);
                  if (availableSlots.length === 0) {
                    return (
                      <div className="col-span-1 sm:col-span-2 p-4 rounded-xl border border-dashed border-brand/20 text-center text-sm text-brand/60">
                        {isError ? "Failed to load pickup slots." : "No pickup slots are available at the moment."}
                      </div>
                    );
                  }
                  return availableSlots.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlot(s.id)}
                      className={`p-3 rounded-xl border text-left text-sm ${
                        slot === s.id ? "border-brand bg-brand/5" : "border-brand/15"
                      }`}
                    >
                      <div className="font-medium">{new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                      <div className="text-brand/60 text-xs mt-0.5">{s.startTime} - {s.endTime}</div>
                    </button>
                  ));
                })()}
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            <div>
              <Label className="mb-2 block">Payment method</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="p-4 rounded-xl border text-left border-brand bg-brand/5"
                >
                  <div className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4" /> UPI / Card (Razorpay)</div>
                  <div className="text-xs text-brand/60 mt-1">Pay online securely</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-brand/10 bg-brand/5 p-5 h-fit sticky top-20">
          <div className="font-semibold">Order summary</div>
          <div className="mt-3 space-y-2 text-sm">
            {cart.items.map((it) => (
              <div key={it.serviceId} className="flex justify-between">
                <span className="text-brand/70">{it.name} × {it.quantity}</span>
                <span>{formatINR(it.priceMinor * it.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-brand/10">
            {!appliedCoupon ? (
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5"><Tag className="h-3.5 w-3.5" /> Coupon code</Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FIRST10"
                    className="h-9 uppercase"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                  />
                  <Button
                    type="button"
                    onClick={applyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="h-9 rounded-lg bg-brand text-gold hover:bg-brand/90 font-semibold disabled:bg-brand/40 disabled:text-gold/70 disabled:opacity-100"
                  >
                    {applyingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                  </Button>

                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <Check className="h-4 w-4" /> <span className="font-medium">{appliedCoupon.coupon.code}</span>
                  <span className="text-emerald-700/80 text-xs">− {formatINR(appliedCoupon.discountMinor)}</span>
                </div>
                <button onClick={removeCoupon} className="text-emerald-800/60 hover:text-emerald-900" aria-label="Remove coupon">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between text-brand/70">
              <span>Subtotal</span>
              <span>{formatINR(cart.subtotalMinor)}</span>
            </div>
            {discountMinor > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>− {formatINR(discountMinor)}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-brand/10 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatINR(totalMinor)}</span>
          </div>
          <Button
            onClick={placeOrder}
            disabled={placing || cart.items.length === 0}
            className="mt-4 w-full h-12 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold"
          >
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : user ? "Place order" : "Sign in to place order"}
          </Button>
        </aside>
      </div>

      <SignInModal
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onAuthed={() => placeOrder()}
      />

      <SiteFooter />
    </div>
  );
}
