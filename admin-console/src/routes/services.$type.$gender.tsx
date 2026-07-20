import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { ArrowLeft, Plus, ShoppingBag } from "lucide-react";
import {
  GENDER_MAP,
  SERVICE_TYPE_MAP,
  matchesGender,
  resolveServiceType,
  resolveGender,
  type GenderKey,
  type ServiceTypeKey,
} from "@/lib/taxonomy";
import { Suspense } from "react";

export const Route = createFileRoute("/services/$type/$gender")({
  ssr: false,
  parseParams: (p) => {
    const gender = p.gender as GenderKey;
    if (!GENDER_MAP.has(gender)) throw notFound();
    return { gender };
  },
  head: ({ params }) => {
    const t = SERVICE_TYPE_MAP.get(params.type as ServiceTypeKey);
    const g = GENDER_MAP.get(params.gender as GenderKey);
    const title = t && g ? `${t.name} for ${g.name} — SafaiKart` : "Services — SafaiKart";
    const desc = t && g ? `${t.name} pricing and items for ${g.name.toLowerCase()}.` : "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: () => (
    <Suspense fallback={<div className="p-20 text-center text-brand/50">Loading services...</div>}>
      <ItemsPage />
    </Suspense>
  ),
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

function ItemsPage() {
  const { type, gender } = Route.useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const serviceType = SERVICE_TYPE_MAP.get(type as ServiceTypeKey)!;
  const genderDef = GENDER_MAP.get(gender as GenderKey)!;

  const { data: services = [] } = useSuspenseQuery({
    queryKey: ["public", "services", "all"],
    queryFn: async (): Promise<Service[]> => {
      const db = getDb();
      const snap = await getDocs(collection(db, "services"));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Service[];
    },
  });
  const { data: categories = [] } = useSuspenseQuery({
    queryKey: ["public", "categories"],
    queryFn: async (): Promise<Category[]> => {
      const db = getDb();
      const snap = await getDocs(collection(db, "categories"));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Category[];
    },
  });

  const catNameById = new Map(categories.map((c) => [c.id, c.name || ""]));

  const filtered = services.filter((s) => {
    const catName = catNameById.get(s.categoryId || "") || s.categoryId || "";
    return (
      resolveServiceType(s.serviceType, s.name || "", catName) === type &&
      matchesGender(gender as GenderKey, s.gender, s.name || "", catName)
    );
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
          onClick={() => {
            const gendersForThisType = new Set<string>();
            services.forEach(s => {
              const catName = catNameById.get(s.categoryId || "") || s.categoryId || "";
              if (resolveServiceType(s.serviceType, s.name || "", catName) === type) {
                gendersForThisType.add(resolveGender(s.gender, s.name || "", catName));
              }
            });
            if (gendersForThisType.size <= 1) {
              navigate({ to: "/services" });
            } else {
              navigate({ to: "/services/$type", params: { type } });
            }
          }}
          className="inline-flex items-center text-sm text-brand/60 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {(() => {
            const gendersForThisType = new Set<string>();
            services.forEach(s => {
              const catName = catNameById.get(s.categoryId || "") || s.categoryId || "";
              if (resolveServiceType(s.serviceType, s.name || "", catName) === type) {
                gendersForThisType.add(resolveGender(s.gender, s.name || "", catName));
              }
            });
            return gendersForThisType.size <= 1 ? "All Services" : serviceType.name;
          })()}
        </button>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-brand/50">{serviceType.name}</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">For {genderDef.name}</h1>
            <p className="text-brand/60 mt-1 text-sm sm:text-base">Add items and schedule a pickup at checkout.</p>
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
            <div className="text-brand/60">No items yet for {serviceType.name} · {genderDef.name}.</div>
            <Link to="/services/$type" params={{ type }} className="mt-3 inline-block text-sm text-brand hover:underline">
              ← Try a different category
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
