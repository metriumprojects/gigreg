import React, { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { CancelBooking, userMainUpcomingBookings, userPastLessons } from "../../../redux/reducers/BookingReducer";
import { startChat } from "../../../redux/reducers/ChatReducer";
import ReviewModal from "./ReviewModal";
import moment from "moment-timezone";
import { toast } from "react-toastify";
import { useCurrency } from "../../../currency/CurrencyContext";

export default function StudentDashboard() {
  const { formatPrice } = useCurrency();
  const [openReview, setOpenReview] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // New state for tab management
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { startChatLoading } = useSelector((state) => state.chat);
  
  // Pagination states for upcoming lessons
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingLimit] = useState(10);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  
  // Pagination states for past lessons
  const [pastPage, setPastPage] = useState(1);
  const [pastLimit] = useState(10);
  const [pastTotal, setPastTotal] = useState(0);

  // Get data from Redux store
  const { 
    userMainUpcomingData, 
    userPastLessonsData,
    loadingStates 
  } = useSelector((state) => state.book);

  // Fetch data on component mount with pagination
  useEffect(() => {
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
    
    // Fetch upcoming lessons with pagination
    dispatch(userMainUpcomingBookings({ 
      scheduledAt, 
      timezone,
      page: upcomingPage,
      limit: upcomingLimit 
    })).then((response) => {
      // Assuming your API response has total count
      if (response?.payload?.total) {
        setUpcomingTotal(response.payload.total);
      }
    });
    
    // Fetch past lessons with pagination
    dispatch(userPastLessons({ 
      scheduledAt, 
      timezone,
      page: pastPage,
      limit: pastLimit 
    })).then((response) => {
      // Assuming your API response has total count
      if (response?.payload?.total) {
        setPastTotal(response.payload.total);
      }
    });
  }, [dispatch, upcomingPage, upcomingLimit, pastPage, pastLimit]);

  // Function to convert UTC time to local time
  const convertToLocalTime = (utcTimeString) => {
    if (!utcTimeString) return "Not scheduled";
    
    try {
      // Convert UTC time to local system time
      const localTime = moment.utc(utcTimeString).local();
      
      // Format: "MMM D, YYYY h:mm A" (e.g., "Dec 2, 2025 7:00 AM")
      return localTime.format("MMM D, YYYY h:mm A");
    } catch (error) {
      console.error("Error converting time:", error);
      return "Invalid date";
    }
  };

  // Function to get time in specific format for display
  const getTimeDisplay = (utcTimeString) => {
    if (!utcTimeString) return { date: "Not scheduled", time: "" };
    
    try {
      const localTime = moment.utc(utcTimeString).local();
      return {
        date: localTime.format("MM/DD/YY"), // e.g., "12/02/25"
        time: localTime.format("h:mmA") + " " + moment.tz(moment.tz.guess()).zoneAbbr(), // e.g., "2:00PM EST"
      };
    } catch (error) {
      return { date: "Invalid date", time: "" };
    }
  };

  // Get next lesson from upcoming data (first item)
  const nextLesson = userMainUpcomingData && userMainUpcomingData.length > 0 
    ? [userMainUpcomingData[0]] 
    : [];

  // Get upcoming lessons excluding the first one (for upcoming table)
  const upcomingLessons = userMainUpcomingData && userMainUpcomingData.length > 1 
    ? userMainUpcomingData.slice(0) 
    : [];

  const handleCancel = (lesson) => {
    if(lesson){
      dispatch(CancelBooking({ bookId: lesson?.bookingId, type: lesson?.type, lId:lesson?.lId })).then((res) => {
        if (res?.payload.status) {
          toast.success(res?.payload?.message);
          // Refresh data after successful cancellation
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
          
          // Refresh both tables with current pagination
          dispatch(userMainUpcomingBookings({ 
            scheduledAt, 
            timezone,
            page: upcomingPage,
            limit: upcomingLimit 
          }));
          
          dispatch(userPastLessons({ 
            scheduledAt, 
            timezone,
            page: pastPage,
            limit: pastLimit 
          }));
        } else {
          toast.error(res?.payload);
        }
      });
    }
  };

  const handleReview = (lesson) => {
    setSelectedLesson(lesson);
    setOpenReview(true);
  };

  const handleMessageTeacher = async (lesson) => {
    if (!lesson?.userId) {
      toast.error("Teacher information not available");
      return;
    }

    const teacherId = lesson.userId;

    if (!userInfo?._id) {
      toast.info("Please log in to send a message.");
      navigate("/login");
      return;
    }

    if (userInfo?._id === teacherId) {
      toast.info("You cannot message yourself.");
      return;
    }

    try {
      const data = await dispatch(startChat({ targetUserId: teacherId })).unwrap();
      const roomId = data?.room?._id;

      if (!roomId) {
        toast.error("Could not start the chat. Please try again.");
        return;
      }

      toast.success("Chat ready.");
      navigate(`/chat/${roomId}`);
    } catch (error) {
      const message = typeof error === "string" ? error : "Failed to start chat.";
      toast.error(message);
    }
  };

  // Calculate total pages for pagination
  const upcomingTotalPages = Math.ceil(upcomingTotal / upcomingLimit);
  const pastTotalPages = Math.ceil(pastTotal / pastLimit);

  return (
    <div className="w-full">
      <h2 className="text-[28px] font-medium mb-5 mt-7.5">My Schedule</h2>

      {/* ✅ Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`px-3 py-2 font-medium transition-colors ${
            activeTab === 'upcoming' 
              ? " rounded-full text-black border border-black"
                    : ""
          }`}
        >
          Upcoming Lessons
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`px-3 py-2 font-medium transition-colors ${
            activeTab === 'past' 
       ? " rounded-full text-black border border-black"
                    : ""
          }`}
        >
          Past Lessons
        </button>
      </div>

      {/* ✅ Upcoming Lessons Tab */}
      {activeTab === 'upcoming' && (
        <>
          <div className="flex justify-end items-center mb-5">
            {upcomingTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUpcomingPage(prev => Math.max(1, prev - 1))}
                  disabled={upcomingPage === 1}
                  className="p-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft />
                </button>
                <span className="text-sm">
                  Page {upcomingPage} of {upcomingTotalPages}
                </span>
                <button
                  onClick={() => setUpcomingPage(prev => Math.min(upcomingTotalPages, prev + 1))}
                  disabled={upcomingPage === upcomingTotalPages}
                  className="p-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto rounded-2xl mb-10">
            <table className="w-full rounded-2xl overflow-hidden">
              <thead className="bg-[#E9EAEE] text-left text-sm">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Hour</th>
                  <th className="p-3">Curriculum</th>
                  <th className="p-3">Lesson</th>
                  <th className="p-3">Teacher</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {userMainUpcomingData.length > 0 ? (
                  userMainUpcomingData.map((lesson, index) => {
                    const timeDisplay = getTimeDisplay(lesson.scheduledAt);
                    return (
                      <tr key={index} className="bg-[#F5F5F5]">
                        <td className="p-3">{timeDisplay.date}</td>
                        <td className="p-3">{timeDisplay.time}</td>
                        <td className="p-3">{lesson.curriculumTitle}</td>
                        <td className="p-3">{lesson.lessonTitle}</td>
                        <td className="p-3">{lesson.name || "Unknown Teacher"}</td>
                        <td className="p-3">{formatPrice(lesson.amount)}</td>
                        <td className="p-3">
                          <span className="bg-primary text-white px-4 py-2 rounded font-medium">
                            Upcoming
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 flex-wrap">
                            <button 
                              onClick={() => handleMessageTeacher(lesson)}
                              disabled={startChatLoading}
                              className="bg-[#E9EAEE] text-black px-4 py-2 rounded-full transition-colors disabled:opacity-60"
                            >
                              {startChatLoading ? "Starting..." : "Message"}
                            </button>
                            <button 
                              onClick={() => handleCancel(lesson)}
                              className="bg-[#E9EAEE] text-black px-4 py-2 rounded-full transition-colors"
                            >
                              Cancel lesson
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="p-3 text-center text-gray-500 bg-[#F5F5F5]">
                      No upcoming lessons
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ✅ Past Lessons Tab */}
      {activeTab === 'past' && (
        <>
          <div className="flex justify-end items-center mb-5">
            {pastTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPastPage(prev => Math.max(1, prev - 1))}
                  disabled={pastPage === 1}
                  className="p-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft />
                </button>
                <span className="text-sm">
                  Page {pastPage} of {pastTotalPages}
                </span>
                <button
                  onClick={() => setPastPage(prev => Math.min(pastTotalPages, prev + 1))}
                  disabled={pastPage === pastTotalPages}
                  className="p-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto rounded-2xl mb-10">
            <table className="w-full rounded-2xl overflow-hidden">
              <thead className="bg-[#E9EAEE] text-left text-sm">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Hour</th>
                  <th className="p-3">Lesson</th>
                  <th className="p-3">Teacher</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {userPastLessonsData && userPastLessonsData.length > 0 ? (
                  userPastLessonsData.map((lesson, index) => {
                    const timeDisplay = getTimeDisplay(lesson.scheduledAt);
                    return (
                      <tr key={index} className="bg-[#F5F5F5]">
                        <td className="p-3">{timeDisplay.date}</td>
                        <td className="p-3">{timeDisplay.time}</td>
                        <td className="p-3">{lesson.lessonTitle}</td>
                        <td className="p-3">{lesson.name || "Unknown Teacher"}</td>
                        <td className="p-3">{formatPrice(lesson.amount)}</td>
                        <td className="p-3">
                          {lesson?.status === "completed" ? (
                            <span className="px-4 py-2 rounded ">
                              Completed
                            </span>
                          ) : (
                            <span className="text-black px-4 py-2 rounded ">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {lesson?.status === "completed" && lesson?.review === false ? (
                            <button 
                              onClick={() => handleReview(lesson)}
                              className="bg-[#E9EAEE] text-black px-4 py-2 rounded-full transition-colors"
                            >
                              Leave a review
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleMessageTeacher(lesson)}
                              disabled={startChatLoading}
                              className="bg-[#E9EAEE] text-black px-4 py-2 rounded-full transition-colors disabled:opacity-60"
                            >
                              {startChatLoading ? "Starting..." : "Message"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="p-3 text-center text-gray-500 bg-[#F5F5F5]">
                      No past lessons
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Review Modal */}
      <ReviewModal 
        open={openReview} 
        onClose={() => {
          setOpenReview(false);
          setSelectedLesson(null);
        }} 
        lesson={selectedLesson}
      />
    </div>
  );
}
