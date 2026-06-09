import { createLeadAction } from "@/lib/actions";
import { inquirySources, leadStatuses } from "@/lib/types";
import { listLeads, listListings } from "@/lib/repository";
import { StatusPill } from "@/components/status-pill";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatIso(value?: string | null) {
  if (!value) return "N/A";
  return value.replace("T", " ").slice(0, 16);
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; source?: string; listingId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [leads, listings] = await Promise.all([
    listLeads({
      status: params.status as any,
      source: params.source,
      listingId: params.listingId,
    }),
    listListings(),
  ]);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Leads & Inquiry Capture</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Manual intake plus Gmail Phase 2 import workflow is available for inquiry ingestion and review.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href="/gmail-import" className="inline-flex rounded-lg bg-[#050b23] px-3 py-2 text-sm text-white hover:bg-[#111f4a]">
            Open Gmail import dashboard
          </a>
          <a href="/pipeline" className="inline-flex rounded-lg bg-[#ddbda2] px-3 py-2 text-sm font-medium text-[#050b23] hover:bg-[#d4ae8d]">
            Open Follow-Up pipeline
          </a>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="card overflow-x-auto">
          <form className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4" method="get">
            <select name="status" defaultValue={params.status ?? ""}>
              <option value="">All statuses</option>
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select name="source" defaultValue={params.source ?? ""}>
              <option value="">All sources</option>
              {inquirySources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            <select name="listingId" defaultValue={params.listingId ?? ""}>
              <option value="">All listings</option>
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.address} {listing.apartmentNumber}
                </option>
              ))}
            </select>
            <button type="submit">Apply filters</button>
          </form>

          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#6d6f78]">
                <th className="pb-2">Lead</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Listing</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Score</th>
                <th className="pb-2">Received</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const listing = listings.find((item) => item.id === lead.listingId);
                return (
                  <tr key={lead.id} className="border-t border-[#ece8e3]">
                    <td className="py-2">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-[#0f2d93] hover:underline">
                        {lead.clientName}
                      </Link>
                      <p className="text-xs text-[#6d6f78]">{lead.email}</p>
                    </td>
                    <td className="py-2">{lead.source}</td>
                    <td className="py-2">{listing ? `${listing.address} ${listing.apartmentNumber}` : "Unmatched"}</td>
                    <td className="py-2">
                      <StatusPill label={lead.status} />
                    </td>
                    <td className="py-2">{lead.score ?? "-"}</td>
                    <td className="py-2">{formatIso(lead.receivedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <form action={createLeadAction} className="card space-y-3">
          <h3 className="text-lg font-semibold">Add inquiry manually</h3>
          <input name="clientName" placeholder="Client name" required />
          <input name="email" type="email" placeholder="Email" required />
          <select name="source" defaultValue="MANUAL">
            {inquirySources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select name="listingId" defaultValue="">
            <option value="">Unmatched listing</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.address} {listing.apartmentNumber}
              </option>
            ))}
          </select>
          <textarea name="inquiryMessage" rows={6} placeholder="Inquiry message" required />
          <button type="submit">Create lead record</button>
        </form>
      </section>
    </div>
  );
}
