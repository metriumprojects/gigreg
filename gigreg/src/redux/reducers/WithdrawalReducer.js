import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ====================================================
// 1) ADD WITHDRAWAL (createWithdrawal)
// ====================================================
export const addWithdrawal = createAsyncThunk(
  "withdrawal/add",
  async (formData, thunkAPI) => {
    try {
      const res = await api.post(`/withdrawal/add-withdrawal`, formData, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Error");
    }
  }
);

// ====================================================
// 2) APPROVE WITHDRAWAL
// ====================================================
export const approveWithdrawal = createAsyncThunk(
  "withdrawal/approve",
  async (id, thunkAPI) => {
    try {
      const res = await api.post(
        `/withdrawal/approved-withdrawal`,
        { id },
        {
        withCredentials: true,
      }
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Error");
    }
  }
);

// ====================================================
// 3) USER WITHDRAWAL HISTORY
// ====================================================
export const getUserWithdrawals = createAsyncThunk(
  "withdrawal/user",
  async (_, thunkAPI) => {
    try {
      const res = await api.get(`/withdrawal/user-withdrawal`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Error");
    }
  }
);

// ====================================================
// 4) ALL WITHDRAWALS — ADMIN PANEL
// ====================================================
export const getAllWithdrawals = createAsyncThunk(
  "withdrawal/all",
  async ({status, page, limit}, thunkAPI) => {
    try {
      const res = await api.get(`/withdrawal/all-withdrawal?page=${page}&limit=${limit}&status=${status}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Error");
    }
  }
);

// ====================================================
//     SLICE
// ====================================================
const withdrawalSlice = createSlice({
  name: "withdrawal",
  initialState: {
    loading: false,
    error: null,
    userWithdrawals: [],
    allWithdrawals: [],
    message: "",
  },

  reducers: {},

  extraReducers: (builder) => {
    // ADD WITHDRAWAL
    builder
      .addCase(addWithdrawal.pending, (state) => {
        state.loading = true;
      })
      .addCase(addWithdrawal.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
      })
      .addCase(addWithdrawal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // APPROVE WITHDRAWAL
    builder
      .addCase(approveWithdrawal.fulfilled, (state, action) => {
        const updated = action.payload.updatedWithdrawal;
        state.allWithdrawals = state.allWithdrawals.map((item) =>
          item._id === updated._id ? updated : item
        );
      });

    // USER WITHDRAWALS
    builder
      .addCase(getUserWithdrawals.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserWithdrawals.fulfilled, (state, action) => {
        state.loading = false;
        state.userWithdrawals = action.payload.withdrawals;
      })
      .addCase(getUserWithdrawals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ALL WITHDRAWALS
    builder
      .addCase(getAllWithdrawals.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllWithdrawals.fulfilled, (state, action) => {
        state.loading = false;
        state.allWithdrawals = action.payload.withdrawals;
      })
      .addCase(getAllWithdrawals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default withdrawalSlice.reducer;
