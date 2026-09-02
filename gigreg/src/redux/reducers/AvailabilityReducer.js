import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ========================= AVAILABILITY THUNKS =========================

export const createAvailability = createAsyncThunk(
  "availability/create",
  async (availabilityData, { rejectWithValue }) => {
    try {
      const response = await api.post("/availability/create", availabilityData, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const updateAvailability = createAsyncThunk(
  "availability/update",
  async (availabilityData, { rejectWithValue }) => {
    try {
      const response = await api.post("/availability/update", availabilityData, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getAvailability = createAsyncThunk(
  "availability/get",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/availability/me", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getTeacherAvailability = createAsyncThunk(
  "availability/get-by-id",
  async ({id}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/availability/teacher-availability/${id}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);
export const getLessonAvailability = createAsyncThunk(
  "availability/get-lesson-id",
  async ({id}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/availability/lesson-calender-by-id/${id}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getCurriculumAvailability = createAsyncThunk(
  "availability/get-curriculum-id",
  async ({id}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/availability/lesson-calender-by-id/${id}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getTeacherUnAvailability = createAsyncThunk(
  "availability/get-unavailability-id",
  async ({id}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/availability/teacher-timelock/${id}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getLessonCalendarByUser = createAsyncThunk(
  "availability/lesson-calendar-by-user",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/availability/lesson-calender-user", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getLessonCalendarById = createAsyncThunk(
  "availability/lesson-calendar-by-id",
  async ({ id }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/availability/lesson-calender-by-id/${id}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const updateCalendar = createAsyncThunk(
  "availability/update-calendar",
  async ({ id, calendarData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/availability/update-calender/${id}`, calendarData, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

// ========================= INITIAL STATE =========================

const initialState = {
  weeklyAvailability: {
    0: { slots: [], unavailable: true },
    1: { slots: [], unavailable: true },
    2: { slots: [], unavailable: true },
    3: { slots: [], unavailable: true },
    4: { slots: [], unavailable: true },
    5: { slots: [], unavailable: true },
    6: { slots: [], unavailable: true },
  },
  dateAvailability: [],
  dateUnAvailability: [],
  // Lesson-specific availability (separate from teacher availability)
  lessonWeeklyAvailability: {
    0: { slots: [], unavailable: true },
    1: { slots: [], unavailable: true },
    2: { slots: [], unavailable: true },
    3: { slots: [], unavailable: true },
    4: { slots: [], unavailable: true },
    5: { slots: [], unavailable: true },
    6: { slots: [], unavailable: true },
  },
  lessonDateAvailability: [],
  lessonCalendarId: null, // Store the _id from lesson availability (calenderId)
  // Curriculum-specific availability (separate from lesson availability)
  curriculumWeeklyAvailability: {
    0: { slots: [], unavailable: true },
    1: { slots: [], unavailable: true },
    2: { slots: [], unavailable: true },
    3: { slots: [], unavailable: true },
    4: { slots: [], unavailable: true },
    5: { slots: [], unavailable: true },
    6: { slots: [], unavailable: true },
  },
  curriculumDateAvailability: [],
  hasAvailability: false, // Track if availability exists in backend
  timeZone: null, // Store raw backend data
  // Lesson calendar management
  userCalendars: [], // List of all user's lesson calendars
  selectedCalendarId: null, // Currently selected calendar ID (null means '/me')
  selectedCalendar: null, // Full data of selected calendar
  calendarsLoading: false, // Loading state for calendar list
  updateCalendarLoading: false, // Loading state for updating calendar
  loading: false,
  error: null,
  successMessage: "",
};

// ========================= AVAILABILITY SLICE =========================

const availabilitySlice = createSlice({
  name: "availability",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = "";
    },
    clearAvailabilityData: (state) => {
      // Clear teacher availability
      state.weeklyAvailability = {
        0: { slots: [], unavailable: true },
        1: { slots: [], unavailable: true },
        2: { slots: [], unavailable: true },
        3: { slots: [], unavailable: true },
        4: { slots: [], unavailable: true },
        5: { slots: [], unavailable: true },
        6: { slots: [], unavailable: true },
      };
      state.dateAvailability = [];
      // Clear lesson availability
      state.lessonWeeklyAvailability = {
        0: { slots: [], unavailable: true },
        1: { slots: [], unavailable: true },
        2: { slots: [], unavailable: true },
        3: { slots: [], unavailable: true },
        4: { slots: [], unavailable: true },
        5: { slots: [], unavailable: true },
        6: { slots: [], unavailable: true },
      };
      state.lessonDateAvailability = [];
      state.dateUnAvailability = [];
      state.lessonCalendarId = null;
      state.timeZone = null;
    },
    setWeeklyAvailability: (state, action) => {
      state.weeklyAvailability = action.payload;
    },
    setDateAvailability: (state, action) => {
      state.dateAvailability = action.payload;
    },
    updateWeeklySlots: (state, action) => {
      const { dayIndex, slots } = action.payload;
      state.weeklyAvailability[dayIndex].slots = slots;
    },
    toggleWeeklyUnavailable: (state, action) => {
      const dayIndex = action.payload;
      state.weeklyAvailability[dayIndex].unavailable =
        !state.weeklyAvailability[dayIndex].unavailable;
      if (state.weeklyAvailability[dayIndex].unavailable) {
        state.weeklyAvailability[dayIndex].slots = [];
      }
    },
    addWeeklySlot: (state, action) => {
      const { dayIndex, slot } = action.payload;
      state.weeklyAvailability[dayIndex].slots.push(slot);
    },
    removeWeeklySlot: (state, action) => {
      const { dayIndex, slotIndex } = action.payload;
      state.weeklyAvailability[dayIndex].slots.splice(slotIndex, 1);
    },
    addDateAvailability: (state, action) => {
      state.dateAvailability.push(action.payload);
    },
    removeDateAvailability: (state, action) => {
      const dateStr = action.payload;
      state.dateAvailability = state.dateAvailability.filter(
        (d) => d.date !== dateStr
      );
    },
    updateDateSlots: (state, action) => {
      const { dateStr, slots } = action.payload;
      const dateItem = state.dateAvailability.find((d) => d.date === dateStr);
      if (dateItem) {
        dateItem.slots = slots;
      }
    },
    toggleDateUnavailable: (state, action) => {
      const dateStr = action.payload;
      const dateItem = state.dateAvailability.find((d) => d.date === dateStr);
      if (dateItem) {
        dateItem.unavailable = !dateItem.unavailable;
        if (dateItem.unavailable) {
          dateItem.slots = [];
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Availability
      .addCase(createAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.hasAvailability = true;
        state.successMessage =
          action.payload.message || "Availability created successfully";
      })
      .addCase(createAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Availability
      .addCase(updateAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.hasAvailability = true;
        state.successMessage =
          action.payload.message || "Availability updated successfully";
      })
      .addCase(updateAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Availability
      .addCase(getAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAvailability.fulfilled, (state, action) => {
        state.loading = false;
        
        // Backend returns: { status: true, data: { weeklyHours, dateSpecificHours, timeZone } }
        const backendData = action.payload?.data || action.payload;
        const timeZone = backendData?.timeZone || null;
        
        // Store timeZone in state
        state.timeZone = timeZone;
        
        // Check if availability exists
        const hasData = backendData && (
          (backendData.weeklyHours && backendData.weeklyHours.length > 0) ||
          (backendData.dateSpecificHours && backendData.dateSpecificHours.length > 0) ||
          (backendData._id) // Has MongoDB _id means it exists
        );
        state.hasAvailability = !!hasData;
        
        // Transform weeklyHours array to frontend format (object with day indices)
        if (backendData.weeklyHours && Array.isArray(backendData.weeklyHours)) {
          const weeklyObj = {};
          // Day mapping: Sunday=0, Monday=1, ..., Saturday=6
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          // Initialize all days with default values
          for (let i = 0; i < 7; i++) {
            weeklyObj[i] = { slots: [], unavailable: true };
          }
          
          // Map backend weeklyHours to frontend format
          backendData.weeklyHours.forEach((weeklyItem) => {
            // Find day index from day name or day letter
            let dayIndex = -1;
            if (weeklyItem.day) {
              const dayStr = weeklyItem.day.toString().toLowerCase();
              // Try to find by full day name
              dayIndex = dayNames.findIndex(d => d.toLowerCase() === dayStr);
              // Try abbreviated name
              if (dayIndex === -1) {
                dayIndex = dayAbbr.findIndex(d => d.toLowerCase() === dayStr);
              }
              // Try single letter (need to handle S for Sunday/Saturday)
              if (dayIndex === -1 && dayStr.length === 1) {
                const letterMap = { 's': [0, 6], 'm': [1], 't': [2, 4], 'w': [3], 'f': [5] };
                const possibleIndices = letterMap[dayStr];
                if (possibleIndices) {
                  // For S, T - use first occurrence (could be improved with context)
                  dayIndex = possibleIndices[0];
                }
              }
            }
            
            if (dayIndex >= 0 && dayIndex < 7) {
              weeklyObj[dayIndex] = {
                slots: weeklyItem.slots || [],
                unavailable: !(weeklyItem.available !== false) // Convert available to unavailable
              };
            }
          });
          
          state.weeklyAvailability = weeklyObj;
        } else {
          // Reset to default if no weekly hours
          for (let i = 0; i < 7; i++) {
            state.weeklyAvailability[i] = { slots: [], unavailable: true };
          }
        }
        
        // Transform dateSpecificHours array to frontend format
        if (backendData.dateSpecificHours && Array.isArray(backendData.dateSpecificHours)) {
          state.dateAvailability = backendData.dateSpecificHours.map((dateItem) => ({
            date: dateItem.date,
            slots: dateItem.slots || [],
            unavailable: !(dateItem.available !== false) // Convert available to unavailable
          }));
        } else {
          state.dateAvailability = [];
        }
      })
      .addCase(getAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Availability
      .addCase(getTeacherAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTeacherAvailability.fulfilled, (state, action) => {
        state.loading = false;
        
        // Backend returns: { status: true, data: { weeklyHours, dateSpecificHours, timeZone } }
        const backendData = action.payload?.data || action.payload;
        const timeZone = backendData?.timeZone || null;
        
        // Store timeZone in state
        state.timeZone = timeZone;
        
        // Check if availability exists
        const hasData = backendData && (
          (backendData.weeklyHours && backendData.weeklyHours.length > 0) ||
          (backendData.dateSpecificHours && backendData.dateSpecificHours.length > 0) ||
          (backendData._id) // Has MongoDB _id means it exists
        );
        state.hasAvailability = !!hasData;
        
        // Transform weeklyHours array to frontend format (object with day indices)
        if (backendData.weeklyHours && Array.isArray(backendData.weeklyHours)) {
          const weeklyObj = {};
          // Day mapping: Sunday=0, Monday=1, ..., Saturday=6
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          // Initialize all days with default values
          for (let i = 0; i < 7; i++) {
            weeklyObj[i] = { slots: [], unavailable: true };
          }
          
          // Map backend weeklyHours to frontend format
          backendData.weeklyHours.forEach((weeklyItem) => {
            // Find day index from day name or day letter
            let dayIndex = -1;
            if (weeklyItem.day) {
              const dayStr = weeklyItem.day.toString().toLowerCase();
              // Try to find by full day name
              dayIndex = dayNames.findIndex(d => d.toLowerCase() === dayStr);
              // Try abbreviated name
              if (dayIndex === -1) {
                dayIndex = dayAbbr.findIndex(d => d.toLowerCase() === dayStr);
              }
              // Try single letter (need to handle S for Sunday/Saturday)
              if (dayIndex === -1 && dayStr.length === 1) {
                const letterMap = { 's': [0, 6], 'm': [1], 't': [2, 4], 'w': [3], 'f': [5] };
                const possibleIndices = letterMap[dayStr];
                if (possibleIndices) {
                  // For S, T - use first occurrence (could be improved with context)
                  dayIndex = possibleIndices[0];
                }
              }
            }
            
            if (dayIndex >= 0 && dayIndex < 7) {
              weeklyObj[dayIndex] = {
                slots: weeklyItem.slots || [],
                unavailable: !(weeklyItem.available !== false) // Convert available to unavailable
              };
            }
          });
          
          state.weeklyAvailability = weeklyObj;
        } else {
          // Reset to default if no weekly hours
          for (let i = 0; i < 7; i++) {
            state.weeklyAvailability[i] = { slots: [], unavailable: true };
          }
        }
        
        // Transform dateSpecificHours array to frontend format
        if (backendData.dateSpecificHours && Array.isArray(backendData.dateSpecificHours)) {
          state.dateAvailability = backendData.dateSpecificHours.map((dateItem) => ({
            date: dateItem.date,
            slots: dateItem.slots || [],
            unavailable: !(dateItem.available !== false) // Convert available to unavailable
          }));
        } else {
          state.dateAvailability = [];
        }
      })
      .addCase(getTeacherAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Lesson Availability (separate from teacher availability)
      .addCase(getLessonAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLessonAvailability.fulfilled, (state, action) => {
        state.loading = false;
        
        // Backend returns: { status: true, data: { weeklyHours, dateSpecificHours, timeZone } }
        const backendData = action.payload?.data || action.payload;
        const timeZone = backendData?.timeZone || null;
        const calendarId = backendData?._id || null;
        
        // Store timeZone and calendarId in state
        state.timeZone = timeZone;
        state.lessonCalendarId = calendarId;
        
        // Check if availability exists
        const hasData = backendData && (
          (backendData.weeklyHours && backendData.weeklyHours.length > 0) ||
          (backendData.dateSpecificHours && backendData.dateSpecificHours.length > 0) ||
          (backendData._id) // Has MongoDB _id means it exists
        );
        state.hasAvailability = !!hasData;
        
        // Transform weeklyHours array to frontend format (object with day indices)
        if (backendData.weeklyHours && Array.isArray(backendData.weeklyHours)) {
          const weeklyObj = {};
          // Day mapping: Sunday=0, Monday=1, ..., Saturday=6
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          // Initialize all days with default values
          for (let i = 0; i < 7; i++) {
            weeklyObj[i] = { slots: [], unavailable: true };
          }
          
          // Map backend weeklyHours to frontend format
          backendData.weeklyHours.forEach((weeklyItem) => {
            // Find day index from day name or day letter
            let dayIndex = -1;
            if (weeklyItem.day) {
              const dayStr = weeklyItem.day.toString().toLowerCase();
              // Try to find by full day name
              dayIndex = dayNames.findIndex(d => d.toLowerCase() === dayStr);
              // Try abbreviated name
              if (dayIndex === -1) {
                dayIndex = dayAbbr.findIndex(d => d.toLowerCase() === dayStr);
              }
              // Try single letter (need to handle S for Sunday/Saturday)
              if (dayIndex === -1 && dayStr.length === 1) {
                const letterMap = { 's': [0, 6], 'm': [1], 't': [2, 4], 'w': [3], 'f': [5] };
                const possibleIndices = letterMap[dayStr];
                if (possibleIndices) {
                  // For S, T - use first occurrence (could be improved with context)
                  dayIndex = possibleIndices[0];
                }
              }
            }
            
            if (dayIndex >= 0 && dayIndex < 7) {
              weeklyObj[dayIndex] = {
                slots: weeklyItem.slots || [],
                unavailable: !(weeklyItem.available !== false) // Convert available to unavailable
              };
            }
          });
          
          state.lessonWeeklyAvailability = weeklyObj;
        } else {
          // Reset to default if no weekly hours
          for (let i = 0; i < 7; i++) {
            state.lessonWeeklyAvailability[i] = { slots: [], unavailable: true };
          }
        }
        
        // Transform dateSpecificHours array to frontend format
        if (backendData.dateSpecificHours && Array.isArray(backendData.dateSpecificHours)) {
          state.lessonDateAvailability = backendData.dateSpecificHours.map((dateItem) => ({
            date: dateItem.date,
            slots: dateItem.slots || [],
            unavailable: !(dateItem.available !== false) // Convert available to unavailable
          }));
        } else {
          state.lessonDateAvailability = [];
        }
      })
      .addCase(getLessonAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Curriculum Availability (same structure as lesson availability)
      .addCase(getCurriculumAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurriculumAvailability.fulfilled, (state, action) => {
        state.loading = false;
        
        // Backend returns: { status: true, data: { weeklyHours, dateSpecificHours, timeZone } }
        const backendData = action.payload?.data || action.payload;
        
        // Transform weeklyHours array to frontend format (object with day indices)
        if (backendData.weeklyHours && Array.isArray(backendData.weeklyHours)) {
          const weeklyObj = {};
          // Day mapping: Sunday=0, Monday=1, ..., Saturday=6
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          // Initialize all days with default values
          for (let i = 0; i < 7; i++) {
            weeklyObj[i] = { slots: [], unavailable: true };
          }
          
          // Map backend weeklyHours to frontend format
          backendData.weeklyHours.forEach((weeklyItem) => {
            // Find day index from day name or day letter
            let dayIndex = -1;
            if (weeklyItem.day) {
              const dayStr = weeklyItem.day.toString().toLowerCase();
              // Try to find by full day name
              dayIndex = dayNames.findIndex(d => d.toLowerCase() === dayStr);
              // Try abbreviated name
              if (dayIndex === -1) {
                dayIndex = dayAbbr.findIndex(d => d.toLowerCase() === dayStr);
              }
              // Try single letter (need to handle S for Sunday/Saturday)
              if (dayIndex === -1 && dayStr.length === 1) {
                const letterMap = { 's': [0, 6], 'm': [1], 't': [2, 4], 'w': [3], 'f': [5] };
                const possibleIndices = letterMap[dayStr];
                if (possibleIndices) {
                  // For S, T - use first occurrence (could be improved with context)
                  dayIndex = possibleIndices[0];
                }
              }
            }
            
            if (dayIndex >= 0 && dayIndex < 7) {
              weeklyObj[dayIndex] = {
                slots: weeklyItem.slots || [],
                unavailable: !(weeklyItem.available !== false) // Convert available to unavailable
              };
            }
          });
          
          state.curriculumWeeklyAvailability = weeklyObj;
        } else {
          // Reset to default if no weekly hours
          for (let i = 0; i < 7; i++) {
            state.curriculumWeeklyAvailability[i] = { slots: [], unavailable: true };
          }
        }
        
        // Transform dateSpecificHours array to frontend format
        if (backendData.dateSpecificHours && Array.isArray(backendData.dateSpecificHours)) {
          state.curriculumDateAvailability = backendData.dateSpecificHours.map((dateItem) => ({
            date: dateItem.date,
            slots: dateItem.slots || [],
            unavailable: !(dateItem.available !== false) // Convert available to unavailable
          }));
        } else {
          state.curriculumDateAvailability = [];
        }
      })
      .addCase(getCurriculumAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get UnAvailability
      .addCase(getTeacherUnAvailability.pending, (state) => {
        state.loading = true;
        state.dateUnAvailability = [];
        state.error = null;
      })
      .addCase(getTeacherUnAvailability.fulfilled, (state, action) => {
        state.loading = false;
        
        // Backend returns: { status: true, data: { weeklyHours, dateSpecificHours, timeZone } }
        const backendData = action.payload?.data || action.payload;
        
        // Transform dateSpecificHours array to frontend format
        if (backendData.dateSpecificHours && Array.isArray(backendData.dateSpecificHours)) {
          state.dateUnAvailability = backendData.dateSpecificHours.map((dateItem) => ({
            date: dateItem.date,
            slots: dateItem.slots || [],
            unavailable: !(dateItem.available !== false) // Convert available to unavailable
          }));
        } else {
          state.dateUnAvailability = [];
        }
      })
      .addCase(getTeacherUnAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.dateUnAvailability = [];
      })
      
      // Get Lesson Calendar By User
      .addCase(getLessonCalendarByUser.pending, (state) => {
        state.calendarsLoading = true;
        state.error = null;
      })
      .addCase(getLessonCalendarByUser.fulfilled, (state, action) => {
        state.calendarsLoading = false;
        // Backend returns: { status: true, data: [...calendars] }
        const calendars = action.payload?.data || [];
        state.userCalendars = Array.isArray(calendars) ? calendars : [];
      })
      .addCase(getLessonCalendarByUser.rejected, (state, action) => {
        state.calendarsLoading = false;
        state.error = action.payload;
        state.userCalendars = [];
      })
      
      // Get Lesson Calendar By ID
      .addCase(getLessonCalendarById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLessonCalendarById.fulfilled, (state, action) => {
        state.loading = false;
        
        // Backend returns: { status: true, data: { weeklyHours, dateSpecificHours, timeZone, _id } }
        const backendData = action.payload?.data || action.payload;
        const timeZone = backendData?.timeZone || null;
        const calendarId = backendData?._id || null;
        
        // Store the selected calendar data
        state.selectedCalendar = backendData;
        state.selectedCalendarId = calendarId;
        state.timeZone = timeZone;
        
        // Transform weeklyHours array to frontend format (object with day indices)
        if (backendData.weeklyHours && Array.isArray(backendData.weeklyHours)) {
          const weeklyObj = {};
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          // Initialize all days with default values
          for (let i = 0; i < 7; i++) {
            weeklyObj[i] = { slots: [], unavailable: true };
          }
          
          // Map backend weeklyHours to frontend format
          backendData.weeklyHours.forEach((weeklyItem) => {
            let dayIndex = -1;
            if (weeklyItem.day) {
              const dayStr = weeklyItem.day.toString().toLowerCase();
              dayIndex = dayNames.findIndex(d => d.toLowerCase() === dayStr);
              if (dayIndex === -1) {
                dayIndex = dayAbbr.findIndex(d => d.toLowerCase() === dayStr);
              }
              if (dayIndex === -1 && dayStr.length === 1) {
                const letterMap = { 's': [0, 6], 'm': [1], 't': [2, 4], 'w': [3], 'f': [5] };
                const possibleIndices = letterMap[dayStr];
                if (possibleIndices) {
                  dayIndex = possibleIndices[0];
                }
              }
            }
            
            if (dayIndex >= 0 && dayIndex < 7) {
              weeklyObj[dayIndex] = {
                slots: weeklyItem.slots || [],
                unavailable: !(weeklyItem.available !== false)
              };
            }
          });
          
          state.weeklyAvailability = weeklyObj;
        } else {
          for (let i = 0; i < 7; i++) {
            state.weeklyAvailability[i] = { slots: [], unavailable: true };
          }
        }
        
        // Transform dateSpecificHours array to frontend format
        if (backendData.dateSpecificHours && Array.isArray(backendData.dateSpecificHours)) {
          state.dateAvailability = backendData.dateSpecificHours.map((dateItem) => ({
            date: dateItem.date,
            slots: dateItem.slots || [],
            unavailable: !(dateItem.available !== false)
          }));
        } else {
          state.dateAvailability = [];
        }
      })
      .addCase(getLessonCalendarById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Calendar
      .addCase(updateCalendar.pending, (state) => {
        state.updateCalendarLoading = true;
        state.error = null;
        state.successMessage = "";
      })
      .addCase(updateCalendar.fulfilled, (state, action) => {
        state.updateCalendarLoading = false;
        state.successMessage = action.payload?.message || "Calendar updated successfully";
        
        // Update the relevant availability data based on response
        const backendData = action.payload?.data || {};
        
        // Transform weeklyHours array to frontend format
        if (backendData.weeklyHours && Array.isArray(backendData.weeklyHours)) {
          const weeklyObj = {};
          for (let i = 0; i < 7; i++) {
            weeklyObj[i] = { slots: [], unavailable: true };
          }
          
          backendData.weeklyHours.forEach((weeklyItem) => {
            let dayIndex = null;
            if (typeof weeklyItem.day === 'string') {
              const dayName = weeklyItem.day;
              dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayName);
            } else if (typeof weeklyItem.day === 'number') {
              dayIndex = weeklyItem.day;
            }
            
            if (dayIndex >= 0 && dayIndex < 7) {
              weeklyObj[dayIndex] = {
                slots: weeklyItem.slots || [],
                unavailable: !(weeklyItem.available !== false)
              };
            }
          });
          
          state.weeklyAvailability = weeklyObj;
        }
        
        // Transform dateSpecificHours array to frontend format
        if (backendData.dateSpecificHours && Array.isArray(backendData.dateSpecificHours)) {
          state.dateAvailability = backendData.dateSpecificHours.map((dateItem) => ({
            date: dateItem.date,
            slots: dateItem.slots || [],
            unavailable: !(dateItem.available !== false)
          }));
        }
      })
      .addCase(updateCalendar.rejected, (state, action) => {
        state.updateCalendarLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearSuccessMessage,
  clearAvailabilityData,
  setWeeklyAvailability,
  setDateAvailability,
  updateWeeklySlots,
  toggleWeeklyUnavailable,
  addWeeklySlot,
  removeWeeklySlot,
  addDateAvailability,
  removeDateAvailability,
  updateDateSlots,
  toggleDateUnavailable,
} = availabilitySlice.actions;

export default availabilitySlice.reducer;
