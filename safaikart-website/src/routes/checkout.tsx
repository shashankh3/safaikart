import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { getFns, getDb } from "@/lib/firebase";
import { payWithRazorpay } from "@/lib/razorpay";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/context/auth-context";
import { validateCoupon } from "@/lib/coupons";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, CreditCard, MapPin, Tag, X } from "lucide-react";

const DELIVERY_FEE_MINOR = 4000;
const PINCODE_RE = /^\d{6}$/;

type SavedAddress = {
  id: string;
  label?: string;
  line1: string;
  city?: string;
  pincode?: string;
};

type PickupSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
};

function createAttemptKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isSlotBookable(slot: PickupSlot) {
  if (!slot.date || !slot.startTime) return false;
  if (slot.capacity - slot.bookedCount <= 0) return false;
  const [year, month, day] = slot.date.split("-").map(Number);
  const [hours, minutes] = slot.startTime.split(":").map(Number);
  if (![year, month, day, hours, minutes].every(Number.isFinite)) return false;
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const slotStartMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - istOffsetMs;
  return slotStartMs >= Date.now() + 2 * 60 * 60 * 1000;
}

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
  const [pendingCheckoutAfterAuth, setPendingCheckoutAfterAuth] = useState(false);

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ["addresses", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const db = getDb();
      const q = query(collection(db, "addresses"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedAddress);
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
      const slots = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          capacity: data.capacity || 0,
          bookedCount: data.bookedCount || 0,
        } as PickupSlot;
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
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountMinor: number } | null>(null);

  const discountMinor = appliedCoupon?.discountMinor || 0;
  const totalMinor = Math.max(0, cart.subtotalMinor - discountMinor) + DELIVERY_FEE_MINOR;
  const availableSlots = useMemo(() => pickupSlots.filter(isSlotBookable), [pickupSlots]);

  useEffect(() => {
    if (savedAddresses.length > 0 && selectedAddrId === "new" && !line1 && !city && !pincode) {
      setSelectedAddrId(savedAddresses[0].id);
    }
  }, [savedAddresses, selectedAddrId, line1, city, pincode]);

  useEffect(() => {
    if (!slot || availableSlots.some((s) => s.id === slot)) return;
    setSlot("");
  }, [availableSlots, slot]);

  useEffect(() => {
    if (!user || !pendingCheckoutAfterAuth) return;
    setPendingCheckoutAfterAuth(false);
    void placeOrder();
  }, [user, pendingCheckoutAfterAuth]);

  useEffect(() => {
    if (!appliedCoupon) return;
    if (cart.subtotalMinor <= 0) {
      removeCoupon();
      return;
    }
    void validateCoupon(appliedCoupon.code, cart.subtotalMinor).then((res) => {
      if (!res.ok) {
        removeCoupon();
        toast.error(res.error);
      } else if (res.discountMinor !== appliedCoupon.discountMinor) {
        setAppliedCoupon({ code: res.coupon.code, discountMinor: res.discountMinor });
      }
    });
  }, [cart.subtotalMinor, appliedCoupon?.code]);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    if (!user) {
      toast.error("Please sign in before applying a coupon.");
      return;
    }
    if (cart.subtotalMinor <= 0) {
      toast.error("Add fixed-price services before applying a coupon.");
      return;
    }
    setApplyingCoupon(true);
    const res = await validateCoupon(couponCode, cart.subtotalMinor);
    setApplyingCoupon(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setAppliedCoupon({ code: res.coupon.code, discountMinor: res.discountMinor });
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
    if (placing) return;
    if (!user) {
      setSignInOpen(true);
      return;
    }
    if (customer?.isBlocked) {
      toast.error("Your account is blocked. Please contact support.");
      return;
    }
    if (cart.items.length === 0) return toast.error("Cart is empty");

    let addressId = selectedAddrId;
    const selectedSlot = availableSlots.find((s) => s.id === slot);
    if (!selectedSlot) {
      return toast.error("Please select an available pickup slot");
    }

    if (addressId === "new") {
      const cleanLine1 = line1.trim();
      const cleanCity = city.trim();
      const cleanPincode = pincode.trim();
      if (!cleanLine1 || !cleanPincode || !cleanCity) {
        return toast.error("Please fill all delivery details");
      }
      if (!PINCODE_RE.test(cleanPincode)) {
        return toast.error("Please enter a valid 6-digit pincode");
      }
      try {
        const db = getDb();
        const docRef = await addDoc(collection(db, "addresses"), {
          userId: user.uid,
          label: "Home",
          line1: cleanLine1,
          city: cleanCity,
          pincode: cleanPincode,
          state: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addressId = docRef.id;
      } catch (err: any) {
        return toast.error("Failed to save address: " + err.message);
      }
    } else {
      const address = resolveAddress();
      if (!address.line1 || !PINCODE_RE.test(address.pincode || "")) {
        return toast.error("Selected address is incomplete. Please choose or add another address.");
      }
    }

    if (!addressId) {
      return toast.error("Please select an address and pickup slot");
    }

    setPlacing(true);
    try {
      const createOrderDraft = httpsCallable<
        Record<string, unknown>,
        { orderId: string, finalAmountMinor: number }
      >(getFns(), "createOrderDraft");

      const idempotencyKey = createAttemptKey();
      const { data: created } = await createOrderDraft({
        addressId,
        pickupSlotId: slot,
        couponCode: appliedCoupon?.code || null,
        notes: notes.trim() || null,
        idempotencyKey,
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
          customerName: customer?.name || user.displayName || "Customer",
          customerPhone: customer?.phone || user.phoneNumber || "",
          description: `SafaiKart order ${orderId.slice(0, 6).toUpperCase()}`,
        });

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
                      className={`p-3 rounded-xl border text-left text-sm ${selectedAddrId === a.id ? "border-brand bg-brand/5" : "border-brand/15"
                        }`}
                    >
                      <div className="font-medium">{a.label || "Address"}</div>
                      <div className="text-brand/60 text-xs mt-0.5 truncate">{a.line1}, {a.city} {a.pincode}</div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedAddrId("new")}
                    className={`p-3 rounded-xl border text-left text-sm border-dashed ${selectedAddrId === "new" ? "border-brand bg-brand/5" : "border-brand/20"
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
                  if (availableSlots.length === 0) {
                    return (
                      <div className="col-span-1 sm:col-span-2 p-4 rounded-xl border border-dashed border-brand/20 text-center text-sm text-brand/60">
                        {isError ? "Failed to load pickup slots." : "No pickup slots are available at the moment."}
                      </div>
                    );
                  }
                  return availableSlots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlot(s.id)}
                      className={`p-3 rounded-xl border text-left text-sm ${slot === s.id ? "border-brand bg-brand/5" : "border-brand/15"
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
                  <span className="font-medium">{appliedCoupon.code}</span>
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
            <div className="flex justify-between text-brand/70">
              <span>Pickup & delivery</span>
              <span>{formatINR(DELIVERY_FEE_MINOR)}</span>
            </div>
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
        onAuthed={() => {
          setPendingCheckoutAfterAuth(true);
          setSignInOpen(false);
        }}
      />

      <SiteFooter />
    </div>
  );
}
