import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// 1. Initiate Booking
export const initiateBooking = createAsyncThunk(
  "booking/initiateBooking",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post(`/book/initiate`, data, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response || "Error");
    }
  }
);

// 2. Confirm Booking
export const confirmBooking = createAsyncThunk(
  "booking/confirmBooking",
  async (bookingPayload, { rejectWithValue }) => {
    try {
      const res = await api.post(`/book/confirm`, bookingPayload, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 3. USER Bookings
export const userBookings = createAsyncThunk(
  "booking/userBookings",
  async ({page, limit}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/user?page=${page}&limit=${limit}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 4. TEACHER Bookings
export const teacherBookings = createAsyncThunk(
  "booking/teacherBookings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/teacher`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

export const teacherListingOrders = createAsyncThunk(
  "booking/teacherListingOrders",
  async ({ page, limit, status = "upcoming" }, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `/book/teacher-listing-orders?page=${page}&limit=${limit}&status=${encodeURIComponent(status)}`,
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

export const userListingOrders = createAsyncThunk(
  "booking/userListingOrders",
  async ({ page = 1, limit = 10, status = "upcoming" } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `/book/user-listing-orders?page=${page}&limit=${limit}&status=${encodeURIComponent(status)}`,
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

export const checkListingPurchased = createAsyncThunk(
  "booking/checkListingPurchased",
  async ({ listingId }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/check-purchase/${listingId}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 5. USER Upcoming Lessons
export const userUpcomingBookings = createAsyncThunk(
  "booking/userUpcomingBookings",
  async ({scheduledAt, timezone}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/user-upcoming-lesson?scheduledAt=${scheduledAt}&timezone=${timezone}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 5. USER Upcoming Lessons
export const publicUpcomingBookings = createAsyncThunk(
  "booking/publicUpcomingBookings",
  async ({scheduledAt, timezone, id}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/upcoming-lesson-by-user/${id}?scheduledAt=${scheduledAt}&timezone=${timezone}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 6. USER Canceled Lessons
export const userCancelBookings = createAsyncThunk(
  "booking/userCancelBookings",
  async ({page, limit}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/user-cancel-lesson?page=${page}&limit=${limit}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 7. USER Unscheduled Lessons
export const userUnscheduledBookings = createAsyncThunk(
  "booking/userUnscheduledBookings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/user-unscheduled-lesson`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);
// 7. USER Cancel Lessons
export const CancelBooking = createAsyncThunk(
  "booking/CancelBooking",
  async ({bookId, type, lId}, { rejectWithValue }) => {
    try {
      const res = await api.post(`/book/cancel-booking/${bookId}`,{type, lId}, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);
// 9. USER Cancel Lessons
export const ReShaduleLessonBooking = createAsyncThunk(
  "booking/ReShaduleLessonBooking",
  async ({bookingId, newDate, timezone}, { rejectWithValue }) => {
    try {
      const res = await api.post(`/book/schedule-lesson`,{bookingId, newDate, timezone}, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);
export const ReShaduleCurriLessonBooking = createAsyncThunk(
  "booking/ReShaduleCuriiLessonBooking",
  async ({bookingId, lId, newDate, timezone}, { rejectWithValue }) => {
    try {
      const res = await api.post(`/book/reschedule-clesson-booking`,{bookingId, lId, newDate, timezone}, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);
// 9. USER Cancel Lessons
export const getcuriBooking = createAsyncThunk(
  "booking/getcuriBooking",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/get-booking/${id}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 10. User Main Upcoming Bookings
export const userMainUpcomingBookings = createAsyncThunk(
  "booking/userMainUpcomingBookings",
  async ({ scheduledAt, timezone, page, limit }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/user-main-upcoming?scheduledAt=${scheduledAt}&timezone=${timezone}&page=${page}&limit=${limit}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 11. Teacher Main Upcoming Bookings
export const teacherMainUpcomingBookings = createAsyncThunk(
  "booking/teacherMainUpcomingBookings",
  async ({ scheduledAt, timezone, page, limit }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/teacher-main-upcoming?scheduledAt=${scheduledAt}&timezone=${timezone}&page=${page}&limit=${limit}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 12. Teacher Past Lessons
export const teacherPastLessons = createAsyncThunk(
  "booking/teacherPastLessons",
  async ({ scheduledAt, timezone, page, limit }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/teacher-main-past?scheduledAt=${scheduledAt}&timezone=${timezone}&page=${page}&limit=${limit}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 13. User Past Lessons
export const userPastLessons = createAsyncThunk(
  "booking/userPastLessons",
  async ({ scheduledAt, timezone, page, limit }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/book/user-main-past?scheduledAt=${scheduledAt}&timezone=${timezone}&page=${page}&limit=${limit}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);

// 14. User complete Lessons
export const CompleteLessons = createAsyncThunk(
  "booking/CompleteLessons",
  async ({bookId, type, lId}, { rejectWithValue }) => {
    try {
      const res = await api.post(`/book/complete-lesson/${bookId}`,{type, lId}, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error");
    }
  }
);
// 14. User aval
export const checkAvailablity = createAsyncThunk(
  "booking/CompleteLessons",
  async ({ lId, newDate, timezone }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/book/check-availablity-time`,{ lId, newDate, timezone }, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

const bookingSlice = createSlice({
  name: "booking",
  initialState: {
    loading: false,
    error: null,
    successMessage: null,
    userBookingsdata: [],
    teacherBookings: [],
    teacherListingOrdersData: [],
    userListingOrdersData: [],
    userUpcomingdata: [],
    userCanceldata: [],
    userUnscheduleddata: [],
    publicUpcomingdata: [],
    getcuriBookingdata: [],
        userMainUpcomingData: [],
    teacherMainUpcomingData: [],
    teacherPastLessonsData: [],
    userPastLessonsData: [],
    getcuridata: null,
    initiatedData: null,
    confirmedData: null,
    teacherId: null,
    // Individual loading states for better UX
    loadingStates: {
      userBookings: false,
      teacherBookings: false,
      teacherListingOrders: false,
      userListingOrders: false,
      userUpcomingBookings: false,
      userCancelBookings: false,
      userUnscheduledBookings: false,
      initiateBooking: false,
      confirmBooking: false,
            userMainUpcomingBookings: false,
      teacherMainUpcomingBookings: false,
      teacherPastLessons: false,
      userPastLessons: false,
    }
  },

  reducers: {
    clearBookingMessage: (state) => {
      state.successMessage = null;
      state.error = null;
    },
    clearBookingData: (state) => {
      state.initiatedData = null;
      state.confirmedData = null;
    },
    setLoadingState: (state, action) => {
      const { key, value } = action.payload;
      state.loadingStates[key] = value;
    }
  },

  extraReducers: (builder) => {
    // ----------------------- Initiate Booking -------------------------
    builder
      .addCase(initiateBooking.pending, (state) => {
        state.loading = true;
        state.loadingStates.initiateBooking = true;
        state.error = null;
      })
      .addCase(initiateBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.initiateBooking = false;
        state.initiatedData = action.payload;
        state.successMessage = "Booking initiated!";
      })
      .addCase(initiateBooking.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.initiateBooking = false;
        state.error = action.payload;
      });

    // ----------------------- Confirm Booking -------------------------
    builder
      .addCase(confirmBooking.pending, (state) => {
        state.loading = true;
        state.loadingStates.confirmBooking = true;
        state.error = null;
      })
      .addCase(confirmBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.confirmBooking = false;
        state.confirmedData = action.payload;
        state.successMessage = "Booking confirmed!";
      })
      .addCase(confirmBooking.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.confirmBooking = false;
        state.error = action.payload;
      });

    // ----------------------- User Bookings -------------------------
    builder
      .addCase(userBookings.pending, (state) => {
        state.loading = true;
        state.loadingStates.userBookings = true;
        state.error = null;
      })
      .addCase(userBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.userBookings = false;
        state.userBookingsdata = action.payload.bookings;
      })
      .addCase(userBookings.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.userBookings = false;
        state.error = action.payload;
      });

    // ----------------------- Teacher Bookings -------------------------
    builder
      .addCase(teacherBookings.pending, (state) => {
        state.loading = true;
        state.loadingStates.teacherBookings = true;
        state.error = null;
      })
      .addCase(teacherBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.teacherBookings = false;
        state.teacherBookings = action.payload;
      })
      .addCase(teacherBookings.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.teacherBookings = false;
        state.error = action.payload;
      });

    builder
      .addCase(teacherListingOrders.pending, (state) => {
        state.loading = true;
        state.loadingStates.teacherListingOrders = true;
        state.error = null;
      })
      .addCase(teacherListingOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.teacherListingOrders = false;
        state.teacherListingOrdersData = action.payload.orders || [];
      })
      .addCase(teacherListingOrders.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.teacherListingOrders = false;
        state.error = action.payload;
      });

    builder
      .addCase(userListingOrders.pending, (state) => {
        state.loading = true;
        state.loadingStates.userListingOrders = true;
        state.error = null;
      })
      .addCase(userListingOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.userListingOrders = false;
        state.userListingOrdersData = action.payload.orders || [];
      })
      .addCase(userListingOrders.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.userListingOrders = false;
        state.error = action.payload;
      });

    // ----------------------- User Upcoming Bookings -------------------------
    builder
      .addCase(userUpcomingBookings.pending, (state) => {
        state.loading = true;
        state.loadingStates.userUpcomingBookings = true;
        state.error = null;
      })
      .addCase(userUpcomingBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.userUpcomingBookings = false;
        state.userUpcomingdata = action.payload.bookings;
      })
      .addCase(userUpcomingBookings.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.userUpcomingBookings = false;
        state.error = action.payload;
      });

    // ----------------------- User Upcoming Bookings -------------------------
    builder
      .addCase(publicUpcomingBookings.pending, (state) => {
        state.loading = true;
        state.loadingStates.userUpcomingBookings = true;
        state.error = null;
      })
      .addCase(publicUpcomingBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.userUpcomingBookings = false;
        state.publicUpcomingdata = action.payload.bookings;
      })
      .addCase(publicUpcomingBookings.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.userUpcomingBookings = false;
        state.error = action.payload;
      });

    // ----------------------- User Cancel Bookings -------------------------
    builder
      .addCase(userCancelBookings.pending, (state) => {
        state.loading = true;
        state.loadingStates.userCancelBookings = true;
        state.error = null;
      })
      .addCase(userCancelBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.userCancelBookings = false;
        state.userCanceldata = action.payload.bookings;
      })
      .addCase(userCancelBookings.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.userCancelBookings = false;
        state.error = action.payload;
      });

    // ----------------------- User Unscheduled Bookings -------------------------
    builder
      .addCase(userUnscheduledBookings.pending, (state) => {
        state.loading = true;
        state.loadingStates.userUnscheduledBookings = true;
        state.error = null;
      })
      .addCase(userUnscheduledBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.userUnscheduledBookings = false;
        state.userUnscheduleddata = action.payload.bookings;
      })
      .addCase(userUnscheduledBookings.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.userUnscheduledBookings = false;
        state.error = action.payload;
      });
    // ----------------------- User Unscheduled Bookings -------------------------
    builder
      .addCase(getcuriBooking.pending, (state) => {
        state.loading = true;
        state.loadingStates.userUnscheduledBookings = true;
        state.error = null;
      })
      .addCase(getcuriBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingStates.userUnscheduledBookings = false;
        state.getcuriBookingdata = action.payload.booking.lessonPosition || []
        state.getcuridata = action.payload.booking
        state.teacherId = action.payload.booking.teacher._id
;
      })
      .addCase(getcuriBooking.rejected, (state, action) => {
        state.loading = false;
        state.loadingStates.userUnscheduledBookings = false;
        state.error = action.payload;
      });
        builder
    .addCase(userMainUpcomingBookings.pending, (state) => {
      state.loading = true;
      state.loadingStates.userMainUpcomingBookings = true;
      state.error = null;
    })
    .addCase(userMainUpcomingBookings.fulfilled, (state, action) => {
      state.loading = false;
      state.loadingStates.userMainUpcomingBookings = false;
      state.userMainUpcomingData = action.payload.lessons || action.payload.data;
    })
    .addCase(userMainUpcomingBookings.rejected, (state, action) => {
      state.loading = false;
      state.loadingStates.userMainUpcomingBookings = false;
      state.error = action.payload;
    });

  // ----------------------- Teacher Main Upcoming Bookings -------------------------
  builder
    .addCase(teacherMainUpcomingBookings.pending, (state) => {
      state.loading = true;
      state.loadingStates.teacherMainUpcomingBookings = true;
      state.error = null;
    })
    .addCase(teacherMainUpcomingBookings.fulfilled, (state, action) => {
      state.loading = false;
      state.loadingStates.teacherMainUpcomingBookings = false;
      state.teacherMainUpcomingData = action.payload.lessons || action.payload.data;
    })
    .addCase(teacherMainUpcomingBookings.rejected, (state, action) => {
      state.loading = false;
      state.loadingStates.teacherMainUpcomingBookings = false;
      state.error = action.payload;
    });

  // ----------------------- Teacher Past Lessons -------------------------
  builder
    .addCase(teacherPastLessons.pending, (state) => {
      state.loading = true;
      state.loadingStates.teacherPastLessons = true;
      state.error = null;
    })
    .addCase(teacherPastLessons.fulfilled, (state, action) => {
      state.loading = false;
      state.loadingStates.teacherPastLessons = false;
      state.teacherPastLessonsData = action.payload.lessons || action.payload.data;
    })
    .addCase(teacherPastLessons.rejected, (state, action) => {
      state.loading = false;
      state.loadingStates.teacherPastLessons = false;
      state.error = action.payload;
    });

  // ----------------------- User Past Lessons -------------------------
  builder
    .addCase(userPastLessons.pending, (state) => {
      state.loading = true;
      state.loadingStates.userPastLessons = true;
      state.error = null;
    })
    .addCase(userPastLessons.fulfilled, (state, action) => {
      state.loading = false;
      state.loadingStates.userPastLessons = false;
      state.userPastLessonsData = action.payload.lessons || action.payload.data;
    })
    .addCase(userPastLessons.rejected, (state, action) => {
      state.loading = false;
      state.loadingStates.userPastLessons = false;
      state.error = action.payload;
    });
  },
});

export const { clearBookingMessage, clearBookingData, setLoadingState } = bookingSlice.actions;
export default bookingSlice.reducer;
