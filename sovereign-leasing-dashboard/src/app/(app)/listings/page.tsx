import { createListingAction } from "@/lib/actions";
import { listListings } from "@/lib/repository";
import { StatusPill } from "@/components/status-pill";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const listings = await listListings();

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Listing Database</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Match inquiries to listings using address, apartment number, and platform links.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#6d6f78]">
                <th className="pb-2">Address</th>
                <th className="pb-2">Rent</th>
                <th className="pb-2">Details</th>
                <th className="pb-2">Policy</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-t border-[#ece8e3]">
                  <td className="py-2 font-medium">
                    {listing.address} {listing.apartmentNumber}
                    <p className="text-xs text-[#6d6f78]">{listing.neighborhood}</p>
                  </td>
                  <td className="py-2">${listing.rent.toLocaleString()}</td>
                  <td className="py-2">
                    {listing.beds} bed / {listing.baths} bath
                    <p className="text-xs text-[#6d6f78]">Income: {listing.incomeRequirementX}x</p>
                  </td>
                  <td className="py-2">{listing.petPolicy ?? "Not specified"}</td>
                  <td className="py-2">
                    <StatusPill label={listing.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form action={createListingAction} className="card space-y-3">
          <h3 className="text-lg font-semibold">Add listing</h3>
          <input name="address" placeholder="Address" required />
          <input name="apartmentNumber" placeholder="Apartment number" required />
          <input name="rent" type="number" min={0} placeholder="Rent" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="beds" type="number" min={0} placeholder="Beds" required />
            <input name="baths" type="number" min={0} step="0.5" placeholder="Baths" required />
          </div>
          <input name="neighborhood" placeholder="Neighborhood" required />
          <input name="petPolicy" placeholder="Pet policy" />
          <select name="status" defaultValue="ACTIVE">
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="RENTED">Rented</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button type="submit">Save listing</button>
        </form>
      </section>
    </div>
  );
}
