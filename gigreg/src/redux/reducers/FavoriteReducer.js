import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const toggleFavorite = createAsyncThunk(
  "favorite/toggle-favorite",
  async ({ id, type }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/favorites/save/${id}`, {type},
        {
          withCredentials: true,
        }
      );
      const data = response.data;
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getUserFavorites = createAsyncThunk(
  "favorite/get-user-favorites",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/favorites/all-favorites", {
        withCredentials: true,
      });
      const data = response.data;
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

// Curriculum Rating
export const getCurriculumRating = createAsyncThunk(
  "rating/get-curriculum-rating",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/rating/curriculum/${id}`, {
        withCredentials: true,
      });
      const data = response.data;
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

// Lesson Rating
export const getLessonRating = createAsyncThunk(
  "rating/get-lesson-rating",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/rating/lesson/${id}`, {
        withCredentials: true,
      });
      const data = response.data;
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);
export const getFavrtById = createAsyncThunk(
  "rating/get-fvrt-id",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/favorites/favorites-by-user/${id}`, {
        withCredentials: true,
      });
      const data = response.data;
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

// Initial state
const initialState = {
  favorites: {
    curriculums: [],
    lessons: [],
    listings: [],
  },
  fvrtid: {
    curriculums: [],
    lessons: [],
    listings: [],
  },
  lessonReviews:[],
  curriReviews: [],
  loading: false,
  error: null,
  successMessage: "",
  errorMessage: "",
  toggledItemId: null,
};

// Favorite slice
const favoriteSlice = createSlice({
  name: "favorite",
  initialState,
  reducers: {
    messageClear: (state, _) => {
      state.errorMessage = "";
      state.successMessage = "";
    },
    clearToggledItem: (state, _) => {
      state.toggledItemId = null;
    },
    clearRatings: (state, _) => {
      state.ratings.curriculum = null;
      state.ratings.lesson = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Toggle favorite
      .addCase(toggleFavorite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message || "Favorite toggled";
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorMessage = action.payload?.message || "Failed to toggle favorite";
      })
      // Get user favorites
      .addCase(getUserFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = action.payload.data;
      })
      .addCase(getUserFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorMessage = action.payload?.message || "Failed to fetch favorites";
      })
      // Get curriculum rating
      .addCase(getCurriculumRating.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurriculumRating.fulfilled, (state, action) => {
        state.loading = false;
        state.curriReviews = action.payload.rate;
      })
      .addCase(getCurriculumRating.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorMessage = action.payload?.message || "Failed to fetch curriculum rating";
      })
      // Get lesson rating
      .addCase(getLessonRating.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLessonRating.fulfilled, (state, action) => {
        state.loading = false;
        state.lessonReviews = action.payload.rate;
      })
      .addCase(getLessonRating.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorMessage = action.payload?.message || "Failed to fetch lesson rating";
      })
      // Get lesson rating
      .addCase(getFavrtById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFavrtById.fulfilled, (state, action) => {
        state.loading = false;
        state.fvrtid = action.payload.data;
      })
      .addCase(getFavrtById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorMessage = action.payload?.message || "Failed to fetch lesson rating";
      });
  },
});

export const { messageClear, clearToggledItem, clearRatings } = favoriteSlice.actions;

export default favoriteSlice.reducer;
