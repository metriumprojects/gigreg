import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// Async thunks
export const createPropose = createAsyncThunk(
  "propose/create",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post(`/propose/create`, formData,{
        withCredentials: true,
      }, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getAllProposes = createAsyncThunk(
  "propose/getAll",
  async ( {
      page,
      limit,
      search,
      minPrice,
      maxPrice,
      isOnline,
      supportsInPerson,
      location,
      category,
      sort = "newest",
    }, { rejectWithValue }) => {
    try {
            const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search ?? "",
        minPrice: String(minPrice),
        maxPrice: String(maxPrice),
        sort: sort || "newest",
      });
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
      const res = await api.get(`/propose/get-propose?${params.toString()}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getProposeById = createAsyncThunk(
  "propose/getById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/propose/propose/${id}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updatePropose = createAsyncThunk(
  "propose/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/propose/update-propose/${id}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deletePropose = createAsyncThunk(
  "propose/delete",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.delete(`/propose/delete-propose/${id}`, {
          withCredentials: true,
      });
      return { id, ...res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getProposeByUser = createAsyncThunk(
  "propose/getByUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`/propose/user-propose`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const proposeSlice = createSlice({
  name: "propose",
  initialState: {
    proposes: [],
    propose: null,
    userProposes: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearProposeError: (state) => {
      state.error = null;
    },
    clearPropose: (state) => {
      state.propose = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createPropose
      .addCase(createPropose.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPropose.fulfilled, (state, action) => {
        state.loading = false;
        state.proposesvalue = action.payload.data;
      })
      .addCase(createPropose.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getAllProposes
      .addCase(getAllProposes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllProposes.fulfilled, (state, action) => {
        state.loading = false;
        state.proposes = action.payload.data;
      })
      .addCase(getAllProposes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getProposeById
      .addCase(getProposeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProposeById.fulfilled, (state, action) => {
        state.loading = false;
        state.propose = action.payload.propose;
      })
      .addCase(getProposeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updatePropose
      .addCase(updatePropose.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePropose.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.proposes.findIndex((p) => p._id === action.payload.propose._id);
        if (index !== -1) state.proposes[index] = action.payload.propose;
        if (state.propose && state.propose._id === action.payload.propose._id) {
          state.propose = action.payload.propose;
        }
      })
      .addCase(updatePropose.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deletePropose
      .addCase(deletePropose.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePropose.fulfilled, (state, action) => {
        state.loading = false;
        state.proposes = state.proposes.filter((p) => p._id !== action.payload.id);
        if (state.propose && state.propose._id === action.payload.id) {
          state.propose = null;
        }
      })
      .addCase(deletePropose.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getProposeByUser
      .addCase(getProposeByUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProposeByUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userProposes = action.payload;
      })
      .addCase(getProposeByUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearProposeError, clearPropose } = proposeSlice.actions;
export default proposeSlice.reducer;
