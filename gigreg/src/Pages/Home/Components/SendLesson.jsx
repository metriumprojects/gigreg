import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getMyListings } from "../../../redux/reducers/ListingReducer";
import {
  sendChatMessage,
  startChat,
} from "../../../redux/reducers/ChatReducer";
import { motion } from "framer-motion";
import { useCurrency } from "../../../currency/CurrencyContext";

export default function SendLesson({ open, onClose, request }) {
  const { formatPrice } = useCurrency();
  const dispatch = useDispatch();
  const { listings = [], loading } = useSelector((state) => state.listing);
  const [selectedListing, setSelectedListing] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      dispatch(getMyListings({ page: 1, limit: 50 }));
    }
  }, [dispatch, open]);

  useEffect(() => {
    if (!open) {
      setSelectedListing(null);
      setNote("");
    }
  }, [open]);

  const activeListings = useMemo(
    () => (listings || []).filter((item) => (item?.status || "Active") === "Active"),
    [listings]
  );

  if (!open) return null;

  const handleSend = async () => {
    if (!request?.user?._id) {
      toast.error("Request details are missing.");
      return;
    }

    if (!selectedListing) {
      toast.info("Please select a listing to send.");
      return;
    }

    try {
      setSubmitting(true);
      const { room } = await dispatch(
        startChat({
          targetUserId: request.user._id,
        })
      ).unwrap();

      await dispatch(
        sendChatMessage({
          roomId: room._id,
          listingId: selectedListing,
          message: note.trim() || undefined,
        })
      ).unwrap();

      toast.success("Listing shared via chat.");
      setSelectedListing(null);
      setNote("");
      onClose?.();
    } catch (error) {
      const errMessage =
        typeof error === "string"
          ? error
          : error?.message || "Failed to send listing.";
      toast.error(errMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative w-full max-w-4xl rounded-md bg-white p-6 shadow-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-black hover:text-black"
        >
          <X size={20} />
        </button>

        <h2 className="mb-2 text-xl font-semibold">
          Send an existing listing proposal
        </h2>
        {request ? (
          <p className="mb-4 text-sm text-gray-600">
            Sending to{" "}
            <span className="font-semibold">{request?.user?.name}</span> about{" "}
            <span className="font-semibold">{request?.title}</span>
          </p>
        ) : (
          <p className="mb-4 text-sm text-gray-600">
            Select a request to continue.
          </p>
        )}

        <div className="mb-5 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-gray-100 p-3 hide-scrollbar">
          {loading ? (
            <p className="text-sm text-gray-500">Loading listings...</p>
          ) : activeListings.length === 0 ? (
            <p className="text-sm text-gray-500">
              No listings found. Please create a listing first.
            </p>
          ) : (
            activeListings.map((listing) => (
              <label
                key={listing._id}
                className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="selectedListing"
                  className="h-4 w-4"
                  value={listing._id}
                  checked={selectedListing === listing._id}
                  onChange={() => setSelectedListing(listing._id)}
                  disabled={submitting}
                />
                <img
                  src={listing?.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
                  alt={listing.title}
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-gray-800">
                    {listing.title}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatPrice(listing.price ?? 0, listing.currency || "USD")}
                    {listing.duration ? ` • ${listing.duration}` : ""}
                  </span>
                </div>
              </label>
            ))
          )}
        </div>

        <textarea
          placeholder="Add a message (optional)"
          className="h-28 w-full rounded-lg border border-gray-300 p-3 outline-none"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={submitting}
        />

        <div className="mt-4 flex justify-start">
          <button
            className="rounded bg-primary px-6 py-2 text-white disabled:opacity-60"
            onClick={handleSend}
            disabled={submitting || !request}
          >
            {submitting ? "Sending..." : "Send"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
