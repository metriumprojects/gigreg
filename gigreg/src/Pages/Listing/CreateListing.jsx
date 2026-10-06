import React, { useState, useEffect, useCallback } from "react";
import LocationAutocomplete from "../Home/Components/LocationAutocomplete";
import { useDispatch, useSelector } from "react-redux";
import { Loader, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { FaVideo, FaMapMarkerAlt } from "react-icons/fa";
import MainLayout from "../../components/MainLayout";
import ImageUploader from "../../components/ImageUploader";
import Cropper from "react-easy-crop";
import { motion as Motion } from "framer-motion";
import { createListing } from "../../redux/reducers/ListingReducer";
import { getAvailability } from "../../redux/reducers/AvailabilityReducer";
import { sendChatMessage, startChat } from "../../redux/reducers/ChatReducer";
import { useCurrency } from "../../currency/CurrencyContext";
import { toast } from "react-toastify";
import { getCategories } from "../../redux/reducers/CategoryReducer";
import MakeAvailability from "../../components/MakeAvailability";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GrUpload } from "react-icons/gr";
import useTeacherPayoutCurrencies from "../../hooks/useTeacherPayoutCurrencies";
import { getProposeById } from "../../redux/reducers/ProposeReducer";
import {
  clearProposalRequest,
  formatRequestDate,
  getRequestBuyerId,
  loadProposalRequest,
  saveProposalMessage,
  saveProposalRequest,
} from "../../utils/proposalRequest";

