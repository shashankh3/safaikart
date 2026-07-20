import { createFileRoute, Link, Outlet, notFound } from "@tanstack/react-router";
import { SERVICE_TYPE_MAP, type ServiceTypeKey } from "@/lib/taxonomy";

export const Route = createFileRoute("/services/$type")({
  ssr: false,
  parseParams: (p) => {
    const type = p.type as ServiceTypeKey;
    if (!SERVICE_TYPE_MAP.has(type)) throw notFound();
    return { type };
  },
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-white text-brand">
      <div className="text-center">
        <div className="text-lg font-semibold">Service not found</div>
        <Link to="/services" className="text-sm text-brand/60 hover:text-brand">← Back to services</Link>
      </div>
    </div>
  ),
});
