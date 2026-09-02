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
  onDelete,
}) {
  const formattedDate = (() => {
    if (!req?.updatedAt) return "Date not available";
    const date = new Date(req.updatedAt);
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

  return (
    <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5">
      <div className="flex flex-col md:flex-row gap-5">
        {/* Images */}
        {req?.images?.length > 0 ? (
          <div className="flex gap-3 shrink-0">
            {req?.images.slice(0, 3).map((img, index) => (
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
                  e.target.style.display = "none";
                }}
              />
            ))}
          </div>
        ) : (
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-gray-200 shrink-0" />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Posted: {formattedDate}</p>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  req?.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {req?.status || "Active"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-white border border-gray-200 font-medium text-gray-900">
              ${req?.price}
            </span>
            <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
              {getModeText()}
            </span>
            {req?.location && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                {req.location}
              </span>
            )}
            {req?.category && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                {req.category}
              </span>
            )}
          </div>

          <div className="mt-3">
            <h2 className="text-sm font-semibold text-gray-900">{req.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {req?.description
                ? req.description.split(/\r?\n/).map((line, idx) => (
                    <React.Fragment key={idx}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))
                : "No description available."}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-start items-center pt-3 gap-2">
            <button
              onClick={() => onEdit(req._id)}
              className="bg-black text-white px-4 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-black/90 transition-colors whitespace-nowrap"
            >
              Edit <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(req._id)}
              className="bg-red-500 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-red-600 transition-colors whitespace-nowrap"
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
