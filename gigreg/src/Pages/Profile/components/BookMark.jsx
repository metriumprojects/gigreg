import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getUserFavorites } from "../../../redux/reducers/FavoriteReducer";
import { ListingCard } from "../../Home/Listing";

export default function BookMark() {
  const dispatch = useDispatch();
  const { favorites } = useSelector((state) => state.favorite);

  useEffect(() => {
    dispatch(getUserFavorites());
  }, [dispatch]);

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

  const listingFavorites = favoritesArray.filter(
    (fav) => (fav.type === "listing" || fav.listing) && fav.listing
  );

  return (
    <div className="w-full">
      {listingFavorites.length === 0 ? (
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
