import { createRuleAction } from "@/lib/actions";
import { listListings, listQualificationRules } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const [rules, listings] = await Promise.all([listQualificationRules(), listListings()]);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Qualification Rule Engine</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Rules are configurable globally or by listing. Score explanations are stored for auditability.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        <div className="card space-y-3">
          {rules.map((rule) => (
            <article key={rule.id} className="rounded-xl border border-[#ece8e3] p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{rule.name}</h3>
                <span className="rounded-full bg-[#f2ebe4] px-2 py-1 text-xs">Weight {rule.weight}</span>
              </div>
              <p className="mt-1 text-sm text-[#5e6070]">{rule.description}</p>
              <p className="mt-2 text-xs text-[#6d6f78]">
                Scope: {rule.listingId ? listings.find((listing) => listing.id === rule.listingId)?.address ?? rule.listingId : "Global"}
              </p>
              <pre className="mt-2 overflow-auto rounded-lg bg-[#f8f6f3] p-2 text-xs">{JSON.stringify(rule.criteria, null, 2)}</pre>
            </article>
          ))}
        </div>

        <form action={createRuleAction} className="card space-y-3">
          <h3 className="text-lg font-semibold">Create rule</h3>
          <input name="name" placeholder="Rule name" required />
          <textarea name="description" rows={3} placeholder="Description" required />
          <input name="weight" type="number" min={1} max={100} placeholder="Weight" defaultValue={10} required />
          <select name="listingId" defaultValue="">
            <option value="">Global rule</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.address} {listing.apartmentNumber}
              </option>
            ))}
          </select>
          <textarea
            name="criteria"
            rows={8}
            defaultValue={JSON.stringify({ incomeMultiple: 40, guarantorMultiple: 80, moveInWindowDays: 60 }, null, 2)}
            required
          />
          <button type="submit">Save rule</button>
        </form>
      </section>
    </div>
  );
}
