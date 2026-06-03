import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { getDashboardMetrics, isFallbackMode, listLeads, listListings } from "@/lib/repository";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [metrics, leads, listings] = await Promise.all([
    getDashboardMetrics(),
    listLeads(),
    listListings(),
  ]);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Leasing Operations Dashboard</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Centralized queue for inbound inquiries, qualification, and agent handoff.
        </p>
        {isFallbackMode() ? (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
            Running in fallback demo mode because DATABASE_URL is not configured or unavailable.
          </p>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="New inquiries" value={metrics.newInquiries} />
        <MetricCard label="Needs reply / info" value={metrics.needsReply} />
        <MetricCard label="Qualified" value={metrics.qualifiedLeads} />
        <MetricCard label="Follow-up queue" value={metrics.followUps} />
        <MetricCard label="Showing requested" value={metrics.showingRequested} />
        <MetricCard label="Application requested" value={metrics.applicationRequested} />
        <MetricCard label="Not qualified / archived" value={metrics.archived} />
        <MetricCard label="Active listings" value={listings.filter((listing) => listing.status === "ACTIVE").length} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Newest inquiries</h3>
            <Link href="/leads" className="text-sm font-medium text-[#0f2d93]">
              Manage all leads →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {leads.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between rounded-xl border border-[#ebe7e2] px-3 py-2 hover:bg-[#f8f6f3]"
              >
                <div>
                  <p className="font-medium">{lead.clientName}</p>
                  <p className="text-xs text-[#6d6f78]">{lead.source} · {lead.email}</p>
                </div>
                <StatusPill label={lead.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold">Active listings snapshot</h3>
          <div className="mt-3 space-y-2">
            {listings.slice(0, 5).map((listing) => (
              <div key={listing.id} className="rounded-xl border border-[#ebe7e2] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {listing.address} {listing.apartmentNumber}
                  </p>
                  <StatusPill label={listing.status} />
                </div>
                <p className="text-xs text-[#6d6f78]">
                  ${listing.rent.toLocaleString()} · {listing.beds} bed / {listing.baths} bath · {listing.neighborhood}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
