import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion"
import { useDispatch, useSelector } from "react-redux";
import { Loader } from "lucide-react";
import { FaPaperclip, FaVideo, FaMapMarkerAlt } from "react-icons/fa";
import MainLayout from "../../../components/MainLayout";
import {
  createLesson,
} from "../../../redux/reducers/LessonReducer";
import { getAvailability } from "../../../redux/reducers/AvailabilityReducer";
import { toast } from "react-toastify";
import { sendChatMessage, startChat } from "../../../redux/reducers/ChatReducer";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import MakeAvailability from "../../../components/MakeAvailability";
import { useCurrency } from "../../../currency/CurrencyContext";
import useTeacherPayoutCurrencies from "../../../hooks/useTeacherPayoutCurrencies";
import { useNavigate } from "react-router-dom";

const CreateLessonPopup = ({
  open = false,
  onClose = () => {},
  request = null,
}) => {
  const { currency } = useCurrency();
  const { payoutCurrencies, payoutCurrenciesLoading, stripePayoutReady } = useTeacherPayoutCurrencies();
  const navigate = useNavigate();
  const [lessonCurrency, setLessonCurrency] = useState(currency);
  useEffect(() => {
    if (open && !payoutCurrenciesLoading && !stripePayoutReady) {
      toast.info("Set up and verify your Stripe payout account before creating a lesson.");
      onClose();
      navigate("/withdraw-request");
    }
  }, [navigate, onClose, open, payoutCurrenciesLoading, stripePayoutReady]);
  useEffect(() => {
    if (payoutCurrencies.length && !payoutCurrencies.includes(lessonCurrency)) setLessonCurrency(payoutCurrencies[0]);
  }, [payoutCurrencies, lessonCurrency]);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const { categories, loading } = useSelector((state) => state.category);
  const { weeklyAvailability, dateAvailability } = useSelector((state) => state.availability || {});
  const [locationType, setLocationType] = useState("online");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState("Active");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "",
    price: "",
    location: "",
  });
  const [lessonMessage, setLessonMessage] = useState("");
  const [enableCalendar, setEnableCalendar] = useState(true);
  const [calendarData, setCalendarData] = useState(null);

  // Memoized callback for calendar changes to prevent infinite loops
  const handleCalendarChange = useCallback((data) => {
    setCalendarData(data);
  }, []);

  const MAX_DESCRIPTION_LENGTH = 1200;

  // Check if all required fields are filled (message is optional)
  const isFormValid = () => {
    return (
      formData.title.trim() &&
      formData.description.trim() &&
      formData.description.length >= 50 && // Minimum 50 characters
      formData.duration &&
      formData.price &&
      selectedCategory &&
      (locationType === "online" || (locationType === "inPerson" && formData.location.trim())) &&
      images.length >= 4 // Minimum 4 images
    );
  };

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

  // Helper function to create preview URL
  const createPreviewUrl = (file) => {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      return URL.createObjectURL(file);
    }
    return "";
  };

  // Helper function to revoke preview URL
  const revokePreviewUrl = (url) => {
    if (url && url.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(url);
    }
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
    if (name === "description") {
      if (value.length > MAX_DESCRIPTION_LENGTH) {
        return; // Don't update if exceeding limit
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Handle duration change
  const handleDurationChange = (e) => {
    setFormData((prev) => ({ ...prev, duration: e.target.value }));
  };

  // ✅ Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const totalAfterUpload = files.length + images.length;
    
    if (totalAfterUpload > 10) {
      toast.info("You can upload a maximum of 10 images.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    
    const newImages = files.map((file) => ({
      file,
      preview: createPreviewUrl(file),
    }));
    
    setImages((prev) => [...prev, ...newImages]);
    
    // Reset the file input so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ✅ Remove uploaded image
  const removeImage = (index) => {
    setImages((prev) => {
      const imageToRemove = prev[index];
      if (imageToRemove?.preview) {
        revokePreviewUrl(imageToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
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

    if (formData.description.length < 50) {
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

    if (images.length < 4) {
      toast.info("Please upload at least 4 images");
      return;
    }

    if (images.length > 10) {
      toast.info("Maximum 10 images allowed");
      return;
    }

    if (locationType === "inPerson" && !formData.location.trim()) {
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
    lessonFormData.append("isOnline", locationType === "online");
    lessonFormData.append("status", status);
    if (locationType === "inPerson") {
      lessonFormData.append("location", formData.location);
    }

    // Add images as binary files
    images.forEach((imgObj) => {
      lessonFormData.append("images", imgObj.file);
    });

    // Add calendar data based on mode
    if (enableCalendar && calendarData) {
      // Check if using default calendar
      if (calendarData.calendar === true) {
        lessonFormData.append("calender", true);
      } 
      // Check if using existing calendar (calendar should be false and calenderId should exist)
      else if (calendarData.calendar === false && calendarData.calenderId) {
        lessonFormData.append("calender", false);
        lessonFormData.append("calenderId", calendarData.calenderId);
      }
      // Custom calendar with weekly and date-specific hours
      else if (calendarData.calendar === false && calendarData.weeklyHours && calendarData.dateSpecificHours) {
        lessonFormData.append("calender", false);
        lessonFormData.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
        lessonFormData.append("dateSpecificHours", JSON.stringify(calendarData.dateSpecificHours));
        lessonFormData.append("timeZone", calendarData.timeZone);
      }
    } else {
      lessonFormData.append("calender", false);
    }

    try {
      const res = await dispatch(createLesson(lessonFormData)).unwrap();
      toast.success(res?.message || "Lesson created successfully");
      const createdLesson = res?.lesson;

      if (createdLesson && request?.user?._id) {
        try {
          const { room } = await dispatch(
            startChat({
              targetUserId: request.user._id,
            })
          ).unwrap();

          await dispatch(
            sendChatMessage({
              roomId: room._id,
              lessonId: createdLesson._id,
              message: lessonMessage.trim() || undefined, // Message is optional
            })
          ).unwrap();

          toast.success("Lesson shared via chat.");
        } catch (chatError) {
          const errMsg =
            typeof chatError === "string"
              ? chatError
              : chatError?.message || "Lesson created, but chat failed.";
          toast.error(errMsg);
        }
      }

      // Reset form on success
      setFormData({
        title: "",
        description: "",
        duration: "",
        price: "",
        location: "",
      });
      setLessonMessage("");
      setImages([]);
      setSelectedCategory("");
      setLocationType("online");
      onClose();
    } catch (error) {
      const errMsg =
        typeof error === "string"
          ? error
          : error?.message || "Failed to create lesson";
      toast.error(errMsg);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 bg-[#00000079] flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="max-h-[80vh] rounded-md bg-white flex items-center justify-center py-10 relative max-w-5xl mx-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg py-6 space-y-8 px-6 h-[80vh] overflow-scroll hide-scrollbar"
        >
          <h2 className="text-lg text-gray-800 text-left">
            Create A Lesson
          </h2>

          {/* Title */}
          <div>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title (300 character max)"
              disabled={loading}
              maxLength="300"
              className="w-full border-2 border-gray-900 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:opacity-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.title.length}/300 characters
            </p>
          </div>

          {/* Description with character count */}
          <div>
            <textarea
              name="description"
              rows="5"
              value={formData.description}
              onChange={handleChange}
              placeholder={`Description (${MAX_DESCRIPTION_LENGTH} character max)`}
              disabled={loading}
              className="w-full border-2 border-gray-900 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:opacity-50"
            ></textarea>
            <div className="flex justify-between items-center mt-1">
              <div className="text-sm text-gray-500">
                {formData.description.length >= 50 ? (
                  <span className="text-green-600">✓ At least 50 characters</span>
                ) : (
                  <span className="text-amber-600">Minimum 50 characters required</span>
                )}
              </div>
              <div className={`
                text-sm font-medium
                ${formData.description.length > MAX_DESCRIPTION_LENGTH - 100 
                  ? 'text-amber-600' 
                  : 'text-gray-500'
                }
                ${formData.description.length >= MAX_DESCRIPTION_LENGTH 
                  ? 'text-red-600' 
                  : ''
                }
              `}>
                {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>
          </div>

          {/* Lesson Duration */}
          <div>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleDurationChange}
              disabled={loading}
              className="w-full border-2 border-gray-900 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:opacity-50"
            >
              <option value="">Select duration</option>
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Select lesson duration from 30 minutes to 4 hours
            </p>
          </div>

          {/* Price */}
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Lesson price"
              disabled={loading}
              step="any"
              min="0.01"
              className="w-full border-2 border-gray-900 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:opacity-50"
            />
            <select value={lessonCurrency} onChange={(event) => setLessonCurrency(event.target.value)} disabled={loading}
              className="border-2 border-gray-900 rounded-md px-2 text-sm">
              {payoutCurrencies.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </div>

          {/* Attach Image */}
          <div>
            <label className="flex items-center gap-2 text-gray-700 border-2 border-gray-900 rounded-md px-4 py-3 text-base hover:bg-gray-50 cursor-pointer w-fit disabled:opacity-50 transition-colors">
              <FaPaperclip /> Upload Images (min 4, max 10)
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
            
            {/* Image count and validation */}
            <div className="mt-2">
              <p className={`text-sm font-medium ${
                images.length >= 4 ? 'text-green-600' : 'text-red-600'
              }`}>
                {images.length}/10 images ({images.length >= 4 ? '✓ Minimum reached' : 'Need at least 4 images'})
              </p>
            </div>

            {/* Preview uploaded images */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className="relative w-24 h-24 border-2 border-blue-300 rounded-md overflow-hidden shadow-sm"
                  >
                    <img
                      src={img.preview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      disabled={loading}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs disabled:opacity-50 hover:bg-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lesson location */}
          <div className="border-2 border-gray-900 rounded-md p-4 space-y-3">
            <p className="text-base font-medium text-gray-700">
              Lesson location
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-base cursor-pointer">
                <input
                  type="radio"
                  name="lessonLocation"
                  checked={locationType === "online"}
                  onChange={() => setLocationType("online")}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <FaVideo className="text-gray-600" />
                Online
              </label>

              <label className="flex items-center gap-2 text-base cursor-pointer">
                <input
                  type="radio"
                  name="lessonLocation"
                  checked={locationType === "inPerson"}
                  onChange={() => setLocationType("inPerson")}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <FaMapMarkerAlt className="text-gray-600" />
                In person
              </label>
            </div>

            {locationType === "inPerson" && (
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter your city or location"
                disabled={loading}
                className="w-full border-2 border-gray-900 rounded-md py-2 px-4 text-base focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:opacity-50"
              />
            )}
          </div>

          {/* Categories */}
          <div className="border-2 border-gray-900 rounded-md p-4">
            <p className="text-base font-medium text-gray-700 mb-3">
              Select main category:
            </p>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-full border text-base transition-all disabled:opacity-50 ${
                      selectedCategory === cat.name
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "border-gray-400 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {cat.name || cat}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Loading categories...</p>
            )}
          </div>

          {/* Status */}
          <div className="border-2 border-gray-900 rounded-md p-4 space-y-3">
            <p className="text-base font-medium text-gray-700">Lesson Status</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-base cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={status === "Active"}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <span className="text-green-600 font-medium">Active</span>
              </label>

              <label className="flex items-center gap-2 text-base cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Disabled"
                  checked={status === "Disabled"}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <span className="text-red-600 font-medium">Disabled</span>
              </label>
            </div>
          </div>

          {/* Optional Message - Only show if there's a request */}
          {request?.user?._id && (
            <div>
              <p className="text-base font-medium text-gray-700 mb-2">
                Send a message with this lesson <span className="text-gray-500 text-sm">(optional)</span>
              </p>
              <textarea
                placeholder="Add an optional message to send with this lesson..."
                className="w-full border-2 border-gray-300 rounded-lg p-3 h-28 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={lessonMessage}
                onChange={(e) => setLessonMessage(e.target.value)}
                disabled={loading}
              ></textarea>
              <p className="text-sm text-gray-500 mt-1">
                {lessonMessage.length} characters (optional)
              </p>
            </div>
          )}

          {/* Calendar Section */}
          <div className="border border-gray-400 rounded-md p-4 space-y-4">
            <div>
              <h3 className="text-base font-medium text-gray-700 mb-2">
                Lesson Availability Schedule
              </h3>
              <p className="text-sm text-gray-500">
                Your profile calendar is displayed below. You can make changes here if needed.
              </p>
            </div>
            
            <div className="mt-4 border-t pt-4" onClick={(e) => e.stopPropagation()}>
              <MakeAvailability 
                availabilityData={{ weeklyAvailability, dateAvailability }}
                onChange={handleCalendarChange}
              />
            </div>
          </div>

          {/* Form Validation Status */}
          <div className={`p-4 rounded-md ${
            isFormValid() ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
          }`}>
            <p className="font-medium">
              {isFormValid() ? '✓ All requirements met - Ready to create!' : 'Please fill all required fields and upload at least 4 images'}
            </p>
            {!isFormValid() && (
              <ul className="text-sm mt-2 space-y-1">
                {!formData.title.trim() && <li>• Title is required</li>}
                {!formData.description.trim() && <li>• Description is required</li>}
                {formData.description.length < 50 && <li>• Description needs at least 50 characters</li>}
                {!formData.duration && <li>• Duration is required</li>}
                {!formData.price && <li>• Price is required</li>}
                {!selectedCategory && <li>• Category is required</li>}
                {images.length < 4 && <li>• At least 4 images required</li>}
                {locationType === "inPerson" && !formData.location.trim() && <li>• Location is required for in-person lessons</li>}
              </ul>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="w-full bg-primary text-white py-3 rounded-md text-base font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Creating Lesson...
              </>
            ) : (
              "Create lesson"
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateLessonPopup;
