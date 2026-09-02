import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addLessonRating } from "../../../redux/reducers/RatingReducer";
import { toast } from "react-toastify";
import { userPastLessons } from "../../../redux/reducers/BookingReducer";

export default function ReviewModal({ open, onClose, lesson }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.rating);

  const [rating, setRating] = useState(1); // This will now be a percentage (1-100)
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const sliderRef = useRef(null);
  const containerRef = useRef(null);

  // Handle mouse events for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      
      e.preventDefault();
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const width = containerRect.width;
      
      let newRating = Math.round((x / width) * 100);
      newRating = Math.max(1, Math.min(100, newRating)); // Clamp between 1-100
      setRating(newRating);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none"; // Prevent text selection while dragging
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  // Handle touch events for mobile
  useEffect(() => {
    const handleTouchMove = (e) => {
      if (!isDragging || !containerRef.current || !e.touches[0]) return;
      
      e.preventDefault();
      const containerRect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - containerRect.left;
      const width = containerRect.width;
      
      let newRating = Math.round((x / width) * 100);
      newRating = Math.max(1, Math.min(100, newRating));
      setRating(newRating);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

      const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);

      const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

  const scheduledAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleMouseDown = (e) => {
    if (loading) return;
    setIsDragging(true);
    
    // Set initial rating based on click position
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const width = containerRect.width;
    
    let newRating = Math.round((x / width) * 100);
    newRating = Math.max(1, Math.min(100, newRating));
    setRating(newRating);
  };

  const handleTouchStart = (e) => {
    if (loading || !e.touches[0]) return;
    setIsDragging(true);
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - containerRect.left;
    const width = containerRect.width;
    
    let newRating = Math.round((x / width) * 100);
    newRating = Math.max(1, Math.min(100, newRating));
    setRating(newRating);
  };

  const handleSliderClick = (e) => {
    if (loading) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const width = containerRect.width;
    
    let newRating = Math.round((x / width) * 100);
    newRating = Math.max(1, Math.min(100, newRating));
    setRating(newRating);
  };

  // Handle submit
  const handleSubmit = () => {
    if (rating === 0) {
      alert("Please set your satisfaction level!");
      return;
    }

    const formData = new FormData();

    // Determine the booking type
    const bookingType = lesson?.type || lesson?.bookingType || (lesson?.curriculumId ? 'curriculum' : 'lesson');
    
    // For lesson type: lId is the lesson ID
    // For curriculum type: lId is the lesson ID within the curriculum
    const lessonOrCurriculumId = lesson?.lessonId || lesson?.lId;
    
    // Booking ID is the actual booking document ID
    const bookingId = lesson?._id || lesson?.bookingId || lesson?.lId;

    // Required API Fields
    formData.append("id", lessonOrCurriculumId); // lesson/curriculum ID for rating
    formData.append("bookingId", bookingId); // booking ID for updating review status
    formData.append("rating", rating); // Now a percentage (0-100)
    formData.append("review", description);
    formData.append("type", bookingType);

    // Image
    if (image) {
      formData.append("image", image);
    }

    // Dispatch to API
    dispatch(addLessonRating(formData)).then((res) => {
      if (res?.payload.status) {
        toast.success(res?.payload?.message);
            dispatch(userPastLessons({ 
              scheduledAt, 
              timezone,
              page: 1,
              limit: 10 
            }))
        onClose();
      } else {
        toast.error(res?.payload?.message || "Please check your network issue");
      }
    });
  };

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
    }
  };

  // Get satisfaction label based on percentage
  const getSatisfactionLabel = () => {
    if (rating === 1) return "Not satisfied";
    if (rating <= 20) return "Very unsatisfied";
    if (rating <= 40) return "Unsatisfied";
    if (rating <= 60) return "Neutral";
    if (rating <= 80) return "Satisfied";
    return "Very satisfied";
  };

  // Get color based on rating
  const getProgressColor = () => {
    if (rating <= 20) return "bg-red-500";
    if (rating <= 40) return "bg-orange-500";
    if (rating <= 60) return "bg-yellow-500";
    if (rating <= 80) return "bg-lime-500";
    return "bg-green-500";
  };

  // Return null if modal is not open
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[#00000058] flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 relative">

        {/* Close Button */}
        <button
          className="absolute top-3 right-3 text-gray-500 text-2xl disabled:opacity-50"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-5">
          Leave a review for your lesson
        </h2>

        {/* Satisfaction Slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium">
              Satisfaction Level
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{rating}%</span>
              <span className="text-sm text-gray-600">{getSatisfactionLabel()}</span>
            </div>
          </div>

          {/* Slider Container */}
          <div 
            ref={containerRef}
            className="relative h-4 cursor-pointer"
            onClick={handleSliderClick}
          >
            {/* Background Track */}
            <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
            
            {/* Progress Fill */}
            <div 
              className={`absolute  h-full rounded-full ${getProgressColor()} transition-all duration-150`}
              style={{ width: `${rating}%` }}
            ></div>
            
            {/* Draggable Handle */}
            <div
              ref={sliderRef}
              className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full bg-white border-4 ${getProgressColor()} shadow-lg cursor-grab active:cursor-grabbing ${
                loading ? "cursor-not-allowed opacity-50" : ""
              }`}
              style={{ left: `${rating}%`, transform: 'translate(-50%, 0%)' }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onDragStart={(e) => e.preventDefault()} // Prevent default drag behavior
            ></div>

            {/* Scale Marks */}
            <div className="absolute -bottom-6 w-full flex justify-between text-xs text-gray-500">
              <span>1%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <label className="block text-sm mb-2">Description</label>
        <textarea
          className="w-full h-48 border border-gray-800 rounded-md p-3 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          value={description}
          onChange={(e) => !loading && setDescription(e.target.value)}
          disabled={loading}
          placeholder="Share your experience..."
        ></textarea>

        {/* Attach Image */}
        <label className={`border mt-5 px-4 py-2 rounded-md flex items-center gap-3 cursor-pointer ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={loading}
          />
          <span className="text-2xl">📎</span>
          <span>{image ? image.name : "Attach image"}</span>
        </label>

        {/* Preview */}
        {image && (
          <img
            src={URL.createObjectURL(image)}
            alt="Preview"
            className="w-32 h-32 mt-3 object-cover rounded-md border"
          />
        )}

        {/* Submit Button with Loading State */}
        <button
          className="w-full bg-[#008CFF] text-white mt-6 py-3 rounded-md text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            "Leave review"
          )}
        </button>
      </div>
    </div>
  );
}