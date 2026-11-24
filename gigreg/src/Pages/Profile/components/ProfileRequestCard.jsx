import React, { memo } from "react";
import { Edit, Trash } from "lucide-react";

// Optimize Cloudinary URLs to load small thumbnails instead of full images
const getOptimizedUrl = (url, width = 256) => {
  if (!url || typeof url !== "string") return url;
  if (url.includes("cloudinary.com")) {
    return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
  }
  return url;
};

const ProfileRequestCard = memo(function ProfileRequestCard({
  req,
  onEdit,
  onContinueDraft,
  onDelete,
}) {
  const isDraft = req?.status === "Draft";

  const formattedDate = (() => {
    const rawDate = req?.updatedAt || req?.createdAt;
    if (!rawDate) return "Date not available";
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return "Date not available";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  })();

  const getModeText = () => {
    if (req?.isOnline === true && req?.supportsInPerson === true) {
      return "Online & in person";
    }
    if (req?.supportsInPerson === true && req?.isOnline === false) {
      return "In person";
    }
    return "Online";
  };

  const statusBadgeClass =
    req?.status === "Active"
      ? "bg-green-100 text-green-700"
      : isDraft
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-200 text-gray-700";

  return (
    <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
      <div className="flex flex-col md:flex-row gap-5">
        {/* Images */}
        {(() => {
          const validImages = Array.isArray(req?.images)
            ? req.images.filter(
                (img) => img?.url && typeof img.url === "string" && img.url.trim()
              )
            : [];
          if (validImages.length === 0) return null;
          return (
            <div className="flex gap-3 shrink-0 empty:hidden">
              {validImages.slice(0, 3).map((img, index) => (
                <img
                  key={img.public_id || img.url || index}
                  src={getOptimizedUrl(img.url, 256)}
                  alt={`request-img-${index}`}
                  loading="lazy"
                  decoding="async"
                  width={128}
                  height={128}
                  className="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-cover bg-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ))}
            </div>
          );
        })()}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {isDraft ? `Saved: ${formattedDate}` : `Posted: ${formattedDate}`}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass}`}>
                {req?.status || "Active"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
            {Number(req?.price) > 0 && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-800 font-medium">
                Budget: ${req.price}
                {req?.pricingType === "hourly" ? " / hr" : ""}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-800">
              {getModeText()}
            </span>
            {req?.location && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-800">
                {req.location}
              </span>
            )}
            {req?.category && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-800">
                {req.category}
              </span>
            )}
          </div>

          <div className="mt-3">
            <h2 className="text-base font-semibold text-gray-900">
              {req?.title?.trim() || "Untitled draft"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {req?.description?.trim()
                ? req.description.split(/\r?\n/).map((line, idx) => (
                    <React.Fragment key={idx}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))
                : isDraft
                ? "No description added yet."
                : "No description available."}
            </p>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap justify-start items-center pt-4 gap-2">
            {isDraft ? (
              <button
                type="button"
                onClick={() => (onContinueDraft ? onContinueDraft(req) : onEdit(req._id))}
                className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors whitespace-nowrap cursor-pointer"
              >
                Continue editing <Edit className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onEdit(req._id)}
                className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors whitespace-nowrap cursor-pointer"
              >
                Edit <Edit className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(req._id)}
              className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              Delete <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProfileRequestCard;
