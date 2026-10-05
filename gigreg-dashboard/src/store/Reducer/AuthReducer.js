import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const registerUser = createAsyncThunk(
  "user/register",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/register", userData, {
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

export const loginUser = createAsyncThunk(
  "user/login",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/dashboard/admin-login", userData, {
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
export const directLogin = createAsyncThunk(
  "user/login",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/dashboard/user-login/${id}`, {
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
export const GoogleloginUser = createAsyncThunk(
  "user/google-login",
  async (id_token, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/google-login", id_token, {
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

export const getUser = createAsyncThunk(
  "user/get-user",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/users/profile", {
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

export const forgetPassword = createAsyncThunk(
  "user/forget-password",
  async (email, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/forgot-password", { email });
      const data = response.data;
      return data;
    }
    catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
    }
);
export const ResetPassword = createAsyncThunk(
  "user/forget-password",
  async ({token, password}, { rejectWithValue }) => {
    try {
      const response = await api.post(`/users/reset-password/${token}`, { password });
      const data = response.data;
      return data;
    }
    catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Something went wrong" }
      );
    }
    }
);

export const LogoutUser = createAsyncThunk(
  "user/logout-user",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/users/logout-user", {
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

export const updateProfileImage = createAsyncThunk(
  "user/update-image",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/update-image", formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
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

export const updateProfile = createAsyncThunk(
  "user/update-profile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/update-profile", profileData, {
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

export const becomeTeacher = createAsyncThunk(
  "user/become-teacher",
  async (role, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/become-teacher",{role}, {
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
export const getUserById = createAsyncThunk(
  "user/user-by-id",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/user/${id}`, {
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
  user: null,
  userInfo: null,
  userbyid: null,
  loading: false,
  error: null,
};

// User slice
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    messageClear: (state, _) => {
      state.errorMessage = "";
      state.successMessage = "";
    },
    user_reset: (state, _) => {
      state.userInfo = "";
    },
  },
  extraReducers: (builder) => {
    builder

      // Login user
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get user 
      .addCase(getUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
      })
      .addCase(getUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get user by ID
      .addCase(getUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.userbyid = action.payload.data;
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update profile image
      .addCase(updateProfileImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfileImage.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { ...state.user, image: action.payload.image };
      })
      .addCase(updateProfileImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = { ...state.userInfo, ...action.payload.user };
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Become teacher
      .addCase(becomeTeacher.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(becomeTeacher.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = { ...state.userInfo, role: "teacher" };
      })
      .addCase(becomeTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout user
      .addCase(LogoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(LogoutUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = null;
        state.user = null;
      })
      .addCase(LogoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
  },
});

export const { clearError, messageClear, user_reset } = userSlice.actions;

export default userSlice.reducer;
