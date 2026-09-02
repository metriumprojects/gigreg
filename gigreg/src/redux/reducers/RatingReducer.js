import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ---------------------- Thunks ----------------------

// Add Curriculum Rating
export const addCurriculumRating = createAsyncThunk(
  "rating/addCurriculumRating",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post("/rating/curriculum", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Add Lesson Rating
export const addLessonRating = createAsyncThunk(
  "rating/addLessonRating",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post("/rating/lesson", formData, {
        headers: { "Content-Type": "multipart/form-data" },
         withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// ---------------------- Slice ----------------------

const ratingSlice = createSlice({
  name: "rating",
  initialState: {
    loading: false,
    error: null,
    successMessage: null,
    curriculumData: null,
    lessonData: null,
  },

  reducers: {
    clearMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },

  extraReducers: (builder) => {
    // --------- Add Curriculum Rating ----------
    builder
      .addCase(addCurriculumRating.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCurriculumRating.fulfilled, (state, action) => {
        state.loading = false;
        state.curriculumData = action.payload;
        state.successMessage = "Curriculum rating added successfully.";
      })
      .addCase(addCurriculumRating.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // --------- Add Lesson Rating ----------
    builder
      .addCase(addLessonRating.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addLessonRating.fulfilled, (state, action) => {
        state.loading = false;
        state.lessonData = action.payload;
        state.successMessage = "Lesson rating added successfully.";
      })
      .addCase(addLessonRating.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearMessages } = ratingSlice.actions;
export default ratingSlice.reducer;
