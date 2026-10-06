import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader, Search, X } from "lucide-react";
import { motion as Motion } from "framer-motion";
import api from "../redux/api";
import { useCurrency } from "../currency/CurrencyContext";

const fallbackImage = "https://i.ibb.co/tpV3m2GW/no-image.png";

const normalizeListings = (data) =>
  (data?.listings || []).slice(0, 8).map((listing) => ({
    ...listing,
    resultType: "Listing",
    path: `/listing/${listing.slug || listing._id}`,
  }));

const formatDuration = (item) =>
  item?.duration ? String(item.duration).replace(/\bm\b/g, "min") : item?.resultType;

const getLocationLabel = (item) => {
  if (item?.isOnline && item?.supportsInPerson) {
    return item?.location ? `Online / In-person - ${item.location}` : "Online / In-person";
  }
  if (item?.isOnline) return "Online";
  return item?.location || item?.address || "In-person";
};

const ResultRow = ({ item, onSelect }) => {
  const { formatPrice } = useCurrency();
  const priceLabel = item?.pricingType === "fixed_on_demand"
    ? "On demand"
    : formatPrice(item?.price ?? 0, item?.currency || "USD", { currencyDisplay: "narrowSymbol" });

  return (
    <Link
      to={item.path}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50"
    >
      <img
        src={item?.coverImage?.url || item?.images?.[0]?.url || fallbackImage}
        alt={item?.title || item.resultType}
        className="h-16 w-16 shrink-0 rounded-lg object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">{item?.title || "Untitled"}</p>
        <p className="truncate text-xs text-gray-500">
          Build
          {item?.category ? ` - ${item.category}` : ""}
          {item?.createdBy?.name ? ` - ${item.createdBy.name}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
          <span className="font-semibold text-black">{priceLabel}</span>
          <span>{formatDuration(item)}</span>
          <span className="max-w-full truncate">{getLocationLabel(item)}</span>
        </div>
      </div>
    </Link>
  );
};

export default function HeaderSearchOverlay({ open, onClose, searchInput = "" }) {
  const { currency } = useCurrency();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOnlineSelected, setIsOnlineSelected] = useState(true);
  const [isInPersonSelected, setIsInPersonSelected] = useState(true);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const trimmedQuery = (searchInput || "").trim();
  const hasResults = listings.length > 0;

  const searchParams = useMemo(() => {
    const params = new URLSearchParams({
      page: "1",
      limit: "8",
      search: trimmedQuery,
      currency,
    });
    const min = Number(minPrice);
    const max = Number(maxPrice);

    if (isOnlineSelected && !isInPersonSelected) {
      params.append("isOnline", "true");
    }
    if (isInPersonSelected && !isOnlineSelected) {
      params.append("supportsInPerson", "true");
    }
    if (Number.isFinite(min) && Number.isFinite(max) && minPrice !== "" && maxPrice !== "") {
      params.append("minPrice", String(min));
      params.append("maxPrice", String(max));
    }

    return params.toString();
  }, [currency, isInPersonSelected, isOnlineSelected, maxPrice, minPrice, trimmedQuery]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setListings([]);
      setError("");
      setIsOnlineSelected(true);
      setIsInPersonSelected(true);
      setMinPrice("");
      setMaxPrice("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const listingResponse = await api.get(`/listings/active?${searchParams}`, {
          signal: controller.signal,
        });
        setListings(normalizeListings(listingResponse.data));
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setError("Unable to load suggestions.");
        setListings([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, searchParams]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/20 px-3 pt-20 md:pt-24"
      onClick={onClose}
    >
      <Motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-black">Filters</h3>
            {loading && <Loader className="h-4 w-4 shrink-0 animate-spin text-gray-400" />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-[auto_auto_1fr_1fr] md:items-center">
          <label className="flex items-center gap-2 text-sm font-semibold text-black cursor-pointer">
            <input
              type="checkbox"
              checked={isOnlineSelected}
              onChange={() => setIsOnlineSelected((current) => !current)}
              className="h-4 w-4 accent-black cursor-pointer"
            />
            Online
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-black cursor-pointer">
            <input
              type="checkbox"
              checked={isInPersonSelected}
              onChange={() => setIsInPersonSelected((current) => !current)}
              className="h-4 w-4 accent-black cursor-pointer"
            />
            In-person
          </label>
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="Min price"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          />
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="Max price"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          />
        </div>

        <div className="mt-4 max-h-[65vh] overflow-y-auto">
          {error && <p className="px-2 py-6 text-center text-sm text-red-500">{error}</p>}

          {!loading && !error && !hasResults && (
            <p className="px-2 py-6 text-center text-sm text-gray-500">No listings found.</p>
          )}

          {listings.length > 0 && (
            <div>
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                Listings
              </p>
              <div className="space-y-1">
                {listings.map((item) => (
                  <ResultRow key={`listing-${item._id}`} item={item} onSelect={onClose} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Motion.div>
    </div>
  );
}
