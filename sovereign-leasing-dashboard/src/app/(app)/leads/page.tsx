import { createLeadAction } from "@/lib/actions";
import { inquirySources, leadStatuses, type LeadStatus } from "@/lib/types";
import { countLeadsByStatus, listListings, queryLeads } from "@/lib/repository";
import { countForView, getLeadView, leadViews } from "@/lib/lead-views";
import { formatDateTime, formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { LeadsFilterBar } from "@/components/leads-filter-bar";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import clsx from "clsx";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function scoreClass(score?: number | null): string {
  if (score == null) return "text-muted";
  if (score >= 70) return "text-emerald-700";
  if (score >= 40) return "text-amber-700";
  return "text-rose-700";
}

function viewHref(slug: string, params: { q?: string; source?: string; listingId?: string }): string {
  const search = new URLSearchParams();
  if (slug !== "all") search.set("view", slug);
  if (params.q) search.set("q", params.q);
  if (params.source) search.set("source", params.source);
  if (params.listingId) search.set("listingId", params.listingId);
  const qs = search.toString();
  return qs ? `/leads?${qs}` : "/leads";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string;
    status?: string;
    source?: string;
    listingId?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const view = getLeadView(params.view);
  const explicitStatus = leadStatuses.includes(params.status as LeadStatus)
    ? (params.status as LeadStatus)
    : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [result, listings, statusCounts] = await Promise.all([
    queryLeads({
      statuses: explicitStatus ? [explicitStatus] : view.statuses,
      source: params.source,
      listingId: params.listingId,
      search: params.q,
      page,
      pageSize: PAGE_SIZE,
    }),
    listListings(),
    countLeadsByStatus(),
  ]);
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const hasFilters = Boolean(params.q || params.source || params.listingId || explicitStatus);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        description="Every inquiry from Gmail import and manual intake, organized into working views for fast triage."
        actions={
          <>
            <Link
              href="/gmail-import"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-[#111f4a]"
            >
              Import from Gmail
            </Link>
            <Link
              href="/pipeline"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-ink transition hover:bg-[#d2ab89]"
            >
              Open pipeline
            </Link>
          </>
        }
      >
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3" role="tablist" aria-label="Lead views">
          {leadViews.map((item) => {
            const active = item.slug === view.slug && !explicitStatus;
            return (
              <Link
                key={item.slug}
                href={viewHref(item.slug, params)}
                role="tab"
                aria-selected={active}
                title={item.description}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-ink text-white shadow-sm"
                    : "border border-line bg-white text-ink hover:border-ink/25 hover:bg-ink/5",
                )}
              >
                {item.label}
                <span
                  className={clsx(
                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                    active ? "bg-white/20" : "bg-ink/8 text-muted",
                  )}
                >
                  {countForView(item, statusCounts)}
                </span>
              </Link>
            );
          })}
        </div>
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="card">
          <LeadsFilterBar
            statusOptions={leadStatuses.map((status) => ({ value: status, label: status.replaceAll("_", " ") }))}
            sourceOptions={inquirySources.map((source) => ({ value: source, label: source.replaceAll("_", " ") }))}
            listingOptions={listings.map((listing) => ({
              value: listing.id,
              label: `${listing.address} ${listing.apartmentNumber}`,
            }))}
          />

          {result.leads.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title={hasFilters ? "No leads match these filters" : `No leads in “${view.label}” yet`}
                description={
                  hasFilters
                    ? "Try clearing the search or filters, or switch to a different view."
                    : "New inquiries land here automatically after Gmail import, or add one manually."
                }
                action={
                  hasFilters ? (
                    <Link
                      href={viewHref(view.slug, {})}
                      className="inline-flex rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-[#f4efe8]"
                    >
                      Clear filters
                    </Link>
                  ) : (
                    <Link
                      href="/gmail-import"
                      className="inline-flex rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-[#111f4a]"
                    >
                      Import from Gmail
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-head">Lead</th>
                    <th className="table-head">Source</th>
                    <th className="table-head">Listing</th>
                    <th className="table-head">Status</th>
                    <th className="table-head">Score</th>
                    <th className="table-head">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {result.leads.map((lead) => {
                    const listing = lead.listingId ? listingById.get(lead.listingId) : undefined;
                    return (
                      <tr key={lead.id} className="border-t border-line/80 transition hover:bg-[#faf7f3]">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/30 text-xs font-bold text-ink">
                              {initialsOf(lead.clientName)}
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={`/leads/${lead.id}`}
                                className="block truncate font-semibold text-ink hover:text-[#0f2d93] hover:underline"
                              >
                                {lead.clientName}
                              </Link>
                              <p className="truncate text-xs text-muted">{lead.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="rounded-md bg-ink/5 px-2 py-0.5 text-xs font-medium text-muted">
                            {lead.source.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="max-w-[180px] truncate py-2.5 pr-3 text-sm">
                          {listing ? (
                            `${listing.address} ${listing.apartmentNumber}`
                          ) : (
                            <span className="text-muted">Unmatched</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusPill label={lead.status} />
                        </td>
                        <td className={clsx("py-2.5 pr-3 font-semibold tabular-nums", scoreClass(lead.score))}>
                          {lead.score ?? "—"}
                        </td>
                        <td className="whitespace-nowrap py-2.5 text-muted" title={formatDateTime(lead.receivedAt)}>
                          {formatRelative(lead.receivedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            basePath="/leads"
            params={{
              view: view.slug === "all" ? undefined : view.slug,
              status: explicitStatus,
              source: params.source,
              listingId: params.listingId,
              q: params.q,
            }}
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
          />
        </div>

        <form action={createLeadAction} className="card h-fit space-y-3">
          <div>
            <h3 className="text-base font-semibold">Add inquiry manually</h3>
            <p className="mt-0.5 text-xs text-muted">For walk-ins, phone calls, and referrals.</p>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
            Client name
            <input name="clientName" placeholder="Jane Doe" required className="mt-1 font-normal normal-case" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
            Email
            <input name="email" type="email" placeholder="jane@email.com" required className="mt-1 font-normal normal-case" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
            Source
            <select name="source" defaultValue="MANUAL" className="mt-1 font-normal normal-case">
              {inquirySources.map((source) => (
                <option key={source} value={source}>
                  {source.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
            Listing
            <select name="listingId" defaultValue="" className="mt-1 font-normal normal-case">
              <option value="">Unmatched listing</option>
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.address} {listing.apartmentNumber}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
            Inquiry message
            <textarea
              name="inquiryMessage"
              rows={5}
              placeholder="What is the client looking for?"
              required
              className="mt-1 font-normal normal-case"
            />
          </label>
          <SubmitButton className="w-full" pendingLabel="Creating…">
            Create lead record
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
