import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const fetchListings = createAsyncThunk(
  "listings/fetchListings",
  async ({ page = 1, limit = 20, search = "", status } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search?.trim()) params.append("search", search.trim());
      if (status) params.append("status", status);

      const res = await api.get(`/listings?${params.toString()}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteListing = createAsyncThunk(
  "listings/deleteListing",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/listings/${id}`, {
        withCredentials: true,
      });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateListing = createAsyncThunk(
  "listings/updateListing",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/listings/${id}`, data, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const ListingsSlice = createSlice({
  name: "listings",
  initialState: {
    listings: [],
    loading: false,
    error: null,
    page: 1,
    total: 0,
    totalPages: 1,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchListings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListings.fulfilled, (state, action) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.listings = action.payload;
          state.total = action.payload.length;
          state.page = 1;
          state.totalPages = 1;
        } else if (action.payload && Array.isArray(action.payload.listings)) {
          state.listings = action.payload.listings;
          state.page = action.payload.page || 1;
          state.total = action.payload.total || action.payload.listings.length;
          state.totalPages = action.payload.totalPages || 1;
        } else {
          state.listings = [];
        }
      })
      .addCase(fetchListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(deleteListing.fulfilled, (state, action) => {
        state.listings = state.listings.filter((l) => l._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteListing.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(updateListing.fulfilled, (state, action) => {
        const updated =
          action.payload && action.payload.listing ? action.payload.listing : action.payload;
        state.listings = state.listings.map((l) =>
          l._id === (updated._id || updated.id) ? { ...l, ...updated } : l
        );
      })
      .addCase(updateListing.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export default ListingsSlice.reducer;
