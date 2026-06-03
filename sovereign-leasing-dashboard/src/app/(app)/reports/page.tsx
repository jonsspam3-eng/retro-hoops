import { MetricCard } from "@/components/metric-card";
import { getReportingSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const report = await getReportingSnapshot();

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Reporting & Analytics</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Inquiry volume, source performance, qualification ratio, and downstream conversion indicators.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total inquiries" value={report.totalInquiries} />
        <MetricCard label="Qualified lead %" value={`${report.qualifiedLeadPercentage}%`} />
        <MetricCard label="Showing conversion %" value={`${report.showingConversionRate}%`} />
        <MetricCard label="Application conversion %" value={`${report.applicationConversionRate}%`} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card">
          <h3 className="text-lg font-semibold">Inquiry source performance</h3>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(report.bySource).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between rounded-xl border border-[#ece8e3] px-3 py-2">
                <span>{source}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold">Listing qualification distribution</h3>
          <div className="mt-3 space-y-2 text-sm">
            {report.listingPerformance.map((listing) => (
              <div key={listing.listingId} className="rounded-xl border border-[#ece8e3] px-3 py-2">
                <p className="font-medium">{listing.listingLabel}</p>
                <p className="text-[#6d6f78]">
                  Inquiries: {listing.inquiries} · Qualified: {listing.qualifiedCount} · Rate: {listing.qualifiedRate}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
