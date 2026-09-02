import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api";

export const createListing = createAsyncThunk(
  "listing/create",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/listings/create", formData, {
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

export const getMyListings = createAsyncThunk(
  "listing/get-my-listings",
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/listings/my-listings?page=${page}&limit=${limit}`,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getActiveListings = createAsyncThunk(
  "listing/get-active-listings",
  async (
    {
      page = 1,
      limit = 20,
      search = "",
      category = "",
      minPrice,
      maxPrice,
      isOnline,
      supportsInPerson,
      location = "",
      createdBy = "",
      currency = "USD",
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });

      if (category) params.append("category", category);
      if (Number.isFinite(minPrice)) params.append("minPrice", String(minPrice));
      if (Number.isFinite(maxPrice)) params.append("maxPrice", String(maxPrice));
      if (typeof isOnline === "boolean") params.append("isOnline", String(isOnline));
      if (typeof supportsInPerson === "boolean") {
        params.append("supportsInPerson", String(supportsInPerson));
      }
      if (location) params.append("location", location);
      if (createdBy) params.append("createdBy", createdBy);
      params.append("currency", currency);

      const response = await api.get(`/listings/active?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
  }
);

export const getListingById = createAsyncThunk(
  "listing/get-by-id",
  async (listingId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/listings/${listingId}`, {
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

export const getListingBySlug = createAsyncThunk(
  "listing/get-by-slug",
  async (slug, { rejectWithValue }) => {
    try {
      const response = await api.get(`/listings/slug/${slug}`, {
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

export const updateListing = createAsyncThunk(
  "listing/update",
  async ({ listingId, formData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/listings/update/${listingId}`, formData, {
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

export const deleteListing = createAsyncThunk(
  "listing/delete",
  async (listingId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/listings/delete/${listingId}`, {
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

const initialState = {
  listings: [],
  activeListings: [],
  listing: null,
  page: 1,
  activePage: 1,
  total: 0,
  activeTotal: 0,
  totalPages: 0,
  activeTotalPages: 0,
  loading: false,
  error: null,
  successMessage: "",
};

const listingSlice = createSlice({
  name: "listing",
  initialState,
  reducers: {
    clearListingError: (state) => {
      state.error = null;
    },
    clearListingSuccessMessage: (state) => {
      state.successMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createListing.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = "";
      })
      .addCase(createListing.fulfilled, (state, action) => {
        state.loading = false;
        state.listing = action.payload.listing;
        state.successMessage = action.payload.message;
      })
      .addCase(createListing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getMyListings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMyListings.fulfilled, (state, action) => {
        state.loading = false;
        state.listings = action.payload.listings;
        state.page = action.payload.page;
        state.total = action.payload.total;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(getMyListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getActiveListings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getActiveListings.fulfilled, (state, action) => {
        state.loading = false;
        state.activeListings = action.payload.listings;
        state.activePage = action.payload.page;
        state.activeTotal = action.payload.total;
        state.activeTotalPages = action.payload.totalPages;
      })
      .addCase(getActiveListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getListingById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.listing = null;
      })
      .addCase(getListingById.fulfilled, (state, action) => {
        state.loading = false;
        state.listing = action.payload.listing;
      })
      .addCase(getListingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getListingBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.listing = null;
      })
      .addCase(getListingBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.listing = action.payload.listing;
      })
      .addCase(getListingBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(updateListing.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = "";
      })
      .addCase(updateListing.fulfilled, (state, action) => {
        state.loading = false;
        state.listing = action.payload.listing;
        state.successMessage = action.payload.message;

        const index = state.listings.findIndex(
          (listing) => listing._id === action.payload.listing?._id
        );
        if (index !== -1) {
          state.listings[index] = action.payload.listing;
        }
      })
      .addCase(updateListing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(deleteListing.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = "";
      })
      .addCase(deleteListing.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.listings = state.listings.filter(
          (listing) => listing._id !== action.payload.listingId
        );
        if (state.listing?._id === action.payload.listingId) {
          state.listing = null;
        }
      })
      .addCase(deleteListing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearListingError, clearListingSuccessMessage } = listingSlice.actions;
export default listingSlice.reducer;
