import React from "react";
import { Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useCurrency } from "../../../../currency/CurrencyContext";

const pricingLabelMap = {
  hourly_calendar: "Hourly calendar",
  hourly: "Hourly",
  fixed: "Fixed",
  fixed_on_demand: "On demand",
};

const formatDurationForPrice = (duration) => {
  if (!duration) return "";
  const value = String(duration).trim();
  if (/^1\s*h$/i.test(value)) return "h";
  if (/^60\s*m$/i.test(value)) return "h";
  return value.replace(/\bm\b/g, "min");
};

const ListingCard = ({ listing }) => {
  const { formatPrice } = useCurrency();
  const cardPriceOptions = { currencyDisplay: "narrowSymbol" };
  const imageUrl =
    listing?.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png";
  const profileImage =
    listing?.createdBy?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png";
  const pricingLabel = pricingLabelMap[listing?.pricingType] || "Listing";
  const priceDuration = formatDurationForPrice(listing?.duration);
  const isOnDemandPricing = listing?.pricingType === "fixed_on_demand";
  const priceLabel = isOnDemandPricing
    ? pricingLabel
    : priceDuration
    ? `${formatPrice(listing?.price ?? 0, listing?.currency || "USD", cardPriceOptions)}/${priceDuration}`
    : formatPrice(listing?.price ?? 0, listing?.currency || "USD", cardPriceOptions);
  const pricingBadgeLabel = isOnDemandPricing ? priceLabel : `${priceLabel} - ${pricingLabel}`;
  const publicListingPath = `/listing/${listing?.slug}`;

  const handleCopy = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}${publicListingPath}`);
    toast.success("Listing link copied to clipboard");
  };

  return (
    <article className="mb-5 min-w-0 group">
      <Link
        to={`/update-listing/${listing?._id}`}
        className="relative block aspect-square w-full overflow-hidden rounded-[20px] bg-gray-100"
      >
        <img
          src={imageUrl}
          alt={listing?.title || "Listing"}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-base leading-none text-white backdrop-blur-sm">
          {listing?.status || "Active"}
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-base leading-none text-white backdrop-blur-sm">
          Listing
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-3 top-3 rounded-full bg-black/45 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          title="Copy listing link"
          aria-label="Copy listing link"
        >
          <Copy className="h-4 w-4" />
        </button>
      </Link>

      <div className="pt-2">
        <h3 className="line-clamp-3 text-base font-semibold leading-[1.22] text-black">
          {listing?.title}
        </h3>
        <p className="mt-1 text-base text-[#6A6A6A]">{pricingBadgeLabel}</p>
        <Link to="/profile" className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-[#f3f3f3] py-1 pl-1 pr-3 text-base text-black">
            <img
              src={profileImage}
              loading="lazy"
              alt={listing?.createdBy?.name || "Teacher"}
              className="h-6 w-6 rounded-full object-cover"
            />
          <span className="truncate">{listing?.createdBy?.name || "Unknown"}</span>
        </Link>
      </div>
    </article>
  );
};

export default ListingCard;
