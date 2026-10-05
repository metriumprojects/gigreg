import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchListings, deleteListing, updateListing } from "../store/Reducer/ListingsReducer";
import { gigregFrontendUrl } from "../store/api";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function Listings() {
  const dispatch = useDispatch();
  const { listings, loading, error, page, totalPages, total } = useSelector(
    (state) => state.listings
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(
      fetchListings({
        page: currentPage,
        limit: 20,
        search,
        status: statusFilter || undefined,
      })
    );
  }, [dispatch, currentPage, search, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing? This action cannot be undone.")) return;
    const result = await dispatch(deleteListing(id));
    if (deleteListing.fulfilled.match(result)) {
      toast.success("Listing deleted");
      dispatch(
        fetchListings({
          page: currentPage,
          limit: 20,
          search,
          status: statusFilter || undefined,
        })
      );
    } else {
      toast.error(result.payload || "Failed to delete listing");
    }
  };

  const startEdit = (listing) =>
    setEditing({
      id: listing._id,
      title: listing.title || "",
      price: listing.price ?? 0,
      status: listing.status || "Active",
      category: listing.category || "",
    });

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const result = await dispatch(
      updateListing({
        id: editing.id,
        data: {
          title: editing.title,
          price: Number(editing.price),
          status: editing.status,
          category: editing.category,
        },
      })
    );
    setSaving(false);

    if (updateListing.fulfilled.match(result)) {
      toast.success("Listing updated");
      setEditing(null);
      dispatch(
        fetchListings({
          page: currentPage,
          limit: 20,
          search,
          status: statusFilter || undefined,
        })
      );
    } else {
      toast.error(result.payload || "Failed to update listing");
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Listings</h1>
          <p className="text-sm text-gray-500">{total || 0} total listings</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
          <Search size={16} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setCurrentPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search listings..."
            className="w-full outline-none"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setCurrentPage(1);
            setStatusFilter(e.target.value);
          }}
          className="h-11 rounded-lg border border-gray-200 bg-white px-3"
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : !Array.isArray(listings) || listings.length === 0 ? (
        <p>No listings found.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">Cover</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing._id} className="border-t">
                  <td className="px-4 py-3">
                    <img
                      src={
                        listing.coverImage?.url ||
                        listing.images?.[0]?.url ||
                        "https://i.ibb.co/tpV3m2GW/no-image.png"
                      }
                      alt={listing.title}
                      className="h-12 w-12 rounded object-cover"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{listing.title}</td>
                  <td className="px-4 py-3">
                    {listing.createdBy?.name || listing.createdBy?.email || "—"}
                  </td>
                  <td className="px-4 py-3">{listing.category || "—"}</td>
                  <td className="px-4 py-3">
                    {listing.currency || "USD"} {listing.price ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        listing.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {listing.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEdit(listing)}
                        className="rounded bg-yellow-100 px-2 py-1 text-yellow-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(listing._id)}
                        className="rounded bg-red-600 px-2 py-1 text-white"
                      >
                        Delete
                      </button>
                      <a
                        href={`${gigregFrontendUrl}/listing/${listing.slug || listing._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-gray-100 px-2 py-1"
                      >
                        View
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="rounded border p-2 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm">
            Page {page || currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border p-2 disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="mb-4 text-lg font-medium">Edit Listing</h3>
            <label className="mb-1 block text-sm">Title</label>
            <input
              value={editing.title}
              onChange={(e) => setEditing((prev) => ({ ...prev, title: e.target.value }))}
              className="mb-3 w-full rounded border px-3 py-2"
            />
            <label className="mb-1 block text-sm">Category</label>
            <input
              value={editing.category}
              onChange={(e) => setEditing((prev) => ({ ...prev, category: e.target.value }))}
              className="mb-3 w-full rounded border px-3 py-2"
            />
            <label className="mb-1 block text-sm">Price</label>
            <input
              type="number"
              value={editing.price}
              onChange={(e) => setEditing((prev) => ({ ...prev, price: e.target.value }))}
              className="mb-3 w-full rounded border px-3 py-2"
            />
            <label className="mb-1 block text-sm">Status</label>
            <select
              value={editing.status}
              onChange={(e) => setEditing((prev) => ({ ...prev, status: e.target.value }))}
              className="mb-4 w-full rounded border px-3 py-2"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Draft">Draft</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded border px-4 py-2">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
