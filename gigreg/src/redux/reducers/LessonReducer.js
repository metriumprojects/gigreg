import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ========================= LESSON THUNKS =========================

export const createLesson = createAsyncThunk(
  "lesson/create",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/lessons/create", formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getAllLessons = createAsyncThunk(
  "lesson/get-all",
  async (
    {
      page,
      limit,
      search,
      minPrice,
      maxPrice,
      isOnline,
      location,
      supportsInPerson,
      category,
      lat,
      lng,
      radiusKm,
      currency = "USD",
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search ?? "",
      });
      params.append("currency", currency);

      if (Number.isFinite(minPrice)) {
        params.append("minPrice", String(minPrice));
      }
      if (Number.isFinite(maxPrice)) {
        params.append("maxPrice", String(maxPrice));
      }

      if (typeof isOnline === "boolean") {
        params.append("isOnline", String(isOnline));
      }

      if (typeof supportsInPerson === "boolean") {
        params.append("supportsInPerson", String(supportsInPerson));
      }

      if (location) {
        params.append("location", location);
      }

      if (category) {
        params.append("category", category);
      }

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        params.append("lat", String(lat));
        params.append("lng", String(lng));
      }

      if (Number.isFinite(radiusKm)) {
        params.append("radiusKm", String(radiusKm));
      }

      const response = await api.get(
        `/lessons/get-lesson?${params.toString()}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getDiscoverFeed = createAsyncThunk(
  "lesson/get-discover-feed",
  async (
    {
      page,
      limit,
      search,
      minPrice,
      maxPrice,
      isOnline,
      location,
      supportsInPerson,
      category,
      lat,
      lng,
      radiusKm,
      currency = "USD",
      type,
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search ?? "",
      });
      params.append("currency", currency);
      if (type) {
        params.append("type", type);
      }

      if (Number.isFinite(minPrice)) {
        params.append("minPrice", String(minPrice));
      }
      if (Number.isFinite(maxPrice)) {
        params.append("maxPrice", String(maxPrice));
      }
      if (typeof isOnline === "boolean") {
        params.append("isOnline", String(isOnline));
      }
      if (typeof supportsInPerson === "boolean") {
        params.append("supportsInPerson", String(supportsInPerson));
      }
      if (location) {
        params.append("location", location);
      }
      if (category) {
        params.append("category", category);
      }
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        params.append("lat", String(lat));
        params.append("lng", String(lng));
      }
      if (Number.isFinite(radiusKm)) {
        params.append("radiusKm", String(radiusKm));
      }

      const response = await api.get(`/discover?${params.toString()}`, {
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
export const getTeacherLessons = createAsyncThunk(
  "lesson/get-teacher-all",
  async ({page, limit}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/lessons/teacher-lesson?page=${page}&limit=${limit}`, {
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
export const getTeacherLessonsById = createAsyncThunk(
  "lesson/get-teacher-all-by-id",
  async ({id, page, limit}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/lessons/lesson-by-teacher/${id}?page=${page}&limit=${limit}`, {
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

export const getLessonById = createAsyncThunk(
  "lesson/get-by-id",
  async (lessonId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/lessons/lesson/${lessonId}`, {
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
export const getCurriLessonById = createAsyncThunk(
  "lesson/get-curri-by-id",
  async (lessonId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/lessons/getLesson/${lessonId}`, {
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

export const updateLesson = createAsyncThunk(
  "lesson/update",
  async ({ lessonId, formData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/lessons/update-lesson/${lessonId}`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const deleteLesson = createAsyncThunk(
  "lesson/delete",
  async (lessonId, { rejectWithValue }) => {
    try {
      const response = await api.delete(
        `/lessons/delete-lesson/${lessonId}`,
        {
          withCredentials: true,
        }
      );
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
  // Lessons
  lessons: [],
  curriculum: [],
  discoverFeed: [],
  discoverPage: 1,
  discoverTotalPages: 1,
  lesson: null,
  lessonPage: 1,
  currentPage: 1,
  totalCourses: 0,
  Teacherlessons:[],
  Teacheridlessons:[],
  currilesson:[],
  
  // State management
  loading: false,
  error: null,
  successMessage: "",
};

// ========================= LESSON SLICE =========================

const lessonSlice = createSlice({
  name: "lesson",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Lesson
      .addCase(createLesson.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLesson.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
      })
      .addCase(createLesson.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get All Lessons
      .addCase(getAllLessons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllLessons.fulfilled, (state, action) => {
        state.loading = false;
        const requestedPage = Number(action.meta.arg?.page) || 1;
        const incomingLessons = action.payload.independentLessons || [];
        const incomingCurriculums = action.payload.curriculumList || [];

        if (requestedPage === 1) {
          state.lessons = incomingLessons;
          state.curriculum = incomingCurriculums;
        } else {
          const lessonIds = new Set(state.lessons.map((item) => item._id));
          const curriculumIds = new Set(state.curriculum.map((item) => item._id));
          state.lessons.push(...incomingLessons.filter((item) => !lessonIds.has(item._id)));
          state.curriculum.push(...incomingCurriculums.filter((item) => !curriculumIds.has(item._id)));
        }
        state.lessonPage = action.payload.totalPages ?? Math.max(
          action.payload.independentTotalPages || 0,
          action.payload.curriculumTotalPages || 0,
          1
        );
        state.currentPage = action.payload.page || requestedPage;
        state.totalCourses = (action.payload.independentTotal || 0) + (action.payload.curriculumTotal || 0);
      })
      .addCase(getAllLessons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getDiscoverFeed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDiscoverFeed.fulfilled, (state, action) => {
        state.loading = false;
        const requestedPage = Number(action.meta.arg?.page) || 1;
        const incomingFeed = action.payload.feed || [];

        if (requestedPage === 1) {
          state.discoverFeed = incomingFeed;
        } else {
          const itemIds = new Set(
            state.discoverFeed.map((item) => `${item.feedType}-${item._id}`)
          );
          state.discoverFeed.push(
            ...incomingFeed.filter((item) => !itemIds.has(`${item.feedType}-${item._id}`))
          );
        }

        state.discoverPage = action.payload.page || requestedPage;
        state.discoverTotalPages = action.payload.totalPages || 1;
      })
      .addCase(getDiscoverFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getTeacherLessons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTeacherLessons.fulfilled, (state, action) => {
        state.loading = false;
        state.Teacherlessons = action.payload.lessons;
      })
      .addCase(getTeacherLessons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getTeacherLessonsById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTeacherLessonsById.fulfilled, (state, action) => {
        state.loading = false;
        state.Teacheridlessons = action.payload.data;
      })
      .addCase(getTeacherLessonsById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Lesson by ID
      .addCase(getLessonById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lesson = null;
      })
      .addCase(getLessonById.fulfilled, (state, action) => {
        state.loading = false;
        state.lesson = action.payload;
      })
      .addCase(getLessonById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get CurriLesson by ID
      .addCase(getCurriLessonById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurriLessonById.fulfilled, (state, action) => {
        state.loading = false;
        state.currilesson = action.payload.curriculums;
      })
      .addCase(getCurriLessonById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Lesson
      .addCase(updateLesson.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLesson.fulfilled, (state, action) => {
        state.loading = false;
        state.lesson = action.payload.lesson;
        // Update in lessons array
        const index = state.lessons.findIndex(
          (l) => l._id === action.payload.lesson._id
        );
        if (index !== -1) {
          state.lessons[index] = action.payload.lesson;
        }
        state.successMessage = action.payload.message || "Lesson updated successfully";
      })
      .addCase(updateLesson.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Lesson
      .addCase(deleteLesson.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLesson.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message || "Lesson deleted successfully";
      })
      .addCase(deleteLesson.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccessMessage } = lessonSlice.actions;
export default lessonSlice.reducer;
