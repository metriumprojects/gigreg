import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Loader, Plus } from "lucide-react";
import { getMyListings } from "../../../redux/reducers/ListingReducer";
import { getUserFavorites } from "../../../redux/reducers/FavoriteReducer";
import { ListingCard } from "../../Home/Listing";

export const MyListings = () => {
  const dispatch = useDispatch();
  const { listings, loading, totalPages } = useSelector((state) => state.listing);
  const { favorites } = useSelector((state) => state.favorite);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    dispatch(getMyListings({ page: 1, limit }));
    dispatch(getUserFavorites());
  }, [dispatch, limit]);

  const handleLoadMore = () => {
    if (totalPages > 1) {
      setLimit((prev) => prev + 10);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-[10px] flex items-center justify-start">
        <Link
          to="/create-listing"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} />
          Create listing
        </Link>
      </div>

      {loading && listings.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="h-6 w-6 animate-spin text-gray-700" />
        </div>
      ) : listings.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5">
            {listings.map((listing) => (
              <ListingCard key={listing._id} listing={listing} favorites={favorites} variant="owner" />
            ))}
          </div>

          {listings.length >= limit && totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="rounded-md bg-black px-6 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-[#F7F7F7] py-16 text-center">
          <p className="text-base text-gray-700">No listings yet.</p>
          <Link to="/create-listing" className="mt-3 inline-block text-sm font-medium text-black underline">
            Create your first listing
          </Link>
        </div>
      )}
    </div>
  );
};
