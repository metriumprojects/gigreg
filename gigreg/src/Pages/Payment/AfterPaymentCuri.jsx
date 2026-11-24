import { AlertCircle, Calendar, CircleCheck, MessageCircle } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useState, useRef } from "react";
import { confirmBooking, getcuriBooking, ReShaduleCurriLessonBooking } from "../../redux/reducers/BookingReducer";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getLessonAvailability, getTeacherAvailability, getTeacherUnAvailability } from "../../redux/reducers/AvailabilityReducer";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination } from 'swiper/modules';
import { MyCalendar } from "./MyCalendar";
import { toast } from "react-toastify";
import { sendChatMessage, startChat } from "../../redux/reducers/ChatReducer";
import { useCurrency } from "../../currency/CurrencyContext";

export default function AfterPaymentCurri() {
  const { formatPrice } = useCurrency();
  const { bookId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { getcuriBookingdata, teacherId, getcuridata } = useSelector((state) => state.book);
  const {
    weeklyAvailability,
    dateAvailability,
          lessonWeeklyAvailability,
      lessonDateAvailability,
    timeZone,
    dateUnAvailability,
  } = useSelector((state) => state.availability);

  // State for selected date and time for each lesson
  const [selectedDates, setSelectedDates] = useState({});
  const [selectedTimes, setSelectedTimes] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmInProgress, setBookingConfirmInProgress] = useState(true);
  const [confirmStatus, setConfirmStatus] = useState("loading"); // "loading" | "confirmed" | "failed"
  const [confirmError, setConfirmError] = useState(null);
  
  // Ref to track if confirmBooking has been called
  const confirmBookingCalled = useRef(false);
  
  // Ref to prevent duplicate message sends
  const messageSendInProgress = useRef(false);

  useEffect(() => {
    dispatch(getcuriBooking(bookId));
  }, [dispatch, bookId]);

  useEffect(() => {
    if (teacherId && getcuridata?.type !== "listing" && getcuridata?.curriculum?.calenderId) {
      dispatch(getLessonAvailability({ id: getcuridata?.curriculum?.calenderId }));
      dispatch(getTeacherUnAvailability({ id: teacherId }));
    }
  }, [dispatch, teacherId, getcuridata?.type, getcuridata?.curriculum?.calenderId]);

  const handleDateSelect = (lessonId, date) => {
    setSelectedDates(prev => ({
      ...prev,
      [lessonId]: date
    }));
  };

  const handleTimeSelect = (lessonId, time) => {
    setSelectedTimes(prev => ({
      ...prev,
      [lessonId]: time
    }));
  };

  // Filter lessons to show only pending ones for scheduling.
  // Single lesson bookings store date/time on the booking itself (not lessonPosition).
  const isListingBooking = getcuridata?.type === "listing";
  const isLessonBooking = getcuridata?.type === "lesson";
  const pendingLessons = isListingBooking || isLessonBooking
    ? []
    : getcuriBookingdata?.filter((lesson) => lesson.status === "pending") || [];
  const curriculumScheduledLessons = isListingBooking || isLessonBooking
    ? []
    : getcuriBookingdata?.filter((lesson) => lesson.status === "scheduled" && lesson.scheduledAt) || [];

  const fallbackBookingDateTime = (() => {
    try {
      return JSON.parse(localStorage.getItem("bookingDateTime") || "null");
    } catch {
      return null;
    }
  })();

  const lessonScheduledAt = getcuridata?.scheduledAt || fallbackBookingDateTime?.newDate || null;
  const lessonTimezone = getcuridata?.timezone || fallbackBookingDateTime?.timezone || null;

  const singleLessonScheduled = isLessonBooking && lessonScheduledAt
    ? [{
        _id: getcuridata._id,
        position: 1,
        status: "scheduled",
        scheduledAt: lessonScheduledAt,
        timezone: lessonTimezone,
        lId: {
          _id: getcuridata.lesson?._id,
          title: getcuridata.lesson?.title,
          duration: getcuridata.lesson?.duration,
        },
      }]
    : [];

  const scheduledLessons = isLessonBooking ? singleLessonScheduled : curriculumScheduledLessons;

  // Format date for scheduled lessons
  const formatScheduledDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Not scheduled";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLessonScheduleBounds = (lesson) => {
    const start = new Date(lesson?.scheduledAt);
    if (Number.isNaN(start.getTime())) return null;

    const durationRaw = lesson?.lId?.duration || getcuridata?.lesson?.duration || "60";
    const durationValue = Number.parseInt(durationRaw, 10) || 60;
    const durationMinutes = /hour/i.test(String(durationRaw))
      ? durationValue * 60
      : durationValue;
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const lessonTitle = lesson?.lId?.title || getcuridata?.lesson?.title || "Lesson";
    const teacherName = getcuridata?.teacher?.name || "your teacher";

    return { start, end, lessonTitle, teacherName };
  };

  const formatIcsDate = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const escapeIcsText = (value) =>
    String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const getGoogleCalendarUrl = (lesson) => {
    const bounds = getLessonScheduleBounds(lesson);
    if (!bounds) return null;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `GigMake lesson: ${bounds.lessonTitle}`,
      dates: `${formatIcsDate(bounds.start)}/${formatIcsDate(bounds.end)}`,
      details: `Your GigMake lesson with ${bounds.teacherName}.`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const downloadIcalFile = (lesson) => {
    const bounds = getLessonScheduleBounds(lesson);
    if (!bounds) {
      toast.error("Lesson date and time are missing");
      return;
    }

    const uid = `${lesson?._id || bookId || "gigmake"}@gigmake.com`;
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GigMake//Lesson Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(bounds.start)}`,
      `DTEND:${formatIcsDate(bounds.end)}`,
      `SUMMARY:${escapeIcsText(`GigMake lesson: ${bounds.lessonTitle}`)}`,
      `DESCRIPTION:${escapeIcsText(`Your GigMake lesson with ${bounds.teacherName}.`)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = String(bounds.lessonTitle).replace(/[^\w\-]+/g, "_").slice(0, 40) || "lesson";
    link.href = url;
    link.download = `gigmake-${safeTitle}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const calendarLesson = scheduledLessons.find((lesson) => lesson?.scheduledAt) || null;
  const googleCalendarUrl = calendarLesson ? getGoogleCalendarUrl(calendarLesson) : null;

  const handleSchedule = (lessonId, bookingInfo) => {
    dispatch(ReShaduleCurriLessonBooking({
      bookingId: bookId, 
      lId: lessonId, // Pass the lesson ID
      newDate: bookingInfo.newDate, 
      timezone: bookingInfo.timezone
    })).then((res) => {
      if (res?.payload.status) {
        toast.success(res?.payload?.message);
        // Refresh the data after successful scheduling
        dispatch(getcuriBooking(bookId));
      } else {
        toast.error(res?.payload?.message || "Failed to schedule lesson");
      }
    }).catch((error) => {
      toast.error("An error occurred while scheduling the lesson");
      console.error("Scheduling error:", error);
    });
  };

  const buildConfirmPayload = useCallback(() => {
    const bookingDateTimeData = localStorage.getItem("bookingDateTime");
    const bookingData = {
      bookingId: bookId,
      type: "succeeded",
      group: false,
    };

    if (bookingDateTimeData) {
      try {
        const parsedData = JSON.parse(bookingDateTimeData);
        bookingData.group = parsedData.group !== undefined ? parsedData.group : false;
        if (parsedData.usecapacity !== undefined) {
          bookingData.usecapacity = parsedData.usecapacity;
        }
        if (parsedData.slotId) {
          bookingData.slotId = parsedData.slotId;
        }
        if (parsedData.discount !== undefined) {
          bookingData.discount = parsedData.discount;
        }
      } catch {
        bookingData.group = false;
      }
    }
    return bookingData;
  }, [bookId]);

  const verifyPayment = useCallback(async () => {
    setBookingConfirmInProgress(true);
    setConfirmStatus("loading");
    setConfirmError(null);

    const maxAttempts = 3;
    const retryDelaysMs = [1500, 3000];
    let lastError = "Payment could not be verified yet.";

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const confirmRes = await dispatch(confirmBooking(buildConfirmPayload()));
        const refreshedRes = await dispatch(getcuriBooking(bookId));
        const refreshedBooking = refreshedRes?.payload?.booking;
        const isConfirmed =
          Boolean(confirmRes?.payload?.status) ||
          (String(refreshedBooking?._id) === String(bookId) &&
            refreshedBooking?.paymentStatus === "paid" &&
            refreshedBooking?.status !== "cancelled");

        if (isConfirmed) {
          setConfirmStatus("confirmed");
          return;
        }

        const payload = confirmRes?.payload;
        lastError =
          typeof payload === "string"
            ? payload
            : payload?.message || "Payment could not be verified yet.";

        // Stop retrying immediately on permanent errors (refunded slot conflict, auth, not found)
        const isPermanentFailure =
          Boolean(payload?.refunded) ||
          /refunded|cannot confirm another|not found|type mismatch/i.test(lastError);

        if (isPermanentFailure || attempt >= maxAttempts) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt - 1] || 3000));
      }

      setConfirmStatus("failed");
      setConfirmError(lastError);
    } catch (err) {
      setConfirmStatus("failed");
      setConfirmError(err?.message || "Payment verification failed.");
    } finally {
      setBookingConfirmInProgress(false);
    }
  }, [bookId, buildConfirmPayload, dispatch]);

  useEffect(() => {
    confirmBookingCalled.current = false;
  }, [bookId]);

  useEffect(() => {
    if (confirmBookingCalled.current) {
      return;
    }
    confirmBookingCalled.current = true;
    verifyPayment();
  }, [verifyPayment]);

  useEffect(() => {
    if (
      String(getcuridata?._id) === String(bookId) &&
      getcuridata?.paymentStatus === "paid" &&
      getcuridata?.status !== "cancelled"
    ) {
      setConfirmStatus("confirmed");
      setConfirmError(null);
      setBookingConfirmInProgress(false);
    }
  }, [bookId, getcuridata?._id, getcuridata?.paymentStatus, getcuridata?.status]);

  // Auto-retry verification automatically if the user's connection drops and reconnects
  useEffect(() => {
    if (confirmStatus !== "failed") return undefined;
    const handleOnline = () => {
      if (!bookingConfirmInProgress) {
        verifyPayment();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [confirmStatus, bookingConfirmInProgress, verifyPayment]);

  // message
    const handleSend = async () => {
      // Prevent duplicate sends
      if (messageSendInProgress.current) {
        toast.warning("Message is already being sent...");
        return;
      }

      if (!teacherId) {
        toast.error("Request details are missing.");
        return;
      }
  
      try {
        messageSendInProgress.current = true;
        setSubmitting(true);
        
        // Wait a moment to ensure confirmBooking has completed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { room } = await dispatch(
          startChat({
            targetUserId: teacherId,
          })
        ).unwrap();
  
        // await dispatch(
        //   sendChatMessage({
        //     roomId: room._id,
        //   })
        // ).unwrap();
        
        if(room){
          navigate(`/chat/${room?._id}`);
        }
      } catch (error) {
        toast.error("Failed to send Message.");
      } finally {
        setSubmitting(false);
        messageSendInProgress.current = false;
      }
    };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 min-h-[77vh]">
        {/* Verification / Success / Failure Card */}
        {confirmStatus === "loading" ? (
          <div className="w-full bg-[#f5f5f5] rounded-2xl p-8 mb-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-7 h-7 border-2 border-[#051842] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-medium">Verifying your payment with Stripe...</p>
          </div>
        ) : confirmStatus === "failed" ? (
          <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-shrink-0 text-red-600">
                <AlertCircle size={30} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-base font-semibold text-red-900">Payment not verified</h2>
                <p className="text-sm text-red-800 mt-1">
                  {confirmError || "We could not confirm this payment yet. If you completed checkout, please retry verification."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                disabled={bookingConfirmInProgress}
                onClick={verifyPayment}
                className="bg-[#051842] text-white px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingConfirmInProgress ? "Retrying..." : "Retry Verification"}
              </button>
              <Link
                to="/"
                className="bg-white border border-gray-300 text-gray-800 px-5 py-2.5 rounded-full text-sm font-medium"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full bg-[#f5f5f5] rounded-2xl p-6 mb-8 space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-shrink-0">
                <CircleCheck size={30} className="fill-green-500 text-[#f5f5f5]" />
              </div>

              <div className="flex-1 text-center md:text-left">
                <p className="text-gray-700 leading-snug">
                  Thank you! Payment is successful.{" "}
                  {isListingBooking ? (
                    <>
                      Your seller will begin working on your order shortly and will notify you once it
                      has been completed. You can also contact them at any time through the chat!
                    </>
                  ) : (
                    <>
                      Your teacher will be in touch with you shortly but you can reach out now if you
                      have any queries regarding your lesson!
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row w-full justify-center gap-3 mt-4 md:mt-0 mx-auto">
              <button
                disabled={submitting || bookingConfirmInProgress}
                onClick={handleSend}
                className="bg-[#051842] text-white px-5 py-2.5 rounded-full text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle size={20} />
                {bookingConfirmInProgress
                  ? "Setting up..."
                  : submitting
                  ? "Sending..."
                  : isListingBooking
                  ? "Message seller"
                  : "Message teacher"}
              </button>
              {googleCalendarUrl && (
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-[#051842] text-[#051842] px-5 py-2.5 rounded-full text-sm flex items-center justify-center gap-2"
                >
                  <Calendar size={20} />
                  Add to Google Calendar
                </a>
              )}
              {calendarLesson && (
                <button
                  type="button"
                  onClick={() => downloadIcalFile(calendarLesson)}
                  className="bg-white border border-[#051842] text-[#051842] px-5 py-2.5 rounded-full text-sm flex items-center justify-center gap-2"
                >
                  <Calendar size={20} />
                  Add to iCal
                </button>
              )}
              {calendarLesson && (
                <button
                  type="button"
                  onClick={() => downloadIcalFile(calendarLesson)}
                  className="bg-white border border-[#051842] text-[#051842] px-5 py-2.5 rounded-full text-sm flex items-center justify-center gap-2"
                >
                  <Calendar size={20} />
                  Add to Outlook
                </button>
              )}
            </div>
          </div>
        )}

        {confirmStatus === "confirmed" && isListingBooking && (
          <div className="w-full bg-white rounded-2xl p-6 shadow border border-gray-100">
            <h2 className="text-xl font-semibold mb-3">Order confirmed</h2>
            <p className="text-gray-700 text-sm mb-4">
              Your payment for {getcuridata?.listing?.title || "this listing"} is complete. The seller has received your order details.
            </p>
            <div className="flex justify-between text-sm border-t pt-4">
              <span className="text-gray-600">Amount</span>
              <span className="font-semibold">
                {getcuridata?.chargedCurrency && getcuridata?.chargedAmount !== undefined
                  ? new Intl.NumberFormat(getcuridata.chargedCurrency === "EUR" ? "de-DE" : "en-US", { style: "currency", currency: getcuridata.chargedCurrency }).format(getcuridata.chargedAmount)
                  : formatPrice(getcuridata?.amount || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Scheduled Lessons Summary */}
        {scheduledLessons.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">

            <h2 className="text-xl font-semibold mb-4">
              {isLessonBooking ? "Scheduled Lesson" : "Scheduled Lessons"}
            </h2>
            {!isLessonBooking && (
              <Link to="/profile" className="text-[#051842]">
                Schedule Later
              </Link>
            )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledLessons.map((lesson) => (
                <div key={lesson._id} className="bg-white rounded-xl p-4 shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      Lesson {lesson.position}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Scheduled
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2 truncate">
                    {lesson.lId?.title}
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p>Scheduled for:</p>
                    <p className="font-medium">
                      {formatScheduledDate(lesson.scheduledAt)}
                    </p>
                    <p className="text-xs mt-1">Timezone: {lesson.timezone || "Not set"}</p>
                  </div>
                  {(getGoogleCalendarUrl(lesson) || getLessonScheduleBounds(lesson)) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {getGoogleCalendarUrl(lesson) && (
                        <a
                          href={getGoogleCalendarUrl(lesson)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-fit items-center gap-2 rounded-full border border-[#051842] px-4 py-2 text-sm font-medium text-[#051842]"
                        >
                          <Calendar size={16} />
                          Google Calendar
                        </a>
                      )}
                      {getLessonScheduleBounds(lesson) && (
                        <button
                          type="button"
                          onClick={() => downloadIcalFile(lesson)}
                          className="flex w-fit items-center gap-2 rounded-full border border-[#051842] px-4 py-2 text-sm font-medium text-[#051842]"
                        >
                          <Calendar size={16} />
                          Add to iCal
                        </button>
                      )}
                      {getLessonScheduleBounds(lesson) && (
                        <button
                          type="button"
                          onClick={() => downloadIcalFile(lesson)}
                          className="flex w-fit items-center gap-2 rounded-full border border-[#051842] px-4 py-2 text-sm font-medium text-[#051842]"
                        >
                          <Calendar size={16} />
                          Add to Outlook
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Section for Pending Lessons */}
        {pendingLessons.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Schedule Your Lessons ({pendingLessons.length} remaining)
            </h2>
            
            {/* Swiper for horizontal calendar display */}
            <Swiper
              spaceBetween={20}
              slidesPerView={1}
              breakpoints={{
                640: {
                  slidesPerView: 1,
                },
                768: {
                  slidesPerView: 2,
                },
                1024: {
                  slidesPerView: 3,
                },
              }}
              pagination={{
                clickable: true,
              }}
              modules={[Pagination]}
              className="pb-10"
            >
              {pendingLessons.map((lesson) => (
                <SwiperSlide key={lesson._id}>
                  <MyCalendar
                    selectedDate={selectedDates[lesson._id]}
                    onSelect={(date) => handleDateSelect(lesson._id, date)}
                    selectedTime={selectedTimes[lesson._id]}
                    onSelectTime={(time) => handleTimeSelect(lesson._id, time)}
                    weeklyAvailability={lessonWeeklyAvailability}
                    dateAvailability={lessonDateAvailability}
                    teacherTimezone={timeZone}
                    isDisabled={lesson.status === "scheduled"}
                    lessonTitle={lesson.lId?.title}
                    lessonNumber={lesson.position}
                    lessonId={lesson.lId?._id} // Pass lesson ID
                    bookingId={bookId} // Pass booking ID from params
                    onSchedule={handleSchedule} // Pass schedule function
                    dateUnAvailability={dateUnAvailability}
                    duration={lesson.lId?.duration}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        {/* If all lessons are scheduled */}
        {pendingLessons.length === 0 && scheduledLessons.length > 0 && (
          <div className="text-center py-8">
            <CircleCheck size={48} className="fill-green-500 text-white mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Lessons Scheduled!</h3>
            <p className="text-gray-600">
              All your lessons have been scheduled. You'll receive reminders before each lesson.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
