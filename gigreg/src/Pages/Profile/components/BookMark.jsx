import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getUserFavorites, toggleFavorite } from "../../../redux/reducers/FavoriteReducer";
import { ListingCard } from "../../Home/Listing";
import RequestCard from "../../Home/Components/RequestCard";

export default function BookMark() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { favorites } = useSelector((state) => state.favorite);
  const { userInfo } = useSelector((state) => state.auth);
  const isSeller = userInfo?.role === "teacher";

  const subtabParam = searchParams.get("subtab");
  const [activeTab, setActiveTab] = useState(
    subtabParam === "requests" ? "requests" : "listings"
  );
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    dispatch(getUserFavorites());
  }, [dispatch]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    if (newTab === "requests") {
      newParams.set("subtab", "requests");
    } else {
      newParams.delete("subtab");
    }
    setSearchParams(newParams, { replace: true });
  };

  const favoritesArray = useMemo(() => {
    if (!favorites) return [];
    if (Array.isArray(favorites)) return favorites;

    if (typeof favorites === "object") {
      if (favorites.data && Array.isArray(favorites.data)) return favorites.data;
      if (favorites.favorites && Array.isArray(favorites.favorites)) return favorites.favorites;
      if (favorites.items && Array.isArray(favorites.items)) return favorites.items;
      if (favorites.listings && Array.isArray(favorites.listings)) return favorites.listings;
      if (Object.keys(favorites).every((key) => !Number.isNaN(Number(key)))) {
        return Object.values(favorites);
      }
    }
    return [];
  }, [favorites]);

  const listingFavorites = useMemo(() => {
    return favoritesArray.filter(
      (fav) => (fav.type === "listing" || fav.listing) && fav.listing
    );
  }, [favoritesArray]);

  const requestFavorites = useMemo(() => {
    return favoritesArray
      .filter(
        (fav) =>
          (fav.type === "propose" || fav.propose) &&
          fav.propose &&
          typeof fav.propose === "object" &&
          fav.propose._id
      )
      .map((fav) => fav.propose);
  }, [favoritesArray]);

  const favoriteProposeIds = useMemo(() => {
    const ids = new Set();
    for (const fav of favoritesArray) {
      if ((fav.type === "propose" || fav.propose) && fav.propose?._id) {
        ids.add(fav.propose._id);
      }
    }
    return ids;
  }, [favoritesArray]);

  const handleSaveRequest = useCallback(
    (proposeId) => {
      setSavingId(proposeId);
      dispatch(toggleFavorite({ id: proposeId, type: "propose" }))
        .then((res) => {
          setSavingId(null);
          if (res?.payload?.status) {
            dispatch(getUserFavorites());
            toast.success(res.payload.message || "Updated favorites");
          } else {
            toast.error(res?.payload?.message || "Unable to update favorite");
          }
        })
        .catch(() => {
          setSavingId(null);
          toast.error("Failed to update favorite");
        });
    },
    [dispatch]
  );

  const currentTab = isSeller ? activeTab : "listings";

  return (
    <div className="w-full">
      {/* Sub Tabs: Only shown for sellers */}
      {isSeller && (
        <div className="mb-[20px] flex gap-6 justify-start text-sm font-medium">
          <button
            type="button"
            onClick={() => handleTabChange("listings")}
            className={`pb-2.5 transition-colors cursor-pointer ${
              currentTab === "listings"
                ? "border-b-2 border-black text-black font-semibold"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Saved Listings {listingFavorites.length > 0 ? `(${listingFavorites.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("requests")}
            className={`pb-2.5 transition-colors cursor-pointer ${
              currentTab === "requests"
                ? "border-b-2 border-black text-black font-semibold"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Saved Requests {requestFavorites.length > 0 ? `(${requestFavorites.length})` : ""}
          </button>
        </div>
      )}

      {currentTab === "requests" ? (
        requestFavorites.length === 0 ? (
          <div className="mb-5 py-16 text-center">
            <p className="text-lg text-gray-500">No saved requests yet</p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4 sm:gap-5">
            {requestFavorites.map((req) => (
              <RequestCard
                key={req._id}
                req={req}
                isFavorite={favoriteProposeIds.has(req._id)}
                onSave={handleSaveRequest}
                userInfo={userInfo}
                isLoading={savingId === req._id}
              />
            ))}
          </div>
        )
      ) : listingFavorites.length === 0 ? (
        <div className="mb-5 py-16 text-center">
          <p className="text-lg text-gray-500">No favorites yet</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[2800px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5">
          {listingFavorites.map((favorite) => (
            <ListingCard
              key={favorite._id || favorite.listing?._id}
              listing={favorite.listing}
              favorites={favorites}
            />
          ))}
        </div>
      )}
    </div>
  );
}
