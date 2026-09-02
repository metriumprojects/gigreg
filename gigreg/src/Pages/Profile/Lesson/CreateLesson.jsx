import React, { useState, useEffect, useRef, useCallback } from "react";
import LocationAutocomplete from "../../Home/Components/LocationAutocomplete";
import { useDispatch, useSelector } from "react-redux";
import { Loader, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { FaVideo, FaMapMarkerAlt } from "react-icons/fa";
import MainLayout from "../../../components/MainLayout";
import ImageUploader from "../../../components/ImageUploader";
import Cropper from "react-easy-crop";
import { motion } from "framer-motion";
import {
  createLesson
} from "../../../redux/reducers/LessonReducer";
import { getAvailability } from "../../../redux/reducers/AvailabilityReducer";
import { toast } from "react-toastify";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import MakeAvailability from "../../../components/MakeAvailability";
import { useNavigate } from "react-router-dom";
import { GrUpload } from "react-icons/gr";
import { useCurrency } from "../../../currency/CurrencyContext";
import useTeacherPayoutCurrencies from "../../../hooks/useTeacherPayoutCurrencies";

const CreateLesson = () => {
  const { currency } = useCurrency();
  const { payoutCurrencies, payoutCurrenciesLoading, stripePayoutReady } = useTeacherPayoutCurrencies();
  const [lessonCurrency, setLessonCurrency] = useState(currency);
  useEffect(() => {
    if (payoutCurrencies.length && !payoutCurrencies.includes(lessonCurrency)) setLessonCurrency(payoutCurrencies[0]);
  }, [payoutCurrencies, lessonCurrency]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useEffect(() => {
    if (!payoutCurrenciesLoading && !stripePayoutReady) {
      toast.info("Set up and verify your Stripe payout account before creating a lesson.");
      navigate("/withdraw-request", { replace: true });
    }
  }, [navigate, payoutCurrenciesLoading, stripePayoutReady]);
  const { categories,  } = useSelector(
    (state) => state.category
  );
  const { loading, error, successMessage } = useSelector((state) => state.lesson);
  const { weeklyAvailability, dateAvailability } = useSelector((state) => state.availability || {});
  const [isOnlineSelected, setIsOnlineSelected] = useState(true);
  const [isInPersonSelected, setIsInPersonSelected] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [images, setImages] = useState([]);
  const [coverImage, setCoverImage] = useState(null);
  const [status, setStatus] = useState("Active");
  const [capacity, setCapacity] = useState("");
  const [discount, setDiscount] = useState("");
  const [isGroupAvailable, setIsGroupAvailable] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "",
    price: "",
    location: "",
    message: "Hi, your lesson is confirmed! Looking forward to working with you. I’ll review your goals ahead of the session so we can make the most of our time. If there’s anything specific you want to focus on or prepare, feel free to send it over in advance.",
  });
  const [placeId, setPlaceId] = useState("");
  const [enableCalendar, setEnableCalendar] = useState(true);
  const [calendarData, setCalendarData] = useState(null);
  const [calendarSelection, setCalendarSelection] = useState({ mode: "default", calenderId: null });
  const [isLargeScreen, setIsLargeScreen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true
  );
  // For LocationAutocomplete
  const [locationFilter, setLocationFilter] = useState("");
  
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

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.title.trim() &&
      formData.description.trim() &&
      formData.duration &&
      formData.price &&
      selectedCategory &&
      coverImage &&
      images.length >= 2 && images.length <= 10 &&
      (isOnlineSelected || isInPersonSelected) &&
      (!isInPersonSelected || formData.location.trim())
    );
  };

  // Fetch categories and availability on component mount
  useEffect(() => {
    dispatch(getCategories());
    dispatch(getAvailability());
  }, []);

  // ✅ Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle description character limit
    if (name === "description" && value.length > MAX_DESCRIPTION_LENGTH) {
      return; // Don't update if exceeding limit
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Handle duration change
  const handleDurationChange = (e) => {
    setFormData((prev) => ({ ...prev, duration: e.target.value }));
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.info("Title is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.info("Description is required");
      return;
    }

    if (formData.description.trim().length < 50) {
      toast.info("Description should be at least 50 characters long");
      return;
    }

    if (!formData.duration) {
      toast.info("Duration is required");
      return;
    }

    if (!formData.price) {
      toast.info("Price is required");
      return;
    }

    if (!selectedCategory) {
      toast.info("Please select a category");
      return;
    }

    if (!coverImage) {
      toast.info("Please upload a lesson cover image");
      return;
    }

    if (images.length < 2) {
      toast.info("Please upload at least 2 lesson images");
      return;
    }
    if (images.length > 10) {
      toast.info("You can upload a maximum of 10 images");
      return;
    }

    const hasAnyLocationType = isOnlineSelected || isInPersonSelected;
    if (!hasAnyLocationType) {
      toast.info("Select at least one lesson location option");
      return;
    }

    if (isInPersonSelected && !formData.location.trim()) {
      toast.info("Location is required for in-person lessons");
      return;
    }

    // Create FormData
    const lessonFormData = new FormData();
    lessonFormData.append("title", formData.title);
    lessonFormData.append("description", formData.description);
    lessonFormData.append("duration", formData.duration);
    lessonFormData.append("price", formData.price);
    lessonFormData.append("inputCurrency", lessonCurrency);
    lessonFormData.append("category", selectedCategory);
    lessonFormData.append("isOnline", isOnlineSelected);
    lessonFormData.append("supportsInPerson", isInPersonSelected);
    lessonFormData.append("isGroupAvailable", isGroupAvailable);
    lessonFormData.append("message", formData.message || "");
    // Only append capacity and discount if group availability is enabled
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

    // Add cover image separately
    if (coverImage) {
      lessonFormData.append("images", coverImage);
    }

    // Add other lesson images (no longer index 0)
    images.forEach((imgObj) => {
      if (imgObj.file instanceof Blob) {
        // If it's a cropped image (Blob), create a File from it
        const file = new File([imgObj.file], `image_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        lessonFormData.append("images", file);
      } else {
        // If it's the original file
        lessonFormData.append("images", imgObj.file);
      }
    });

    // Add calendar data if enabled
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
    } else if (enableCalendar && calendarData) {
      // Check if using default calendar
      if (calendarSelection.mode === "default" || calendarData.calendar === true) {
        lessonFormData.append("calender", true);
        // Also send slot data so backend gets per-slot group flags
        if (calendarData.weeklyHours) {
          lessonFormData.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
        }
        if (calendarData.dateSpecificHours) {
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
        // Also send slot data so backend gets per-slot group flags
        if (calendarData.weeklyHours) {
          lessonFormData.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
        }
        if (calendarData.dateSpecificHours) {
          lessonFormData.append("dateSpecificHours", JSON.stringify(calendarData.dateSpecificHours));
        }
      }
      // Custom calendar with weekly and date-specific hours
      else if (calendarSelection.mode === "custom" || (calendarData.calendar === false && calendarData.weeklyHours && calendarData.dateSpecificHours)) {
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

    dispatch(createLesson(lessonFormData)).then((res) => {
      if (res?.payload?.status) {
        toast.success(res.payload.message || "Lesson created successfully");
        // Reset form on success
        setFormData({
          title: "",
          description: "",
          duration: "",
          price: "",
          location: "",
          message: "",
        });
        setPlaceId("");
        setImages([]);
        setCoverImage(null);
        setSelectedCategory("");
        setIsOnlineSelected(true);
        setIsInPersonSelected(false);
        setCapacity("");
        setDiscount("");
        setIsGroupAvailable(false);
        setCalendarData(null);
        navigate(`/lesson-booking/${res.payload.lesson._id}`);
        // Keep enableCalendar as true (calendar always visible)
      } else {
        toast.error(res?.payload?.message || "Failed to create lesson");
      }
    });
  };

  return (
    <MainLayout className="mx-auto" width="1800px">
      {/* Cover Image Crop Modal */}
      {showCoverImageCropModal && tempCoverImagePreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
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
          </motion.div>
        </motion.div>
      )}

      <div className="min-h-screen bg-white py-10">
        <div className="w-full mx-auto">
          <h1 className="text-3xl font-bold mb-8">Create A Lesson</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN: LESSON FORM */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength="300"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.title.length}/300 characters</p>
              </div>

              {/* Description */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Description *</label>
                <textarea
                  name="description"
                  rows="5"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50 resize-none"
                ></textarea>
                <div className="flex justify-between text-xs mt-2">
                  <div className={formData.description.length >= 50 ? "text-green-600" : "text-amber-600"}>
                    {formData.description.length >= 50 ? "✓ Long enough" : `Minimum 50 characters (${formData.description.length}/50)`}
                  </div>
                  <div className={formData.description.length >= MAX_DESCRIPTION_LENGTH ? "text-red-600 font-medium" : "text-gray-500"}>
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Duration *</label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleDurationChange}
                  disabled={loading}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                >
                  <option value="">Select duration</option>
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson price *</label>
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <input type="number" name="price" value={formData.price} onChange={handleChange}
                    disabled={loading} step="any" min="0.01"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black" />
                  <select value={lessonCurrency} onChange={(event) => setLessonCurrency(event.target.value)} disabled={loading}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm">
                    {payoutCurrencies.map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                </div>
              </div>

              {/* Capacity & Discount */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <div className="space-y-4">
                  {/* Group Availability Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGroupAvailable}
                      onChange={() => setIsGroupAvailable((prev) => !prev)}
                      disabled={loading}
                      className="w-4 h-4 accent-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">Group Availability</span>
                    </div>
                  </label>

                  {/* Capacity & Discount Fields - Show only if Group Available is checked */}
                  {isGroupAvailable && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                      <div>
                        <label className="block mb-1.5 text-sm font-semibold text-gray-900">Capacity</label>
                        <input
                          type="number"
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          disabled={loading}
                          min="2"
                          placeholder=""
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                        />
                       
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-semibold text-gray-900">Group Discount </label>
                        <input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          disabled={loading}
                          min="0"
                          placeholder=""
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lesson Cover Image */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Cover Image *</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className=" flex items-center justify-center">
                  {/* Upload Button */}
                  <label className="flex items-center justify-center gap-2 text-gray-700  rounded-md px-4 py-2 text-base hover:bg-gray-50 cursor-pointer w-fit disabled:opacity-50 transition-colors">
                    <span className="flex items-center gap-1 bg-[#DDDDDD] rounded-md p-2.5">
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
              </div>

              {/* Images */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Images *</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center">
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

              {/* Lesson Location */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Location *</label>
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
                    <div>
                      <LocationAutocomplete
                        value={locationFilter}
                        onChange={(val) => {
                          setLocationFilter(val);
                          setFormData((prev) => ({ ...prev, location: val }));
                          setPlaceId("");
                        }}
                        onSelectDetails={handleLocationSelect}
                        placeholder={`Enter location for in-person lessons`}
                        className="w-full px-0 py-0 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>



              {/* Category */}
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



              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="w-fit bg-black text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Creating Lesson...
                  </>
                ) : (
                  "Create Lesson"
                )}
              </button>
            </form>

            {/* RIGHT COLUMN: CALENDAR - Like Profile Page */}
            <div className="hidden lg:block">
              <div className=" sticky top-10 h-fit">
                <div className="flex items-center gap-1 mb-4">
                  <h3 className="text-base font-semibold text-gray-900">My Availability</h3>
                </div>
                <p className="text-gray-500 text-sm mb-6">Set your availability schedule for this lesson</p>

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
          </div>

          {/* Mobile Calendar Section */}
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
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateLesson;
