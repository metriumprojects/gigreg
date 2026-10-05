import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const getHomeSliders = createAsyncThunk(
  "homeSlider/get-all",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/home-slider", { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const createHomeSlider = createAsyncThunk(
  "homeSlider/create",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/home-slider", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const updateHomeSlider = createAsyncThunk(
  "homeSlider/update",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/home-slider/${id}`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const deleteHomeSlider = createAsyncThunk(
  "homeSlider/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/home-slider/${id}`, {
        withCredentials: true,
      });
      return { ...response.data, id };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

const homeSliderSlice = createSlice({
  name: "homeSlider",
  initialState: {
    slides: [],
    loading: false,
    error: null,
    successMessage: "",
  },
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
      .addCase(getHomeSliders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHomeSliders.fulfilled, (state, action) => {
        state.loading = false;
        state.slides = action.payload.slides || [];
      })
      .addCase(getHomeSliders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createHomeSlider.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createHomeSlider.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.slide) state.slides.unshift(action.payload.slide);
        state.successMessage =
          action.payload.message || "Slider item created successfully";
      })
      .addCase(createHomeSlider.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateHomeSlider.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateHomeSlider.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.slide;
        if (updated) {
          const index = state.slides.findIndex((s) => s._id === updated._id);
          if (index !== -1) state.slides[index] = updated;
        }
        state.successMessage =
          action.payload.message || "Slider item updated successfully";
      })
      .addCase(updateHomeSlider.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteHomeSlider.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteHomeSlider.fulfilled, (state, action) => {
        state.loading = false;
        state.slides = state.slides.filter((s) => s._id !== action.payload.id);
        state.successMessage =
          action.payload.message || "Slider item deleted successfully";
      })
      .addCase(deleteHomeSlider.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccessMessage } = homeSliderSlice.actions;
export default homeSliderSlice.reducer;
