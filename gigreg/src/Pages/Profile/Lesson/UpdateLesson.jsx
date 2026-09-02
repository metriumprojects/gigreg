import React, { useState, useEffect, useRef, useCallback } from "react";
import LocationAutocomplete from "../../Home/Components/LocationAutocomplete";
import { useDispatch, useSelector } from "react-redux";
import { Info, Loader, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { FaVideo, FaMapMarkerAlt } from "react-icons/fa";
import MainLayout from "../../../components/MainLayout";
import ImageUploader from "../../../components/ImageUploader";
import Cropper from "react-easy-crop";
import { motion } from "framer-motion";
import { deleteLesson, getLessonById, updateLesson } from "../../../redux/reducers/LessonReducer";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import { getLessonAvailability, getCurriculumAvailability, getTeacherAvailability, updateCalendar, getLessonCalendarById, getLessonCalendarByUser, getAvailability } from "../../../redux/reducers/AvailabilityReducer";
import MakeAvailability from "../../../components/MakeAvailability";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { GrUpload } from "react-icons/gr";
import { useCurrency } from "../../../currency/CurrencyContext";

const UpdateLesson = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { supportedCurrencies } = useCurrency();
  const [lessonCurrency, setLessonCurrency] = useState("USD");
  const { lesson, loading, error, successMessage } = useSelector((state) => state.lesson);
  const { categories } = useSelector((state) => state.category);
  const {
    lessonWeeklyAvailability,
    lessonDateAvailability,
    curriculumWeeklyAvailability,
    curriculumDateAvailability,
    weeklyAvailability,
    dateAvailability,
    updateCalendarLoading,
    userCalendars = [],
  } = useSelector((state) => state.availability || {});

  const [isOnlineSelected, setIsOnlineSelected] = useState(true);
  const [isInPersonSelected, setIsInPersonSelected] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [status, setStatus] = useState("Active");
  const [capacity, setCapacity] = useState("");
  const [discount, setDiscount] = useState("");
  const [isGroupAvailable, setIsGroupAvailable] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "",
    price: "",
    location: "",
  });
  const [placeId, setPlaceId] = useState("");
  const [enableCalendar, setEnableCalendar] = useState(true);
  const [calendarData, setCalendarData] = useState(null);
  const [displayCalendarData, setDisplayCalendarData] = useState({
    weeklyAvailability: {},
    dateAvailability: [],
  });
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [editedAvailabilityData, setEditedAvailabilityData] = useState(null);
  // Calendar selector: 'default' | 'existing' | 'custom'
  const [calendarSelectorMode, setCalendarSelectorMode] = useState(null); // null = not yet initialized
  const [calendarSelectorId, setCalendarSelectorId] = useState('');

  // Cover image states
  const [coverImage, setCoverImage] = useState(null); // File | null (new upload)
  const [existingCoverUrl, setExistingCoverUrl] = useState(null); // string | null (from server)
  const [coverImageCrop, setCoverImageCrop] = useState({ x: 0, y: 0 });
  const [coverImageZoom, setCoverImageZoom] = useState(1);
  const [coverImageRotation, setCoverImageRotation] = useState(0);
  const [coverImageCroppedAreaPixels, setCoverImageCroppedAreaPixels] = useState(null);
  const [showCoverImageCropModal, setShowCoverImageCropModal] = useState(false);
  const [tempCoverImagePreview, setTempCoverImagePreview] = useState(null);

  const handleCalendarChange = useCallback((data) => {
    setCalendarData(data);
  }, []);

  const handleAvailabilityChange = useCallback((data) => {
    setEditedAvailabilityData(data);
  }, []);

  // Handle calendar selector mode change in UpdateLesson
  const handleCalendarSelectorChange = (val) => {
    setEditedAvailabilityData(null);
    setDisplayCalendarData({ weeklyAvailability: {}, dateAvailability: [] });
    setCalendarData(null);
    if (val === 'default') {
      setCalendarSelectorMode('default');
      setCalendarSelectorId('');
      setIsCalendarLoading(true);
      dispatch(getAvailability()).then(() => setIsCalendarLoading(false));
    } else if (val === 'custom') {
      setCalendarSelectorMode('custom');
      setCalendarSelectorId('');
    } else {
      setCalendarSelectorMode('existing');
      setCalendarSelectorId(val);
      setIsCalendarLoading(true);
      dispatch(getLessonCalendarById({ id: val })).then((res) => {
        // Set calendar name from fetched data
        if (res?.payload?.data?.name) {
          setCalendarData({ calendarName: res.payload.data.name });
        }
        setIsCalendarLoading(false);
      });
    }
  };

  const handleSaveAvailability = () => {
    const targetCalenderId = calendarSelectorMode === 'existing' ? calendarSelectorId : lesson?.calenderId;
    if (!targetCalenderId) {
      toast.info("No calendar selected. Please choose an existing calendar to save availability.");
      return;
    }
    if (!editedAvailabilityData) {
      toast.info("No availability changes to save.");
      return;
    }

    const DAY_NAMES_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Transform weeklyAvailability (object with day indices) → weeklyHours array
    const weeklyHours = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayData = editedAvailabilityData.weeklyAvailability?.[dayIndex];
      if (dayData) {
        weeklyHours.push({
          day: DAY_NAMES_LIST[dayIndex],
          available: !dayData.unavailable,
          slots: dayData.slots || [],
        });
      }
    }

    // Transform dateAvailability array → dateSpecificHours array
    const dateSpecificHours = (editedAvailabilityData.dateAvailability || []).map((dateItem) => ({
      date: dateItem.date,
      available: !dateItem.unavailable,
      slots: dateItem.slots || [],
    }));

    const calendarData = {
      weeklyHours,
      dateSpecificHours,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    };

    dispatch(updateCalendar({ id: targetCalenderId, calendarData })).then((res) => {
      if (res?.payload?.status) {
        toast.success(res?.payload?.message || "Availability saved successfully!");
        dispatch(getLessonCalendarById({ id: targetCalenderId }));
        setEditedAvailabilityData(null);
      } else {
        toast.error(res?.payload?.message || "Failed to save availability");
      }
    });
  };

  // Cover crop handlers
  const onCoverImageCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCoverImageCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedCoverImage = async () => {
    if (!tempCoverImagePreview || !coverImageCroppedAreaPixels) return null;
    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = tempCoverImagePreview;
    return new Promise((resolve) => {
      image.onload = () => {
        const ctx = canvas.getContext("2d");
        canvas.width = coverImageCroppedAreaPixels.width;
        canvas.height = coverImageCroppedAreaPixels.height;
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
          0, 0,
          coverImageCroppedAreaPixels.width,
          coverImageCroppedAreaPixels.height
        );
        ctx.restore();
        canvas.toBlob((blob) => resolve(blob), "image/jpeg");
      };
    });
  };

  const handleConfirmCoverImageCrop = async () => {
    const croppedBlob = await getCroppedCoverImage();
    if (croppedBlob) {
      const croppedFile = new File([croppedBlob], `cover_image_${Date.now()}.jpg`, { type: "image/jpeg" });
      setCoverImage(croppedFile);
      setExistingCoverUrl(null);
      setShowCoverImageCropModal(false);
      setTempCoverImagePreview(null);
      setCoverImageCrop({ x: 0, y: 0 });
      setCoverImageZoom(1);
      setCoverImageRotation(0);
    }
  };

  const handleCancelCoverImageCrop = () => {
    setShowCoverImageCropModal(false);
    setTempCoverImagePreview(null);
    setCoverImageCrop({ x: 0, y: 0 });
    setCoverImageZoom(1);
    setCoverImageRotation(0);
  };

  const handleCoverImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setTempCoverImagePreview(preview);
      setShowCoverImageCropModal(true);
    }
  };

  const MAX_DESCRIPTION_LENGTH = 1200;

  const generateDurationOptions = () => {
    const options = [];
    for (let minutes = 30; minutes <= 240; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const rem = minutes % 60;
      let displayValue;
      if (hours === 0) displayValue = `${minutes}m`;
      else if (rem === 0) displayValue = `${hours}h`;
      else displayValue = `${hours}h ${rem}m`;
      options.push({ value: displayValue, label: displayValue });
    }
    return options;
  };

  const durationOptions = generateDurationOptions();

  const isFormValid = () => {
    const total = newImages.length + existingImages.length;
    return (
      formData.title.trim() &&
      formData.description.trim() &&
      formData.duration &&
      formData.price &&
      selectedCategory &&
      (isOnlineSelected || isInPersonSelected) &&
      (!isInPersonSelected || formData.location.trim()) &&
      total >= 2 && total <= 10
    );
  };

  // Fetch categories and lesson
  useEffect(() => {
    dispatch(getCategories());
    dispatch(getLessonById(id));
    dispatch(getLessonCalendarByUser());
    dispatch(getAvailability());
  }, [id, dispatch]);

  // Fetch calendar
  useEffect(() => {
    if (lesson && lesson._id === id) {
      setIsCalendarLoading(true);
      if (lesson.calender === true) {
        const teacherId = lesson.createdBy?._id || lesson.createdBy;
        if (teacherId) {
          dispatch(getTeacherAvailability({ id: teacherId })).then(() => setIsCalendarLoading(false));
        } else {
          setIsCalendarLoading(false);
        }
      } else if (lesson.calenderId) {
        dispatch(getLessonCalendarById({ id: lesson.calenderId })).then((res) => {
          // Set calendar name from fetched data when loading existing lesson
          if (res?.payload?.data?.name) {
            setCalendarData({ calendarName: res.payload.data.name });
          }
          setIsCalendarLoading(false);
        });
      } else {
        setIsCalendarLoading(false);
      }
    }
  }, [lesson, id, dispatch]);

  // Update display calendar
  useEffect(() => {
    if (lesson && lesson._id === id && calendarSelectorMode && calendarSelectorMode !== 'custom') {
      setDisplayCalendarData({ weeklyAvailability: weeklyAvailability || {}, dateAvailability: dateAvailability || [] });
    }
  }, [lesson, id, weeklyAvailability, dateAvailability, calendarSelectorMode]);

  // Populate form
  useEffect(() => {
    if (lesson && lesson._id === id) {
      setFormData({
        title: lesson.title || "",
        description: lesson.description || "",
        duration: lesson.duration || "",
        price: lesson.price !== undefined ? lesson.price : "",
        location: lesson.location || "",
        message: lesson.message || "",
      });
      setLessonCurrency(lesson.currency || "USD");
      setPlaceId(lesson.placeId || "");
      setSelectedCategory(lesson.category || "");
      setIsOnlineSelected(Boolean(lesson.isOnline));
      setIsInPersonSelected(Boolean(lesson.location));
      setStatus(lesson.status || "Active");
      setCapacity(lesson.usecapacity ?? "");
      setDiscount(lesson.discount ?? "");
      setIsGroupAvailable(lesson.isGroupAvailable ?? true);

      // Initialize calendar selector mode based on lesson's current calendar
      if (calendarSelectorMode === null) {
        if (lesson.calender === true) {
          setCalendarSelectorMode('default');
        } else if (lesson.calenderId) {
          setCalendarSelectorMode('existing');
          setCalendarSelectorId(lesson.calenderId);
        } else {
          setCalendarSelectorMode('custom');
        }
      }

      if (lesson.coverImage && lesson.coverImage.url) {
        // Load cover image from separate coverImage field
        setExistingCoverUrl(lesson.coverImage.url || null);
      }
      // Load lesson images (no longer includes cover at index 0)
      if (lesson.images && lesson.images.length > 0) {
        setExistingImages(lesson.images);
      }
    }
  }, [lesson, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "description" && value.length > MAX_DESCRIPTION_LENGTH) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "location") setPlaceId("");
    if (errorMessage) setErrorMessage("");
  };

  const createPreviewUrl = (file) => {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") return URL.createObjectURL(file);
    return "";
  };
  const revokePreviewUrl = (url) => {
    if (url && url.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) { toast.info("Title is required"); return; }
    if (!formData.description.trim()) { toast.info("Description is required"); return; }
    if (!formData.duration) { toast.info("Duration is required"); return; }
    if (!formData.price) { toast.info("Price is required"); return; }
    if (!selectedCategory) { toast.info("Please select a category"); return; }

    const totalImages = newImages.length + existingImages.length;
    if (totalImages < 2) { toast.info("Please upload at least 2 images total"); return; }
    if (totalImages > 10) { toast.info("Maximum 10 images allowed"); return; }
    if (!isOnlineSelected && !isInPersonSelected) { toast.info("Select at least one lesson location option"); return; }
    if (isInPersonSelected && !formData.location.trim() && !placeId) { toast.info("Location is required for in-person lessons"); return; }

    const lessonFormData = new FormData();
    lessonFormData.append("title", formData.title);
    lessonFormData.append("description", formData.description);
    lessonFormData.append("duration", formData.duration);
    lessonFormData.append("price", formData.price);
    lessonFormData.append("inputCurrency", lessonCurrency);
    lessonFormData.append("category", selectedCategory);
    lessonFormData.append("isOnline", isOnlineSelected);
    lessonFormData.append("supportsInPerson", isInPersonSelected);
    lessonFormData.append("status", status);
    lessonFormData.append("usecapacity", capacity || 0);
    lessonFormData.append("discount", discount || 0);
    lessonFormData.append("message", formData.message || "");
    lessonFormData.append("isGroupAvailable", isGroupAvailable);

    if (isInPersonSelected && formData.location.trim()) lessonFormData.append("location", formData.location);
    if (isInPersonSelected && placeId) lessonFormData.append("placeId", placeId);

    // Handle cover image separately (DO NOT include in lesson images)
    if (coverImage) {
      lessonFormData.append("coverImage", coverImage);
    } else if (existingCoverUrl && lesson?.coverImage?.public_id) {
      // Keep existing cover - pass its public_id so backend knows to keep it
      lessonFormData.append("existingCoverImageId", lesson.coverImage.public_id);
    }

    // Lesson images only (NOT including cover image)
    newImages.forEach((imgObj) => {
      if (imgObj.file instanceof Blob) {
        const file = new File([imgObj.file], `image_${Date.now()}.jpg`, { type: "image/jpeg" });
        lessonFormData.append("images", file);
      } else {
        lessonFormData.append("images", imgObj.file);
      }
    });

    // Build existing lesson image public_ids (NOT including cover image anymore)
    const existingIds = [];
    existingImages.forEach((img) => { if (img.public_id) existingIds.push(img.public_id); });
    if (existingIds.length > 0) lessonFormData.append("existingImages", JSON.stringify(existingIds));

    // Calendar selector mode takes priority over calendarData (custom mode)
    if (calendarSelectorMode === 'default') {
      lessonFormData.append("calender", true);
    } else if (calendarSelectorMode === 'existing' && calendarSelectorId) {
      lessonFormData.append("calender", false);
      lessonFormData.append("calenderId", calendarSelectorId);
    } else if (calendarSelectorMode === 'custom' && enableCalendar && calendarData) {
      if (calendarData.calendar === true) {
        lessonFormData.append("calender", true);
      } else if (calendarData.calendar === false && calendarData.calenderId) {
        lessonFormData.append("calender", false);
        lessonFormData.append("calenderId", calendarData.calenderId);
      } else if (calendarData.calendar === false && calendarData.weeklyHours && calendarData.dateSpecificHours) {
        lessonFormData.append("calender", false);
        lessonFormData.append("weeklyHours", JSON.stringify(calendarData.weeklyHours));
        lessonFormData.append("dateSpecificHours", JSON.stringify(calendarData.dateSpecificHours));
        lessonFormData.append("timeZone", calendarData.timeZone);
      }
    }

    // Send edited availability data (time + group changes) for existing calendars
    if (editedAvailabilityData) {
      if (editedAvailabilityData.weeklyAvailability) {
        lessonFormData.append("updatedWeeklyAvailability", JSON.stringify(editedAvailabilityData.weeklyAvailability));
      }
      if (editedAvailabilityData.dateAvailability) {
        lessonFormData.append("updatedDateAvailability", JSON.stringify(editedAvailabilityData.dateAvailability));
      }
    }

    try {
      await dispatch(updateLesson({ lessonId: id, formData: lessonFormData })).unwrap();
      toast.success("Lesson updated successfully!");
      
      // Handle calendar updates (availability and/or calendar name)
      const targetCalenderId = calendarSelectorMode === 'existing' ? calendarSelectorId : lesson?.calenderId;
      if (targetCalenderId) {
        const calendarUpdateData = {};

        // Include calendar name if it's been updated for existing calendars
        if (calendarSelectorMode === 'existing' && calendarData?.calendarName && calendarData.calendarName.trim()) {
          calendarUpdateData.calendarName = calendarData.calendarName;
        }

        // Save availability if there are edited availability changes
        if (editedAvailabilityData) {
          const DAY_NAMES_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

          // Transform weeklyAvailability (object with day indices) → weeklyHours array
          const weeklyHours = [];
          for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const dayData = editedAvailabilityData.weeklyAvailability?.[dayIndex];
            if (dayData) {
              weeklyHours.push({
                day: DAY_NAMES_LIST[dayIndex],
                available: !dayData.unavailable,
                slots: dayData.slots || [],
              });
            }
          }

          // Transform dateAvailability array → dateSpecificHours array
          const dateSpecificHours = (editedAvailabilityData.dateAvailability || []).map((dateItem) => ({
            date: dateItem.date,
            available: !dateItem.unavailable,
            slots: dateItem.slots || [],
          }));

          calendarUpdateData.weeklyHours = weeklyHours;
          calendarUpdateData.dateSpecificHours = dateSpecificHours;
          calendarUpdateData.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          setEditedAvailabilityData(null);
        }

        // Only call updateCalendar if there's something to update
        if (Object.keys(calendarUpdateData).length > 0) {
          await dispatch(updateCalendar({ id: targetCalenderId, calendarData: calendarUpdateData })).unwrap();
          toast.success("Calendar updated successfully!");
          dispatch(getLessonCalendarById({ id: targetCalenderId }));
        }
      }
      
      await dispatch(getLessonById(id));
      navigate('/profile?tab=My+Lessons');
      setNewImages([]);
    } catch (err) {
      toast.error(err.message || "Failed to update lesson");
    }
  };

  const deleteLessonByUser = async () => {
    if (window.confirm("Are you sure you want to delete this lesson? This action cannot be undone."))
      await dispatch(deleteLesson(id)).then((res) => {
        if (res.payload.status) {
          toast.success(res.payload.message || "Lesson deleted successfully");
          navigate("/profile");
        } else {
          toast.error(res.payload.message || "Failed to delete lesson");
        }
      });
  };

  const coverPreviewUrl = coverImage ? URL.createObjectURL(coverImage) : existingCoverUrl;

  // Helper to fetch remote image as blob and create object URL
  const getObjectUrlFromUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
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
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Crop Lesson Cover Image</h3>
              <div onClick={handleCancelCoverImageCrop} className="text-gray-500 hover:text-gray-700 cursor-pointer">
                <X size={24} />
              </div>
            </div>
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
              <div className="p-4 border-t space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Zoom</label>
                  <div className="flex items-center gap-3">
                    <div onClick={() => setCoverImageZoom(Math.max(1, coverImageZoom - 0.1))} className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"><ZoomOut size={20} /></div>
                    <input type="range" min="1" max="3" step="0.1" value={coverImageZoom} onChange={(e) => setCoverImageZoom(Number(e.target.value))} className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
                    <div onClick={() => setCoverImageZoom(Math.min(3, coverImageZoom + 0.1))} className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"><ZoomIn size={20} /></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Rotation</label>
                  <div className="flex items-center gap-3">
                    <div onClick={() => setCoverImageRotation((coverImageRotation - 90) % 360)} className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"><RotateCw size={20} /></div>
                    <input type="range" min="0" max="360" step="1" value={coverImageRotation} onChange={(e) => setCoverImageRotation(Number(e.target.value))} className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
                    <span className="text-sm text-gray-600 w-12">{coverImageRotation}°</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-4 border-t bg-gray-50">
                <div onClick={handleCancelCoverImageCrop} className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 cursor-pointer text-center">Cancel</div>
                <div onClick={handleConfirmCoverImageCrop} className="flex-1 px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-black/90 cursor-pointer text-center">Confirm Crop</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="min-h-screen bg-white py-10">
        <div className="w-full mx-auto">
          <h1 className="text-3xl font-bold mb-8">Update Lesson</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
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
                />
                <div className="flex justify-between text-xs mt-2">
                  <span className={formData.description.length >= 50 ? "text-green-600" : "text-amber-600"}>
                    {formData.description.length >= 50 ? "✓ Long enough" : `Minimum 50 characters (${formData.description.length}/50)`}
                  </span>
                  <span className={formData.description.length >= MAX_DESCRIPTION_LENGTH ? "text-red-600 font-medium" : "text-gray-500"}>
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Duration *</label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                >
                  <option value="">Select duration</option>
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Price per Lesson *</label>
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <input type="number" name="price" value={formData.price} onChange={handleChange}
                    disabled={loading} step="any" min="0.01"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black" />
                  <select value={lessonCurrency} onChange={(event) => setLessonCurrency(event.target.value)} disabled={loading}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm">
                    {supportedCurrencies.map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                </div>
              </div>
              {/* Group Lessons Available */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGroupAvailable}
                    onChange={() => setIsGroupAvailable((prev) => !prev)}
                    disabled={loading}
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-sm font-semibold text-gray-900">Allow Group Lessons</span>
                </label>
                <p className="text-xs text-gray-500 mt-2 ml-7">Enable this option if students can book this lesson together as a group</p>
              </div>

              {/* Capacity & Group Pricing - Only show if Group Lessons is enabled */}
              {isGroupAvailable && (
                <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1.5 text-sm font-semibold text-gray-900">Capacity</label>
                      <input
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        disabled={loading}
                        min="1"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-semibold text-gray-900">Group pricing</label>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        disabled={loading}
                        min="0"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cover Image */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Cover Image</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-center">
                    {/* Upload Button */}
                    <label className="flex items-center justify-center gap-2 text-gray-700 rounded-md px-4 py-2 text-base hover:bg-gray-50 cursor-pointer w-fit disabled:opacity-50 transition-colors">
                      <span className="flex items-center gap-1 bg-[#DDDDDD] rounded-md p-2.5">
                        {/* Use GrUpload icon, import at top if not already */}
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
                  {coverPreviewUrl && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-medium text-gray-900">Preview</p>
                        <p className="text-xs text-gray-500">1/1 image</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="group relative w-24 h-24 border-2 border-gray-300 rounded-md overflow-hidden shadow-sm hover:border-blue-400 transition-all">
                          {/* Image */}
                          <img
                            src={coverPreviewUrl}
                            alt="cover-preview"
                            className="w-full h-full object-cover"
                          />

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                          {/* Delete Button */}
                          <div
                            onClick={() => { setCoverImage(null); setExistingCoverUrl(null); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Delete image"
                          >
                            ✕
                          </div>

                          {/* Edit Button - Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
                            <button
                              type="button"
                              onClick={async e => {
                                e.stopPropagation();
                                let preview;
                                if (coverImage) {
                                  preview = URL.createObjectURL(coverImage);
                                } else if (existingCoverUrl) {
                                  preview = await getObjectUrlFromUrl(existingCoverUrl);
                                }
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

              {/* Lesson Images */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Images </label>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <ImageUploader
                    images={[
                      ...existingImages.map((img) => ({ ...img, preview: img.url || img.preview, isExisting: true })),
                      ...newImages,
                    ]}
                    onImagesChange={(updatedImages) => {
                      const newExisting = updatedImages.filter((img) => img.isExisting);
                      const newNew = updatedImages.filter((img) => !img.isExisting);
                      setExistingImages(newExisting.map(({ isExisting, ...rest }) => rest));
                      setNewImages(newNew);
                    }}
                    maxImages={10}
                    minImages={2}
                    disabled={loading}
                    label="Upload Images (min 2, max 10)"
                  />
                </div>
              </div>

              {/* Lesson Location */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Location</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isOnlineSelected} onChange={() => setIsOnlineSelected((prev) => !prev)} disabled={loading} className="w-4 h-4 accent-black" />
                      <span className="text-sm text-gray-700">Online</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isInPersonSelected} onChange={() => setIsInPersonSelected((prev) => !prev)} disabled={loading} className="w-4 h-4 accent-black" />
                      <span className="text-sm text-gray-700">In Person</span>
                    </label>
                  </div>
                  {isInPersonSelected && (
                    <LocationAutocomplete
                      value={formData.location}
                      onChange={(val) => { setFormData((prev) => ({ ...prev, location: val })); setPlaceId(""); }}
                      onSelectDetails={({ description, placeId: selectedPlaceId }) => {
                        setFormData((prev) => ({ ...prev, location: description || "" }));
                        setPlaceId(selectedPlaceId || "");
                      }}
                      className="w-full px-0 py-0 text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Category</label>
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
                            selectedCategory === cat.name ? "bg-black text-white border-black" : "border-gray-400 text-gray-700 hover:bg-gray-100"
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

              {/* Message */}
              <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
                <label className="block mb-2 text-sm font-semibold text-gray-900">Message</label>
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
                    <input type="radio" name="status" value="Active" checked={status === "Active"} onChange={(e) => setStatus(e.target.value)} disabled={loading} className="w-4 h-4 accent-black" />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" value="Disabled" checked={status === "Disabled"} onChange={(e) => setStatus(e.target.value)} disabled={loading} className="w-4 h-4 accent-black" />
                    <span className="text-sm text-gray-700">Disabled</span>
                  </label>
                </div>
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={loading || !isFormValid()}
                  className="w-fit bg-black text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (<><Loader size={18} className="animate-spin" />Updating Lesson...</>) : "Update Lesson"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={deleteLessonByUser}
                  className="w-fit bg-red-500 text-white font-medium px-6 py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (<><Loader size={18} className="animate-spin" />Deleting...</>) : "Delete Lesson"}
                </button>
              </div>
            </form>

            {/* RIGHT COLUMN: CALENDAR */}
            <div className="hidden lg:block">
              <div className="sticky top-10 h-fit space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Lesson Availability</h3>
                  <p className="text-gray-500 text-sm mt-1">Select or create a calendar for this lesson.</p>
                </div>

                {/* Calendar Selector */}
                <div className="space-y-3 p-4 rounded-2xl bg-[#f7f7f7]">
                  <label className="block text-sm font-semibold text-gray-900">Select Calendar</label>
                  <select
                    value={
                      calendarSelectorMode === 'default'
                        ? 'default'
                        : calendarSelectorMode === 'custom'
                        ? 'custom'
                        : calendarSelectorId || 'default'
                    }
                    onChange={(e) => handleCalendarSelectorChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:border-black appearance-none cursor-pointer"
                  >
                    <option value="default">My Default Calendar</option>
                    {userCalendars.length > 0 && (
                      <optgroup label="Existing Calendars">
                        {userCalendars.map((calendar) => (
                          <option key={calendar._id} value={calendar._id}>
                            {calendar?.name || calendar?.lesson?.title || `Calendar - ${calendar._id.slice(-6)}`}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="custom">＋ Create New Calendar</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    {calendarSelectorMode === 'default'
                      ? 'Using your default availability calendar'
                      : calendarSelectorMode === 'custom'
                      ? 'Create a new custom availability calendar'
                      : 'Using an existing calendar'}
                  </p>
                </div>

                {isCalendarLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader size={24} className="animate-spin text-black" />
                    <span className="ml-2 text-gray-600">Loading calendar...</span>
                  </div>
                ) : calendarSelectorMode === 'custom' ? (
                  <MakeAvailability
                    availabilityData={{ weeklyAvailability: {}, dateAvailability: [] }}
                    isReadOnly={false}
                    isGroupAvailable={isGroupAvailable}
                    lessonId={id}
                    onChange={handleCalendarChange}
                    customOnly={true}
                  />
                ) : (
                  <>
                    {/* Calendar Name Field for Existing Calendars */}
                    {calendarSelectorMode === 'existing' && (
                      <div className="space-y-2 p-4 rounded-2xl bg-white border border-gray-200">
                        <label className="block text-sm font-semibold text-gray-900">Calendar Name</label>
                        <input
                          type="text"
                          value={calendarData?.calendarName || ''}
                          onChange={(e) => setCalendarData({ ...calendarData, calendarName: e.target.value })}
                          placeholder="Enter calendar name"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                        />
                        <p className="text-xs text-gray-500">You can update this calendar's name</p>
                      </div>
                    )}
                    <MakeAvailability
                      availabilityData={{ weeklyAvailability: displayCalendarData.weeklyAvailability, dateAvailability: displayCalendarData.dateAvailability }}
                      isReadOnly={calendarSelectorMode === 'default'}
                      isGroupAvailable={isGroupAvailable}
                      lessonId={id}
                      onAvailabilityChange={calendarSelectorMode !== 'default' ? handleAvailabilityChange : undefined}
                    />
                  </>
                )}

                {/* Update Lesson Button - Desktop */}
                <button
                  onClick={() => document.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true }))}
                  disabled={loading || !isFormValid()}
                  className="w-full bg-black text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (<><Loader size={18} className="animate-spin" />Updating Lesson...</>) : "Update Lesson"}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Calendar */}
          <div className="lg:hidden mt-12 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Lesson Availability</h3>
              <p className="text-gray-500 text-sm mt-1">Select or create a calendar for this lesson.</p>
            </div>

            {/* Calendar Selector - Mobile */}
            <div className="space-y-3 p-4 rounded-2xl bg-[#f7f7f7]">
              <label className="block text-sm font-semibold text-gray-900">Select Calendar</label>
              <select
                value={
                  calendarSelectorMode === 'default'
                    ? 'default'
                    : calendarSelectorMode === 'custom'
                    ? 'custom'
                    : calendarSelectorId || 'default'
                }
                onChange={(e) => handleCalendarSelectorChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:border-black appearance-none cursor-pointer"
              >
                <option value="default">My Default Calendar</option>
                {userCalendars.length > 0 && (
                  <optgroup label="Existing Calendars">
                    {userCalendars.map((calendar) => (
                      <option key={calendar._id} value={calendar._id}>
                        {calendar?.name || `Calendar - ${calendar._id.slice(-6)}`}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="custom">＋ Create New Calendar</option>
              </select>
              <p className="text-xs text-gray-500">
                {calendarSelectorMode === 'default'
                  ? 'Using your default availability calendar'
                  : calendarSelectorMode === 'custom'
                  ? 'Create a new custom availability calendar'
                  : 'Using an existing calendar'}
              </p>
            </div>

            {isCalendarLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader size={24} className="animate-spin text-black" />
                <span className="ml-2 text-gray-600">Loading calendar...</span>
              </div>
            ) : calendarSelectorMode === 'custom' ? (
              <MakeAvailability
                availabilityData={{ weeklyAvailability: {}, dateAvailability: [] }}
                isReadOnly={false}
                isGroupAvailable={isGroupAvailable}
                lessonId={id}
                onChange={handleCalendarChange}
                customOnly={true}
              />
            ) : (
              <>
                {/* Calendar Name Field for Existing Calendars - Mobile */}
                {calendarSelectorMode === 'existing' && (
                  <div className="space-y-2 p-4 rounded-2xl bg-white border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-900">Calendar Name</label>
                    <input
                      type="text"
                      value={calendarData?.calendarName || ''}
                      onChange={(e) => setCalendarData({ ...calendarData, calendarName: e.target.value })}
                      placeholder="Enter calendar name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                    />
                    <p className="text-xs text-gray-500">You can update this calendar's name</p>
                  </div>
                )}
                <MakeAvailability
                  availabilityData={{ weeklyAvailability: displayCalendarData.weeklyAvailability, dateAvailability: displayCalendarData.dateAvailability }}
                  isReadOnly={calendarSelectorMode === 'default'}
                  isGroupAvailable={isGroupAvailable}
                  lessonId={id}
                  onAvailabilityChange={calendarSelectorMode !== 'default' ? handleAvailabilityChange : undefined}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default UpdateLesson;