const CreateListing = () => {
  const { currency } = useCurrency();
  const { payoutCurrencies, payoutCurrenciesLoading, stripePayoutReady } = useTeacherPayoutCurrencies();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isProposalFlow = searchParams.get("type") === "proposal";
  const requestId = searchParams.get("requestId");
  const cachedRequest = loadProposalRequest();
  const [proposalRequest, setProposalRequest] = useState(() => {
    if (!isProposalFlow) return null;
    if (cachedRequest && (!requestId || String(cachedRequest._id) === String(requestId))) {
      return cachedRequest;
    }
    return null;
  });
  const requestPrefill = isProposalFlow ? proposalRequest : null;

  useEffect(() => {
    if (!isProposalFlow) {
      clearProposalRequest();
      setProposalRequest(null);
    }
  }, [isProposalFlow]);

  useEffect(() => {
    if (!isProposalFlow || !requestId) return;
    dispatch(getProposeById(requestId)).then((res) => {
      const data = res.payload?._id ? res.payload : res.payload?.propose;
      if (data?._id) {
        setProposalRequest(data);
        saveProposalRequest(data);
      }
    });
  }, [dispatch, isProposalFlow, requestId]);
  useEffect(() => {
    if (!payoutCurrenciesLoading && !stripePayoutReady) {
      toast.info("Set up and verify your Stripe payout account before creating a listing.");
      navigate("/withdraw-request", { replace: true });
    }
  }, [navigate, payoutCurrenciesLoading, stripePayoutReady]);
  const { categories,  } = useSelector(
    (state) => state.category
  );
  const { loading } = useSelector((state) => state.listing);
  const { weeklyAvailability, dateAvailability } = useSelector((state) => state.availability || {});
  const [isOnlineSelected, setIsOnlineSelected] = useState(
    requestPrefill?.isOnline !== undefined ? !!requestPrefill.isOnline : true
  );
  const [isInPersonSelected, setIsInPersonSelected] = useState(
    !!requestPrefill?.supportsInPerson
  );
  const [selectedCategory, setSelectedCategory] = useState(requestPrefill?.category || "");
  const [images, setImages] = useState([]);
  const [coverImage, setCoverImage] = useState(null);
  const [status, setStatus] = useState("Active");
  const [capacity] = useState("");
  const [discount] = useState("");
  const [isGroupAvailable] = useState(false);
  const [pricingType, setPricingType] = useState("hourly_calendar");
  const [listingCurrency, setListingCurrency] = useState(currency);
  const [allowMessageWithoutPayment, setAllowMessageWithoutPayment] = useState(true);
  const [formData, setFormData] = useState({
    title: requestPrefill?.title || "",
    description: requestPrefill?.description || "",
    duration: "",
    price: requestPrefill?.price != null ? String(requestPrefill.price) : "",
    location: requestPrefill?.location || "",
    message: "Hi, your booking is confirmed! Looking forward to working with you. I’ll review your goals ahead of the session so we can make the most of our time. If there’s anything specific you want to focus on or prepare, feel free to send it over in advance.",
  });
  const [proposalNote, setProposalNote] = useState(
    "Hi I'd love to help you with your task!"
  );
  const [errors, setErrors] = useState({});
  const [placeId, setPlaceId] = useState("");
  const enableCalendar = pricingType === "hourly_calendar";
  const isHourlyPricing = pricingType === "hourly_calendar" || pricingType === "hourly";
  const isOnDemandPricing = pricingType === "fixed_on_demand";
  const [calendarData, setCalendarData] = useState(null);
  const [calendarSelection, setCalendarSelection] = useState({ mode: "default", calenderId: null });
  const [isLargeScreen, setIsLargeScreen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true
  );
  useEffect(() => {
    const next = payoutCurrencies.includes(currency) ? currency : payoutCurrencies[0];
    if (next) setListingCurrency(next);
  }, [currency, payoutCurrencies]);
  // For LocationAutocomplete
  const [locationFilter, setLocationFilter] = useState(requestPrefill?.location || "");

  useEffect(() => {
    if (!proposalRequest || !isProposalFlow) return;
    setSelectedCategory((prev) => prev || proposalRequest.category || "");
    setIsOnlineSelected(proposalRequest.isOnline !== undefined ? !!proposalRequest.isOnline : true);
    setIsInPersonSelected(!!proposalRequest.supportsInPerson);
    setLocationFilter((prev) => prev || proposalRequest.location || "");
    setFormData((prev) => ({
      ...prev,
      title: prev.title || proposalRequest.title || "",
      description: prev.description || proposalRequest.description || "",
      price: prev.price || (proposalRequest.price != null ? String(proposalRequest.price) : ""),
      location: prev.location || proposalRequest.location || "",
    }));
  }, [isProposalFlow, proposalRequest]);
  
  // Cover image crop states
  const [coverImageCrop, setCoverImageCrop] = useState({ x: 0, y: 0 });
  const [coverImageZoom, setCoverImageZoom] = useState(1);
  const [coverImageRotation, setCoverImageRotation] = useState(0);
  const [coverImageCroppedAreaPixels, setCoverImageCroppedAreaPixels] = useState(null);
  const [showCoverImageCropModal, setShowCoverImageCropModal] = useState(false);
  const [tempCoverImagePreview, setTempCoverImagePreview] = useState(null);

  const handleLocationSelect = ({ description, placeId: selectedPlaceId }) => {
    setFormData((prev) => ({ ...prev, location: description || "" }));
    setLocationFilter(description || "");
    setPlaceId(selectedPlaceId || "");
  };

  // Memoized callback for calendar changes to prevent infinite loops
  const handleCalendarChange = useCallback((data) => {
    setCalendarData(data);
  }, []);

  const handleCalendarSelectionChange = useCallback((selection) => {
    setCalendarSelection(selection);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event) => setIsLargeScreen(event.matches);

    setIsLargeScreen(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Handle cover image crop complete
  const onCoverImageCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCoverImageCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Create cropped cover image
  const getCroppedCoverImage = async () => {
    if (!tempCoverImagePreview || !coverImageCroppedAreaPixels) return null;

    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = tempCoverImagePreview;

    return new Promise((resolve) => {
      image.onload = () => {
        const ctx = canvas.getContext("2d");

        // Set canvas size to cropped area
        canvas.width = coverImageCroppedAreaPixels.width;
        canvas.height = coverImageCroppedAreaPixels.height;

        // Draw rotated and cropped image
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((coverImageRotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        ctx.drawImage(
          image,
          coverImageCroppedAreaPixels.x,
          coverImageCroppedAreaPixels.y,
          coverImageCroppedAreaPixels.width,
          coverImageCroppedAreaPixels.height,
          0,
          0,
          coverImageCroppedAreaPixels.width,
          coverImageCroppedAreaPixels.height
        );

        ctx.restore();

        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg");
      };
    });
  };

  // Confirm cover image crop
  const handleConfirmCoverImageCrop = async () => {
    const croppedBlob = await getCroppedCoverImage();
    if (croppedBlob) {
      const croppedFile = new File([croppedBlob], `cover_image_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      setCoverImage(croppedFile);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.coverImage;
        return next;
      });
      setShowCoverImageCropModal(false);
      setTempCoverImagePreview(null);
      setCoverImageCrop({ x: 0, y: 0 });
      setCoverImageZoom(1);
      setCoverImageRotation(0);
    }
  };

  // Cancel cover image crop
  const handleCancelCoverImageCrop = () => {
    setShowCoverImageCropModal(false);
    setTempCoverImagePreview(null);
    setCoverImageCrop({ x: 0, y: 0 });
    setCoverImageZoom(1);
    setCoverImageRotation(0);
  };

  // Handle cover image file selection with crop modal
  const handleCoverImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setTempCoverImagePreview(preview);
      setShowCoverImageCropModal(true);
    }
  };

  const MAX_DESCRIPTION_LENGTH = 1200;

  // Generate duration options from 30min to 4h with 15min intervals
  const generateDurationOptions = () => {
    const options = [];
    const totalMinutes = 4 * 60; // 4 hours in minutes

    for (let minutes = 30; minutes <= totalMinutes; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      let displayValue;
      if (hours === 0) {
        displayValue = `${minutes}m`;
      } else if (remainingMinutes === 0) {
        displayValue = `${hours}h`;
      } else {
        displayValue = `${hours}h ${remainingMinutes}m`;
      }

      options.push({
        value: displayValue, // Store as string (e.g., "1h 15m")
        label: displayValue,
      });
    }

    return options;
  };

  const durationOptions = generateDurationOptions();

  const formatDurationForPrice = (duration) => {
    if (!duration) return "hr";
    return String(duration).replace(/\bm\b/g, "min");
  };

  // Fetch categories and availability on component mount
  useEffect(() => {
    dispatch(getCategories());
    dispatch(getAvailability());
  }, [dispatch]);

  // ✅ Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle description character limit
    if (name === "description" && value.length > MAX_DESCRIPTION_LENGTH) {
      return; // Don't update if exceeding limit
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ✅ Handle duration change
  const handleDurationChange = (e) => {
    setFormData((prev) => ({ ...prev, duration: e.target.value }));
    if (errors.duration) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.duration;
        return next;
      });
    }
  };

  const handlePricingTypeChange = (type) => {
    setPricingType(type);
    if (errors.price || errors.duration) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.price;
        delete next.duration;
        return next;
      });
    }
    if (type !== "hourly_calendar") {
      setCalendarData(null);
    }
    if (type !== "hourly_calendar" && type !== "hourly") {
      setFormData((prev) => ({ ...prev, duration: "" }));
    }
    if (type === "fixed_on_demand") {
      setFormData((prev) => ({ ...prev, price: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Listing name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 50) {
      newErrors.description = `Description should be at least 50 characters long (${formData.description.trim().length}/50)`;
    }

    if (!coverImage) {
      newErrors.coverImage = "Cover image is required";
    }

    if (images.length < 2) {
      newErrors.images = "Please upload at least 2 listing images";
    } else if (images.length > 10) {
      newErrors.images = "You can upload a maximum of 10 images";
    }

    if (!isOnDemandPricing && !formData.price) {
      newErrors.price = "Price is required";
    }

    if (isHourlyPricing && !formData.duration) {
      newErrors.duration = "Duration is required";
    }

    const hasAnyLocationType = isOnlineSelected || isInPersonSelected;
    if (!hasAnyLocationType) {
      newErrors.locationType = "Select at least one listing location option";
    }

    if (isInPersonSelected && !formData.location.trim()) {
      newErrors.location = "Location is required for in-person listings";
    }

    if (!selectedCategory) {
      newErrors.category = "Please select a category";
    }

    return newErrors;
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in the required fields marked in red");
      const firstField = Object.keys(newErrors)[0];
      const el = document.getElementById(`field-${firstField}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector("input, textarea, select");
        if (input && typeof input.focus === "function") input.focus();
      }
      return;
    }

    setErrors({});

    // Create FormData
    const lessonFormData = new FormData();
    lessonFormData.append("title", formData.title);
    lessonFormData.append("description", formData.description);
    lessonFormData.append("duration", isHourlyPricing ? formData.duration : "");
    lessonFormData.append("price", isOnDemandPricing ? 0 : formData.price);
    lessonFormData.append("inputCurrency", listingCurrency);
    lessonFormData.append("pricingType", pricingType);
    lessonFormData.append("allowMessageWithoutPayment", allowMessageWithoutPayment);
    lessonFormData.append("category", selectedCategory);
    lessonFormData.append("isOnline", isOnlineSelected);
    lessonFormData.append("supportsInPerson", isInPersonSelected);
    lessonFormData.append("isGroupAvailable", isGroupAvailable);
    lessonFormData.append("message", formData.message || "");
    if (isGroupAvailable) {
      lessonFormData.append("usecapacity", capacity || 0);
      lessonFormData.append("discount", discount || 0);
    } else {
      lessonFormData.append("usecapacity", 0);
      lessonFormData.append("discount", 0);
    }
    lessonFormData.append("status", status);
    if (isInPersonSelected && formData.location.trim()) {
      lessonFormData.append("location", formData.location);
    }
    if (isInPersonSelected && placeId) {
      lessonFormData.append("placeId", placeId);
    }

    if (coverImage) {
      lessonFormData.append("coverImage", coverImage);
    }

    images.forEach((imgObj) => {
      if (imgObj.file instanceof Blob) {
        const file = new File([imgObj.file], `image_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        lessonFormData.append("images", file);
      } else {
        lessonFormData.append("images", imgObj.file);
      }
    });

    // Add calendar data only for calendar-based pricing.
    if (enableCalendar && calendarSelection.mode === "existing" && calendarSelection.calenderId) {
      lessonFormData.append("calender", false);
      lessonFormData.append("calenderId", calendarSelection.calenderId);
      if (calendarData?.calendarName) {
        lessonFormData.append("calendarName", calendarData.calendarName);
      }
      if (calendarData?.weeklyHours) {
        lessonFormData.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
      }
      if (calendarData?.dateSpecificHours) {
        lessonFormData.append("dateSpecificHours", JSON.stringify(calendarData.dateSpecificHours));
      }
    } else if (enableCalendar) {
      // Check if using default calendar
      if (calendarSelection.mode === "default" || !calendarData || calendarData.calendar === true) {
        lessonFormData.append("calender", true);
        // Also send slot data so backend gets per-slot group flags
        if (calendarData?.weeklyHours) {
          lessonFormData.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
        }
        if (calendarData?.dateSpecificHours) {
          lessonFormData.append("dateSpecificHours", JSON.stringify(calendarData.dateSpecificHours));
        }
      } 
      // Check if using existing calendar (calendar should be false and calenderId should exist)
      else if (calendarData.calendar === false && calendarData.calenderId) {
        lessonFormData.append("calender", false);
        lessonFormData.append("calenderId", calendarData.calenderId);
        if (calendarData.calendarName) {
          lessonFormData.append("calendarName", calendarData.calendarName);
        }
      }
      // Custom calendar with weekly and date-specific hours
      else if (calendarData.calendar === false && calendarData.weeklyHours && calendarData.dateSpecificHours) {
        lessonFormData.append("calender", false);
        lessonFormData.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
        lessonFormData.append("dateSpecificHours", JSON.stringify(calendarData.dateSpecificHours));
        lessonFormData.append("timeZone", calendarData.timeZone);
        if (calendarData.calendarName) {
          lessonFormData.append("calendarName", calendarData.calendarName);
        }
      }
    } else {
      lessonFormData.append("calender", false);
    }

    dispatch(createListing(lessonFormData)).then(async (res) => {
      if (!res?.payload?.status) {
        toast.error(res?.payload?.message || "Failed to create listing");
        return;
      }

      const listing = res.payload.listing;
      const buyerId = getRequestBuyerId(proposalRequest);

      if (isProposalFlow && buyerId && listing?._id) {
        try {
          const chatData = await dispatch(startChat({ targetUserId: buyerId })).unwrap();
          const roomId = chatData?.room?._id;
          if (roomId) {
            await dispatch(
              sendChatMessage({
                roomId,
                listingId: listing._id,
                message: proposalNote.trim() || undefined,
              })
            ).unwrap();
          }
          toast.success("Proposal sent to the buyer");
          clearProposalRequest();
          saveProposalMessage(proposalNote.trim());
          navigate("/proposal-submitted", {
            state: {
              request: proposalRequest,
              listing,
              message: proposalNote.trim(),
            },
          });
          return;
        } catch (error) {
          const errMessage =
            typeof error === "string" ? error : error?.message || "Listing created, but sending the proposal failed.";
          toast.error(errMessage);
          clearProposalRequest();
          saveProposalMessage(proposalNote.trim());
          navigate("/proposal-submitted", {
            state: {
              request: proposalRequest,
              listing,
              message: proposalNote.trim(),
            },
          });
          return;
        }
      }

      toast.success(res.payload.message || "Listing created successfully");
      navigate("/profile");
    });
  };

  return (
    <MainLayout className="mx-auto" width="1800px">
      {/* Cover Image Crop Modal */}
      {showCoverImageCropModal && tempCoverImagePreview && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <Motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Crop Lesson Cover Image</h3>
              <div
                onClick={handleCancelCoverImageCrop}
                className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X size={24} />
              </div>
            </div>

            {/* Crop Area */}
            <div className="flex-1 flex flex-col">
              <div className="relative flex-1 min-h-[300px] bg-gray-900">
                <Cropper
                  image={tempCoverImagePreview}
                  crop={coverImageCrop}
                  zoom={coverImageZoom}
                  rotation={coverImageRotation}
                  aspect={1}
                  onCropChange={setCoverImageCrop}
                  onCropComplete={onCoverImageCropComplete}
                  onZoomChange={setCoverImageZoom}
                  onRotationChange={setCoverImageRotation}
                  showGrid={true}
                />
              </div>

              {/* Controls */}
              <div className="p-4 border-t space-y-4">
                {/* Zoom Control */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Zoom</label>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setCoverImageZoom(Math.max(1, coverImageZoom - 0.1))}
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      <ZoomOut size={20} />
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={coverImageZoom}
                      onChange={(e) => setCoverImageZoom(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <div
                      onClick={() => setCoverImageZoom(Math.min(3, coverImageZoom + 0.1))}
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      <ZoomIn size={20} />
                    </div>
                  </div>
                </div>

                {/* Rotation Control */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Rotation</label>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setCoverImageRotation((coverImageRotation - 90) % 360)}
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      <RotateCw size={20} />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={coverImageRotation}
                      onChange={(e) => setCoverImageRotation(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 w-12">{coverImageRotation}°</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 p-4 border-t bg-gray-50">
                <div
                  onClick={handleCancelCoverImageCrop}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </div>
                <div
                  onClick={handleConfirmCoverImageCrop}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-black/90 transition-colors cursor-pointer text-center"
                >
                  Confirm Crop
                </div>
              </div>
            </div>
          </Motion.div>
        </Motion.div>
      )}

      <div className="min-h-screen bg-white pt-[30px] pb-10">
        <div className="w-full mx-auto">
          <div className="flex items-center gap-3 mb-[30px]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
              aria-hidden="true"
            >
              <path
                d="M12 23C14.4477 23 16.3465 22.8672 17.8271 22.5381C19.2964 22.2115 20.2925 21.7056 20.999 20.999C21.7056 20.2925 22.2115 19.2964 22.5381 17.8271C22.8672 16.3465 23 14.4477 23 12C23 9.55232 22.8672 7.65353 22.5381 6.17285C22.2115 4.70364 21.7056 3.70752 20.999 3.00098C20.2925 2.29443 19.2964 1.78846 17.8271 1.46191C16.3465 1.13284 14.4477 1 12 1C9.55232 1 7.65353 1.13284 6.17285 1.46191C4.70364 1.78846 3.70752 2.29443 3.00098 3.00098C2.29443 3.70752 1.78846 4.70364 1.46191 6.17285C1.13284 7.65353 1 9.55232 1 12C1 14.4477 1.13284 16.3465 1.46191 17.8271C1.78846 19.2964 2.29443 20.2925 3.00098 20.999C3.70752 21.7056 4.70364 22.2115 6.17285 22.5381C7.65353 22.8672 9.55232 23 12 23Z"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 8V12M12 16V12M12 12H16H8"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-[20px] sm:text-[24px] font-normal text-black tracking-tight leading-none">
              {isProposalFlow ? "Create & Send Listing Proposal" : "Create a listing"}
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* LEFT COLUMN: LESSON FORM */}
            <div className="space-y-6">
              {isProposalFlow && (
                <p className="text-sm text-gray-500">
                  Once created you&apos;ll be able to send this newly created listing to the client. This
                  listing will also be part of your seller listing in your profile!
                </p>
              )}

              {isProposalFlow && proposalRequest && (
                <div className="rounded-2xl bg-[#F7F7F7] p-4 md:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:gap-5">
                    {proposalRequest?.images?.[0]?.url ? (
                      <img
                        src={proposalRequest.images[0].url}
                        alt=""
                        className="h-28 w-28 shrink-0 rounded-2xl bg-gray-200 object-cover md:h-36 md:w-36"
                      />
                    ) : (
                      <div className="h-28 w-28 shrink-0 rounded-2xl bg-gray-300 md:h-36 md:w-36" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-600">
                          {formatRequestDate(
                            proposalRequest.updatedAt || proposalRequest.createdAt
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {proposalRequest?.user?.name || "unknown"}
                          </span>
                          <img
                            src={
                              proposalRequest?.user?.image?.url ||
                              "https://i.ibb.co/tpV3m2GW/no-image.png"
                            }
                            alt=""
                            className="h-8 w-8 rounded-sm object-cover"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-900">
                          Budget ${proposalRequest?.price}
                        </span>
                        {proposalRequest?.category && (
                          <span className="rounded-full bg-white px-3 py-1 text-gray-800">
                            {proposalRequest.category}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-sm font-semibold text-gray-900">
                        {proposalRequest.title}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {proposalRequest.description || "No description available."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div id="field-title" className={`bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border transition-colors ${errors.title ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-gray-100"}`}>
                <label className="block mb-2 text-sm font-semibold text-gray-900">Listing name *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength="300"
                  className={`w-full bg-white border ${errors.title ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50`}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.title ? (
                    <p className="text-xs text-red-500">{errors.title}</p>
                  ) : <span />}
                  <p className="text-xs text-gray-500">{formData.title.length}/300 characters</p>
                </div>
              </div>

              {/* Description */}
              <div id="field-description" className={`bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border transition-colors ${errors.description ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-gray-100"}`}>
                <label className="block mb-2 text-sm font-semibold text-gray-900">Description *</label>
                <textarea
                  name="description"
                  rows="5"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full bg-white border ${errors.description ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50 resize-none`}
                ></textarea>
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                )}
                <div className="flex justify-between text-xs mt-2">
                  <div className={formData.description.length >= 50 ? "text-green-600" : "text-amber-600"}>
                    {formData.description.length >= 50 ? "✓ Long enough" : `Minimum 50 characters (${formData.description.length}/50)`}
                  </div>
                  <div className={formData.description.length >= MAX_DESCRIPTION_LENGTH ? "text-red-600 font-medium" : "text-gray-500"}>
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </div>
                </div>
              </div>

              {/* Lesson Cover Image */}
              <div id="field-coverImage" className={`bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border transition-colors ${errors.coverImage ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-gray-100"}`}>
                <label className="block mb-2 text-sm font-semibold text-gray-900">Upload listing cover image *</label>
                <div className={`bg-white border ${errors.coverImage ? "border-red-400" : "border-gray-200"} rounded-xl p-4 space-y-4`}>
                  <div className=" flex items-center justify-center">
                  {/* Upload Button */}
                  <label className="flex items-center justify-center gap-2 text-gray-700  rounded-md px-4 py-2 text-base hover:bg-gray-50 cursor-pointer w-fit disabled:opacity-50 transition-colors">
                    <span className="flex items-center gap-1 text-black bg-[#DDDDDD] rounded-md p-2.5">
                    <GrUpload size={20} />
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageUpload}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                  </div>

                  {/* Image Preview Grid - Same as lesson images */}
                  {coverImage && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-medium text-gray-900">Preview</p>
                        <p className="text-xs text-gray-500">1/1 image</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="group relative w-24 h-24 border-2 border-gray-300 rounded-md overflow-hidden shadow-sm hover:border-blue-400 transition-all">
                          {/* Image */}
                          <img
                            src={URL.createObjectURL(coverImage)}
                            alt="cover-preview"
                            className="w-full h-full object-cover"
                          />

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                          {/* Delete Button */}
                          <div
                            onClick={() => setCoverImage(null)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Delete image"
                          >
                            ✕
                          </div>

                          {/* Edit Button - Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const preview = URL.createObjectURL(coverImage);
                                setTempCoverImagePreview(preview);
                                setShowCoverImageCropModal(true);
                              }}
                              className="pointer-events-auto px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {errors.coverImage && (
                  <p className="text-xs text-red-500 mt-2">{errors.coverImage}</p>
                )}
              </div>

              {/* Images */}
              <div id="field-images" className={`bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border transition-colors ${errors.images ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-gray-100"}`}>
                <label className="block mb-2 text-sm font-semibold text-gray-900">Upload listing images (min 2, max 10) *</label>
                <div className={`bg-white border ${errors.images ? "border-red-400" : "border-gray-200"} rounded-xl p-4 flex items-center justify-center`}>
                  <ImageUploader
                    images={images}
                    onImagesChange={(imgs) => {
                      setImages(imgs);
                      if (errors.images) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.images;
                          return next;
                        });
                      }
                    }}
                    maxImages={10}
                    minImages={2}
                    disabled={loading}
                    label="Upload Images (min 2, max 10)"
                  />
                </div>
                {errors.images && (
                  <p className="text-xs text-red-500 mt-2">{errors.images}</p>
                )}
              </div>

              {/* Listing Price */}
              <div id="field-price" className={`bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border transition-colors ${errors.price || errors.duration ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-gray-100"}`}>
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
                                    step="1"
                                    min="0"
                                    placeholder="50"
                                    className={`w-full bg-white border ${errors.price ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50`}
                                  />
                                </div>

                                {hourlyOption && (
                                  <div className="w-[215px] shrink-0">
                                    <select
                                      name="duration"
                                      value={formData.duration}
                                      onChange={handleDurationChange}
                                      disabled={loading}
                                      className={`w-full bg-white border ${errors.duration ? "border-red-400" : "border-gray-200"} rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50`}
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
                                    {payoutCurrencies.map((code) => (
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
                {errors.price && (
                  <p className="text-xs text-red-500 mt-2">{errors.price}</p>
                )}
                {errors.duration && (
                  <p className="text-xs text-red-500 mt-2">{errors.duration}</p>
                )}
              </div>

              {/* Message Without Payment */}
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

              {/* Lesson Location */}
              <div id="field-location" className={`bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border transition-colors ${errors.locationType || errors.location ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-gray-100"}`}>
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Location *</label>
                <div className={`bg-white border ${errors.locationType || errors.location ? "border-red-400" : "border-gray-200"} rounded-xl p-4 space-y-3`}>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOnlineSelected}
                        onChange={() => {
                          setIsOnlineSelected((prev) => !prev);
                          if (errors.locationType) {
                            setErrors((p) => {
                              const n = { ...p };
                              delete n.locationType;
                              return n;
                            });
                          }
                        }}
                        disabled={loading}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-sm text-gray-700">Online</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInPersonSelected}
                        onChange={() => {
                          setIsInPersonSelected((prev) => !prev);
                          if (errors.locationType) {
                            setErrors((p) => {
                              const n = { ...p };
                              delete n.locationType;
                              return n;
                            });
                          }
                        }}
                        disabled={loading}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-sm text-gray-700">In Person</span>
                    </label>
                  </div>

                  {isInPersonSelected && (
                    <div className={errors.location ? "ring-1 ring-red-400 rounded-lg p-1" : ""}>
                      <LocationAutocomplete
                        value={locationFilter}
                        onChange={(val) => {
                          setLocationFilter(val);
                          setFormData((prev) => ({ ...prev, location: val }));
                          setPlaceId("");
                          if (errors.location) {
                            setErrors((p) => {
                              const n = { ...p };
                              delete n.location;
                              return n;
                            });
                          }
                        }}
                        onSelectDetails={(details) => {
                          handleLocationSelect(details);
                          if (errors.location) {
                            setErrors((p) => {
                              const n = { ...p };
                              delete n.location;
                              return n;
                            });
                          }
                        }}
                        placeholder={`Enter location for in-person lessons`}
                        className="w-full px-0 py-0 text-sm"
                      />
                    </div>
                  )}
                </div>
                {errors.locationType && (
                  <p className="text-xs text-red-500 mt-2">{errors.locationType}</p>
                )}
                {errors.location && (
                  <p className="text-xs text-red-500 mt-2">{errors.location}</p>
                )}
              </div>

              {/* Category */}
              <div id="field-category" className={`bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border transition-colors ${errors.category ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-gray-100"}`}>
                <label className="block mb-2 text-sm font-semibold text-gray-900">Category *</label>
                <div className={`bg-white border ${errors.category ? "border-red-400" : "border-gray-200"} rounded-xl p-4`}>
                  {categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.name);
                            if (errors.category) {
                              setErrors((p) => {
                                const n = { ...p };
                                delete n.category;
                                return n;
                              });
                            }
                          }}
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
                {errors.category && (
                  <p className="text-xs text-red-500 mt-2">{errors.category}</p>
                )}
              </div>

                       <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block text-sm font-semibold text-gray-900">Message *</label>
                <span className="text-sm text-gray-500 mb-2">Add a short message students will see after booking (e.g. what to prepare or expect).</span>
                <textarea
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50 resize-none"
                ></textarea>
              </div>

              {/* Status */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-3 text-sm font-semibold text-gray-900">Lesson Status *</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Active"
                      checked={status === "Active"}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={loading}
                      className="w-4 h-4 accent-black"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Disabled"
                      checked={status === "Disabled"}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={loading}
                      className="w-4 h-4 accent-black"
                    />
                    <span className="text-sm text-gray-700">Disabled</span>
                  </label>
                </div>
              </div>

              {isProposalFlow && (
                <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-900">Proposal message</label>
                  <span className="mb-2 text-sm text-gray-500">
                    This note is sent to the buyer with your listing.
                  </span>
                  <textarea
                    rows="4"
                    value={proposalNote}
                    onChange={(e) => setProposalNote(e.target.value)}
                    disabled={loading}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-0 disabled:bg-gray-100 disabled:opacity-50"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-fit items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    {isProposalFlow ? "Submitting proposal..." : "Creating Listing..."}
                  </>
                ) : isProposalFlow ? (
                  "Submit proposal"
                ) : (
                  "Create Listing"
                )}
              </button>
            </form>
            </div>

            {/* RIGHT COLUMN: CALENDAR - Like Profile Page */}
            {enableCalendar ? (
              <div className="hidden lg:block">
                <div className=" sticky top-10 h-fit">
                  <div className="flex items-center gap-1 mb-4">
                    <h3 className="text-base font-semibold text-gray-900">My Availability</h3>
                  </div>
                  <p className="text-gray-500 text-sm mb-6">Set your availability schedule for this listing</p>

                  <div onClick={(e) => e.stopPropagation()} className="space-y-4">
                    {isLargeScreen && (
                      <MakeAvailability
                        availabilityData={{ weeklyAvailability, dateAvailability }}
                        onChange={handleCalendarChange}
                        onSelectionChange={handleCalendarSelectionChange}
                        isGroupAvailable={isGroupAvailable}
                      />
                    )}
                  </div>
                </div>
              </div>
            ):(
              <div className="w-full h-fit flex items-center justify-center">
              </div>
            )}
          </div>

          {/* Mobile Calendar Section */}
          {enableCalendar && (
          <div className="lg:hidden mt-12">
            <div className=" space-y-4">
              <div className="flex items-center gap-1 mb-2">
                <h3 className="text-base font-semibold text-gray-900">My Availability</h3>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                {!isLargeScreen && (
                  <MakeAvailability
                    availabilityData={{ weeklyAvailability, dateAvailability }}
                    onChange={handleCalendarChange}
                    onSelectionChange={handleCalendarSelectionChange}
                    isGroupAvailable={isGroupAvailable}
                  />
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateListing;
