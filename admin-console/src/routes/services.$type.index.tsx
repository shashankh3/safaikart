import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import {
  GENDERS,
  SERVICE_TYPE_MAP,
  resolveServiceType,
  resolveGender,
  genderBlurb,
  type GenderKey,
  type ServiceTypeKey,
} from "@/lib/taxonomy";
import { ArrowLeft, ArrowRight, Plus, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/services/$type/")({
  ssr: false,
  head: ({ params }) => {
    const t = SERVICE_TYPE_MAP.get(params.type as ServiceTypeKey);
    const title = t ? `${t.name} — SafaiKart` : "Services — SafaiKart";
    return {
      meta: [
        { title },
        { name: "description", content: t?.tagline || "Book professional cleaning with SafaiKart." },
        { property: "og:title", content: title },
        { property: "og:description", content: t?.tagline || "Book professional cleaning with SafaiKart." },
      ],
    };
  },
  component: GenderPickerPage,
});

type Service = {
  id: string;
  name?: string;
  priceMinor?: number;
  unit?: string;
  categoryId?: string;
  serviceType?: string;
  gender?: string;
};
type Category = { id: string; name?: string; sortOrder?: number };

function GenderPickerPage() {
  const { type } = Route.useParams();
  const cart = useCart();
  const navigate = useNavigate();
  const serviceType = SERVICE_TYPE_MAP.get(type as ServiceTypeKey)!;

  const { data: services = [] } = useQuery({
    queryKey: ["public", "services", "all"],
    queryFn: async (): Promise<Service[]> => {
      const db = getDb();
      const snap = await getDocs(collection(db, "services"));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Service[];
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["public", "categories"],
    queryFn: async (): Promise<Category[]> => {
      const db = getDb();
      const snap = await getDocs(collection(db, "categories"));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Category[];
    },
  });

  const catNameById = new Map(categories.map((c) => [c.id, c.name || ""]));

  // Count matching services per gender for this service type
  const counts = new Map<GenderKey, number>();
  services.forEach((s) => {
    const catName = catNameById.get(s.categoryId || "") || s.categoryId || "";

    const stKey = resolveServiceType(s.serviceType, s.name || "", catName);
    if (stKey !== type) return;
    const gKey = resolveGender(s.gender, s.name || "", catName);
    counts.set(gKey, (counts.get(gKey) || 0) + 1);
  });

  const available = GENDERS.filter((g) => (counts.get(g.key) || 0) > 0);

  // Auto-forward to the single gender when the service type isn't gendered
  useEffect(() => {
    if (available.length === 1) {
      navigate({
        to: "/services/$type/$gender",
        params: { type, gender: available[0].key },
        replace: true,
      });
    }
  }, [available.length === 1 ? available[0]?.key : "", type, navigate]);

  // If gender split is meaningful, show the picker
  if (available.length > 1) {
    return (
      <div className="min-h-screen bg-white text-brand">
        <SiteHeader />
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-10">
          <button
            onClick={() => navigate({ to: "/services" })}
            className="inline-flex items-center text-sm text-brand/60 hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> All services
          </button>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{serviceType.name}</h1>
              <p className="text-brand/60 mt-1 text-sm sm:text-base">{serviceType.tagline}. Who is it for?</p>
            </div>
            <Link to="/cart" className="shrink-0">
              <Button variant="outline" className="rounded-xl bg-white dark:bg-white border-brand/30 text-brand hover:bg-brand/5 hover:text-brand">
                <ShoppingBag className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">View cart ({cart.count})</span>
                <span className="sm:hidden">{cart.count}</span>
              </Button>
            </Link>
          </div>


          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((g) => {
              const Icon = g.icon;
              const count = counts.get(g.key) || 0;
              return (
                <Link
                  key={g.key}
                  to="/services/$type/$gender"
                  params={{ type, gender: g.key }}
                  className="group rounded-2xl border border-brand/10 bg-white p-6 hover:border-brand/40 hover:shadow-elevated transition"
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand to-brand/80 grid place-items-center text-gold shadow-elevated">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div className="text-lg font-semibold text-brand">{g.name}</div>
                    {count > 0 && (
                      <span className="text-xs text-brand/50">{count} item{count === 1 ? "" : "s"}</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-brand/60">{genderBlurb(type, g.key)}</div>
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-brand group-hover:translate-x-0.5 transition">
                    Browse <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  // Fallback: no gender split → render items directly on this page
  const filtered = services.filter((s) => {
    const catName = catNameById.get(s.categoryId || "") || s.categoryId || "";
    return resolveServiceType(s.serviceType, s.name || "", catName) === type;
  });

  const orderedCategories = [...categories].sort((a, b) => {
    const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return (a.name || "").localeCompare(b.name || "");
  });

  const byCategory = new Map<string, Service[]>();
  orderedCategories.forEach((c) => byCategory.set(c.id, []));
  const uncategorised: Service[] = [];
  filtered.forEach((s) => {
    if (s.categoryId && byCategory.has(s.categoryId)) byCategory.get(s.categoryId)!.push(s);
    else uncategorised.push(s);
  });
  const sections = orderedCategories
    .map((c) => ({ key: c.id, name: c.name || "Untitled", items: byCategory.get(c.id) || [] }))
    .filter((s) => s.items.length > 0);
  if (uncategorised.length) sections.push({ key: "__other", name: "Other", items: uncategorised });

  return (
    <div className="min-h-screen bg-white text-brand">
      <SiteHeader />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
        <button
          onClick={() => navigate({ to: "/services" })}
          className="inline-flex items-center text-sm text-brand/60 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> All services
        </button>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-brand/50">Browse</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{serviceType.name}</h1>
            <p className="text-brand/60 mt-1 text-sm sm:text-base">{serviceType.tagline}.</p>
          </div>
          <Link to="/cart" className="shrink-0">
            <Button variant="outline" className="rounded-xl bg-white dark:bg-white border-brand/30 text-brand hover:bg-brand/5 hover:text-brand">
              <ShoppingBag className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">View cart ({cart.count})</span>
              <span className="sm:hidden">{cart.count}</span>
            </Button>
          </Link>
        </div>


        {filtered.length === 0 && (
          <div className="mt-16 text-center">
            <div className="text-brand/60">No items published yet for {serviceType.name}.</div>
            <Link to="/services" className="mt-3 inline-block text-sm text-brand hover:underline">
              ← Browse other services
            </Link>
          </div>
        )}

        {sections.map((section) => (
          <section key={section.key} className="mt-10">
            <h2 className="text-xl font-semibold mb-4">{section.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-brand/10 bg-white p-5 hover:border-brand/30 transition"
                >
                  <div className="text-base font-semibold">{s.name || "Service"}</div>
                  <div className="mt-1 text-sm text-brand/60">
                    {s.priceMinor != null
                      ? `${formatINR(s.priceMinor)}${s.unit ? ` / ${s.unit}` : ""}`
                      : "Contact for pricing"}
                  </div>
                  <Button
                    onClick={() => {
                      if (s.priceMinor == null) {
                        toast.error("Price not set for this service");
                        return;
                      }
                      cart.add({
                        serviceId: s.id,
                        name: s.name || "Service",
                        priceMinor: s.priceMinor,
                        unit: s.unit,
                      });
                      toast.success(`Added ${s.name || "item"} to cart`);
                    }}
                    className="mt-4 h-9 w-full rounded-lg bg-brand text-gold hover:bg-brand/90 font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Add to cart
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}
