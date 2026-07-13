import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatRelative } from "@/lib/format";
import { countLeadsByStatus, isFallbackMode, listListings, queryLeads } from "@/lib/repository";
import Link from "next/link";

export const dynamic = "force-dynamic";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function DashboardPage() {
  const [counts, recent, listings] = await Promise.all([
    countLeadsByStatus(),
    queryLeads({ pageSize: 5 }),
    listListings(),
  ]);

  const activeListings = listings.filter((listing) => listing.status === "ACTIVE");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leasing Operations Dashboard"
        description="Centralized queue for inbound inquiries, qualification, and agent handoff."
        actions={
          <>
            <Link
              href="/pipeline"
              className="inline-flex items-center rounded-lg bg-accent px-3 py-2 text-sm font-medium text-ink transition hover:bg-[#d2ab89]"
            >
              Open pipeline
            </Link>
            <Link
              href="/gmail-import"
              className="inline-flex items-center rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-[#111f4a]"
            >
              Import from Gmail
            </Link>
          </>
        }
      >
        {isFallbackMode() ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Running in fallback demo mode because DATABASE_URL is not configured or unavailable.
          </p>
        ) : null}
      </PageHeader>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="New inquiries"
          value={counts.NEW + counts.IMPORTED}
          helper="Awaiting first triage"
          href="/leads?view=new-leads"
        />
        <MetricCard
          label="Needs attention"
          value={counts.NEEDS_REPLY + counts.NEEDS_MORE_INFO + counts.NEEDS_REVIEW + counts.DRAFT_CREATED}
          helper="Reply, review, or missing info"
          href="/leads?view=needs-attention"
        />
        <MetricCard
          label="Qualified"
          value={counts.QUALIFIED + counts.POSSIBLY_QUALIFIED}
          helper="Ready for showings"
          href="/leads?view=qualified"
        />
        <MetricCard
          label="Follow-up queue"
          value={counts.FOLLOW_UP + counts.FOLLOW_UP_NEEDED}
          helper="Active cadences"
          href="/leads?view=follow-ups"
        />
        <MetricCard
          label="Showings requested"
          value={counts.SHOWING_REQUESTED}
          helper="Scheduling in progress"
          href="/leads?view=showings"
        />
        <MetricCard
          label="Applications requested"
          value={counts.APPLICATION_REQUESTED}
          helper="Instructions sent"
          href="/leads?view=showings"
        />
        <MetricCard
          label="Archived / not qualified"
          value={counts.ARCHIVED + counts.NOT_QUALIFIED}
          helper="Closed out"
          href="/leads?view=archived"
        />
        <MetricCard label="Active listings" value={activeListings.length} helper="Available inventory" href="/listings" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Newest inquiries</h3>
            <Link href="/leads" className="text-sm font-medium text-[#0f2d93] hover:underline">
              Manage all leads →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recent.leads.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
                No inquiries yet. Import from Gmail to get started.
              </p>
            ) : (
              recent.leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line/80 px-3 py-2.5 transition hover:border-accent hover:bg-[#faf7f3]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/30 text-xs font-bold text-ink">
                      {initialsOf(lead.clientName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{lead.clientName}</p>
                      <p className="truncate text-xs text-muted">
                        {lead.source.replaceAll("_", " ")} · {formatRelative(lead.receivedAt)}
                      </p>
                    </div>
                  </div>
                  <StatusPill label={lead.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Active listings snapshot</h3>
            <Link href="/listings" className="text-sm font-medium text-[#0f2d93] hover:underline">
              View inventory →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {listings.slice(0, 5).map((listing) => (
              <div key={listing.id} className="rounded-xl border border-line/80 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">
                    {listing.address} {listing.apartmentNumber}
                  </p>
                  <StatusPill label={listing.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {formatCurrency(listing.rent)}/mo · {listing.beds} bed / {listing.baths} bath · {listing.neighborhood}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
