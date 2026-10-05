import React, { useEffect, useMemo, useState } from "react";
import { Search, Upload, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchListings } from "../store/Reducer/ListingsReducer";

const HomeSliderModal = ({ isOpen, onClose, slide, onSave, isLoading }) => {
  const dispatch = useDispatch();
  const { listings, loading: listingsLoading } = useSelector((state) => state.listings);

  const [listingId, setListingId] = useState("");
  const [quote, setQuote] = useState("");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [listingSearch, setListingSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchListings({ page: 1, limit: 100, status: "Active" }));
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (slide) {
      setListingId(slide.listing?._id || slide.listing || "");
      setQuote(slide.quote || "");
      setOrder(slide.order ?? 0);
      setIsActive(slide.isActive !== false);
      setPreview(slide.image?.url || "");
      setImage(null);
      setListingSearch("");
    } else {
      setListingId("");
      setQuote("");
      setOrder(0);
      setIsActive(true);
      setPreview("");
      setImage(null);
      setListingSearch("");
    }
  }, [slide, isOpen]);

  const filteredListings = useMemo(() => {
    const term = listingSearch.trim().toLowerCase();
    if (!term) return listings;
    return listings.filter(
      (item) =>
        item.title?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term) ||
        item.createdBy?.name?.toLowerCase().includes(term)
    );
  }, [listingSearch, listings]);

  const selectedListing = useMemo(
    () => listings.find((item) => item._id === listingId) || slide?.listing || null,
    [listingId, listings, slide]
  );

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!listingId) return;
    if (!slide && !image) return;

    const formData = new FormData();
    formData.append("listingId", listingId);
    formData.append("quote", quote);
    formData.append("order", String(order));
    formData.append("isActive", String(isActive));
    if (image) formData.append("image", image);
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600"
          type="button"
        >
          <X size={24} />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          {slide ? "Update Slider Item" : "Add Slider Item"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Select listing
            </label>
            <div className="relative mb-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Search listings..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {listingsLoading && listings.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">Loading listings...</p>
              ) : filteredListings.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">No active listings found.</p>
              ) : (
                filteredListings.map((item) => (
                  <label
                    key={item._id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors ${
                      listingId === item._id ? "bg-primary/10" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="listingId"
                      value={item._id}
                      checked={listingId === item._id}
                      onChange={() => setListingId(item._id)}
                      className="accent-primary"
                    />
                    <img
                      src={item.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
                      alt={item.title}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{item.title}</p>
                      <p className="truncate text-xs text-gray-500">
                        {item.createdBy?.name || "Unknown"}
                        {item.location ? ` · ${item.location}` : ""}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {selectedListing && (
              <p className="mt-2 text-xs text-gray-500">
                Selected: <span className="font-medium text-gray-700">{selectedListing.title}</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Quote / caption (optional)
            </label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={3}
              placeholder="Text shown on the slider. Leave empty to use listing title."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Order</label>
              <input
                type="number"
                min="0"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-primary"
                />
                Active on homepage
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Slider image {!slide && <span className="text-red-500">*</span>}
            </label>
            <div className="relative mt-1 flex cursor-pointer justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 pb-6 pt-5 transition-colors hover:border-primary">
              <div className="space-y-1 text-center">
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="mx-auto h-40 w-full max-w-md rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage(null);
                        setPreview("");
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-sm text-gray-600">Upload slider image</p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>
              {!preview && (
                <input
                  type="file"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              )}
              {preview && (
                <input
                  type="file"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !listingId || (!slide && !image)}
              className="flex items-center rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
              )}
              {slide ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HomeSliderModal;
