import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader } from "lucide-react";
import { toast } from "react-toastify";
import MainLayout from "../../components/MainLayout";
import ImageUploader from "../../components/ImageUploader";
import LocationAutocomplete from "../Home/Components/LocationAutocomplete";
import MakeAvailability from "../../components/MakeAvailability";
import {
  deleteListing,
  getListingById,
  updateListing,
} from "../../redux/reducers/ListingReducer";
import { getCategories } from "../../redux/reducers/CategoryReducer";
import { getAvailability } from "../../redux/reducers/AvailabilityReducer";
import { useCurrency } from "../../currency/CurrencyContext";

const MAX_DESCRIPTION_LENGTH = 1200;

const generateDurationOptions = () => {
  const options = [];
  for (let minutes = 30; minutes <= 240; minutes += 15) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const displayValue =
      hours === 0
        ? `${minutes}m`
        : remainingMinutes === 0
        ? `${hours}h`
        : `${hours}h ${remainingMinutes}m`;
    options.push({ value: displayValue, label: displayValue });
  }
  return options;
};

const UpdateListing = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currency, supportedCurrencies } = useCurrency();
  const { listing, loading } = useSelector((state) => state.listing);
  const { categories } = useSelector((state) => state.category);
  const { weeklyAvailability, dateAvailability } = useSelector(
    (state) => state.availability || {}
  );

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "",
    price: "",
    location: "",
    message: "",
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [pricingType, setPricingType] = useState("hourly_calendar");
  const [listingCurrency, setListingCurrency] = useState(currency);
  const [allowMessageWithoutPayment, setAllowMessageWithoutPayment] = useState(true);
  const [isOnlineSelected, setIsOnlineSelected] = useState(true);
  const [isInPersonSelected, setIsInPersonSelected] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const [status, setStatus] = useState("Active");
  const [isGroupAvailable, setIsGroupAvailable] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [discount, setDiscount] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [existingCoverImage, setExistingCoverImage] = useState(null);
  const [images, setImages] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const durationOptions = useMemo(() => generateDurationOptions(), []);
  const enableCalendar = pricingType === "hourly_calendar";
  const isHourlyPricing = pricingType === "hourly_calendar" || pricingType === "hourly";
  const isOnDemandPricing = pricingType === "fixed_on_demand";

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getAvailability());
    dispatch(getListingById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (!listing || listing._id !== id) return;

    setFormData({
      title: listing.title || "",
      description: listing.description || "",
      duration: listing.duration || "",
      price: listing.price !== undefined ? listing.price : "",
      location: listing.location || "",
      message: listing.message || "",
    });
    setSelectedCategory(listing.category || "");
    setPricingType(listing.pricingType || "hourly_calendar");
    setListingCurrency(listing.currency || "USD");
    setAllowMessageWithoutPayment(listing.allowMessageWithoutPayment ?? true);
    setIsOnlineSelected(listing.isOnline ?? true);
    setIsInPersonSelected(Boolean(listing.supportsInPerson || listing.location));
    setPlaceId(listing.placeId || "");
    setStatus(listing.status || "Active");
    setIsGroupAvailable(Boolean(listing.isGroupAvailable));
    setCapacity(listing.usecapacity ?? "");
    setDiscount(listing.discount ?? "");
    setExistingCoverImage(listing.coverImage || null);
    setImages((listing.images || []).map((img) => ({ ...img, isExisting: true })));
    setCalendarData({
      calendar: listing.calender ?? true,
      calenderId: listing.calenderId || "",
      weeklyHours: listing.weeklyHours || undefined,
      dateSpecificHours: listing.dateSpecificHours || undefined,
      timeZone: listing.timeZone || undefined,
      calendarName: listing.calendarName || "",
    });
  }, [listing, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "description" && value.length > MAX_DESCRIPTION_LENGTH) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "location") setPlaceId("");
  };

  const handlePricingTypeChange = (type) => {
    setPricingType(type);
    if (type !== "hourly_calendar") setCalendarData(null);
    if (type !== "hourly_calendar" && type !== "hourly") {
      setFormData((prev) => ({ ...prev, duration: "" }));
    }
    if (type === "fixed_on_demand") {
      setFormData((prev) => ({ ...prev, price: "" }));
    }
  };

  const isFormValid = () => {
    const hasCover = Boolean(coverImage || existingCoverImage);
    return (
      formData.title.trim() &&
      formData.description.trim() &&
      (!isHourlyPricing || formData.duration) &&
      (isOnDemandPricing || formData.price) &&
      selectedCategory &&
      hasCover &&
      images.length >= 2 &&
      images.length <= 10 &&
      (isOnlineSelected || isInPersonSelected) &&
      (!isInPersonSelected || formData.location.trim())
    );
  };

  const appendImages = (formDataToSubmit) => {
    images.forEach((imgObj) => {
      if (imgObj.isExisting) return;
      if (imgObj.file instanceof Blob) {
        const file = new File([imgObj.file], `image_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        formDataToSubmit.append("images", file);
      } else if (imgObj.file) {
        formDataToSubmit.append("images", imgObj.file);
      }
    });

    const existingImageIds = images
      .filter((img) => img.isExisting && img.public_id)
      .map((img) => img.public_id);
    formDataToSubmit.append("existingImages", JSON.stringify(existingImageIds));
  };

  const appendCalendar = (formDataToSubmit) => {
    if (!enableCalendar) {
      formDataToSubmit.append("calender", false);
      return;
    }

    if (!calendarData || calendarData.calendar === true) {
      formDataToSubmit.append("calender", true);
      if (calendarData?.weeklyHours) {
        formDataToSubmit.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
      }
      if (calendarData?.dateSpecificHours) {
        formDataToSubmit.append("dateSpecificHours", JSON.stringify(calendarData.dateSpecificHours));
      }
      return;
    }

    formDataToSubmit.append("calender", false);
    if (calendarData.calenderId) formDataToSubmit.append("calenderId", calendarData.calenderId);
    if (!calendarData.calenderId && calendarData.weeklyHours) {
      formDataToSubmit.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
    }
    if (!calendarData.calenderId && calendarData.dateSpecificHours) {
      formDataToSubmit.append("dateSpecificHours", JSON.stringify(calendarData.dateSpecificHours));
    }
    if (!calendarData.calenderId && calendarData.timeZone) formDataToSubmit.append("timeZone", calendarData.timeZone);
    if (calendarData.calendarName) formDataToSubmit.append("calendarName", calendarData.calendarName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast.info("Please complete all required fields");
      return;
    }

    const listingFormData = new FormData();
    listingFormData.append("title", formData.title);
    listingFormData.append("description", formData.description);
    listingFormData.append("duration", isHourlyPricing ? formData.duration : "");
    listingFormData.append("price", isOnDemandPricing ? 0 : formData.price);
    listingFormData.append("inputCurrency", listingCurrency);
    listingFormData.append("pricingType", pricingType);
    listingFormData.append("allowMessageWithoutPayment", allowMessageWithoutPayment);
    listingFormData.append("category", selectedCategory);
    listingFormData.append("isOnline", isOnlineSelected);
    listingFormData.append("supportsInPerson", isInPersonSelected);
    listingFormData.append("status", status);
    listingFormData.append("isGroupAvailable", isGroupAvailable);
    listingFormData.append("usecapacity", isGroupAvailable ? capacity || 0 : 0);
    listingFormData.append("discount", isGroupAvailable ? discount || 0 : 0);
    listingFormData.append("message", formData.message || "");

    if (isInPersonSelected && formData.location.trim()) {
      listingFormData.append("location", formData.location);
    }
    if (isInPersonSelected && placeId) {
      listingFormData.append("placeId", placeId);
    }
    if (coverImage) {
      listingFormData.append("coverImage", coverImage);
    } else if (existingCoverImage?.public_id) {
      listingFormData.append("existingCoverImageId", existingCoverImage.public_id);
    }

    appendImages(listingFormData);
    appendCalendar(listingFormData);

    const res = await dispatch(updateListing({ listingId: id, formData: listingFormData }));
    if (res?.payload?.status) {
      toast.success(res.payload.message || "Listing updated successfully");
      navigate("/profile?tab=My%20Listing");
    } else {
      toast.error(res?.payload?.message || "Failed to update listing");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this listing?")) return;

    const res = await dispatch(deleteListing(id));
    if (res?.payload?.status) {
      toast.success(res.payload.message || "Listing deleted successfully");
      navigate("/profile?tab=My%20Listing");
    } else {
      toast.error(res?.payload?.message || "Failed to delete listing");
    }
  };

  const coverPreview = coverImage
    ? URL.createObjectURL(coverImage)
    : existingCoverImage?.url || "";

  return (
    <MainLayout className="mx-auto" width="1800px">
      <div className="min-h-screen bg-white pt-[30px] pb-10">
        <div className="w-full mx-auto">
          <div className="flex items-center justify-between mb-[30px]">
            <h1 className="text-3xl font-bold">Update listing</h1>
            <Link to="/profile?tab=My%20Listing" className="text-sm underline">
              Back to listings
            </Link>
          </div>

          <div className={`grid grid-cols-1 gap-8 ${enableCalendar ? "lg:grid-cols-2" : ""}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Listing name *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength="300"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                />
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Description *</label>
                <textarea
                  name="description"
                  rows="5"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50 resize-none"
                />
                <div className="flex justify-between text-xs mt-2">
                  <span className={formData.description.length >= 50 ? "text-green-600" : "text-amber-600"}>
                    {formData.description.length >= 50
                      ? "Long enough"
                      : `Minimum 50 characters (${formData.description.length}/50)`}
                  </span>
                  <span className="text-gray-500">
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Listing cover image *</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                    disabled={loading}
                    className="block w-full text-sm"
                  />
                  {coverPreview && (
                    <div className="relative w-24 h-24 border-2 border-gray-300 rounded-md overflow-hidden">
                      <img src={coverPreview} alt="cover-preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Listing images *</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <ImageUploader
                    images={images}
                    onImagesChange={setImages}
                    maxImages={10}
                    minImages={2}
                    disabled={loading}
                    label="Upload Images (min 2, max 10)"
                  />
                </div>
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-3 text-sm font-semibold text-gray-900">Listing pricing *</label>
                <div className="space-y-3">
                  {[
                    ["hourly_calendar", "Hourly pricing (calendar based)"],
                    ["hourly", "Hourly pricing"],
                    ["fixed", "Fixed price"],
                    ["fixed_on_demand", "On demand"],
                  ].map(([value, label]) => {
                    const selected = pricingType === value;
                    const hourlyOption = value === "hourly_calendar" || value === "hourly";
                    const onDemandOption = value === "fixed_on_demand";

                    return (
                      <div key={value} className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="pricingType"
                            checked={selected}
                            onChange={() => handlePricingTypeChange(value)}
                            disabled={loading}
                            className="w-4 h-4 accent-black"
                          />
                          <span className="text-sm text-gray-900">{label}</span>
                        </label>

                        {selected && (
                          <div className="ml-7 space-y-3">
                            {!onDemandOption && (
                              <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    disabled={loading}
                                    min="0"
                                    step="1"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                                  />
                                </div>

                                {hourlyOption && (
                                  <div className="w-[215px] shrink-0">
                                    <select
                                      name="duration"
                                      value={formData.duration}
                                      onChange={handleChange}
                                      disabled={loading}
                                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                                    >
                                      <option value="">Select minimum duration</option>
                                      {durationOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="w-[100px] shrink-0">
                                  <select
                                    value={listingCurrency}
                                    onChange={(event) => setListingCurrency(event.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                                  >
                                    {supportedCurrencies.map((code) => (
                                      <option key={code} value={code}>{code}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMessageWithoutPayment}
                    onChange={() => setAllowMessageWithoutPayment((prev) => !prev)}
                    disabled={loading}
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-sm text-gray-900">Allow users to message you without paying listing price</span>
                </label>
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Listing location *</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOnlineSelected}
                        onChange={() => setIsOnlineSelected((prev) => !prev)}
                        disabled={loading}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-sm text-gray-700">Online</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInPersonSelected}
                        onChange={() => setIsInPersonSelected((prev) => !prev)}
                        disabled={loading}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-sm text-gray-700">In Person</span>
                    </label>
                  </div>

                  {isInPersonSelected && (
                    <LocationAutocomplete
                      value={formData.location}
                      onChange={(value) => {
                        setFormData((prev) => ({ ...prev, location: value }));
                        setPlaceId("");
                      }}
                      onSelectDetails={({ description, placeId: selectedPlaceId }) => {
                        setFormData((prev) => ({ ...prev, location: description || "" }));
                        setPlaceId(selectedPlaceId || "");
                      }}
                      placeholder="Enter location for in-person listings"
                      className="w-full px-0 py-0 text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Category *</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  {categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCategory(cat.name)}
                          disabled={loading}
                          className={`px-3 py-1 rounded-full border text-sm transition-all disabled:opacity-50 ${
                            selectedCategory === cat.name
                              ? "bg-black text-white border-black"
                              : "border-gray-400 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {cat.name || cat}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Loading categories...</p>
                  )}
                </div>
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Message</label>
                <textarea
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50 resize-none"
                />
              </div>

              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-3 text-sm font-semibold text-gray-900">Listing status *</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-6">
                  {["Active", "Disabled"].map((value) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={value}
                        checked={status === value}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={loading}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-sm text-gray-700">{value}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={loading || !isFormValid()}
                  className="w-fit bg-black text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Updating Listing...
                    </>
                  ) : (
                    "Update Listing"
                  )}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDelete}
                  className="w-fit bg-red-500 text-white font-medium px-6 py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Listing
                </button>
              </div>
            </form>

            {enableCalendar && (
              <div className="hidden lg:block">
                <div className="sticky top-10 h-fit">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">My Availability</h3>
                  <p className="text-gray-500 text-sm mb-6">Set your availability schedule for this listing</p>
                  <MakeAvailability
                    availabilityData={{ weeklyAvailability, dateAvailability }}
                    onChange={setCalendarData}
                    isGroupAvailable={isGroupAvailable}
                  />
                </div>
              </div>
            )}
          </div>

          {enableCalendar && (
            <div className="lg:hidden mt-12">
              <MakeAvailability
                availabilityData={{ weeklyAvailability, dateAvailability }}
                onChange={setCalendarData}
                isGroupAvailable={isGroupAvailable}
              />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default UpdateListing;
