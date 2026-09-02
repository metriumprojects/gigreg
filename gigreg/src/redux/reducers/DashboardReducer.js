import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ======================
// 1) GET ALL USERS
// ======================
export const getAllUsers = createAsyncThunk(
  "users/getAll",
  async ({page, limit, search}, thunkAPI) => {
    try {
      const res = await api.get(`/dashboard/all-user?page=${page}&limit=${limit}&search=${search}`, {
        withCredentials: true,
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Error");
    }
  }
);

// ======================
// 2) UPDATE USER
// ======================
export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, name, email, password }, thunkAPI) => {
    try {
      const res = await api.post(`/dashboard/update-user/${id}`, { name, email, password }, {
     withCredentials: true,
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Error");
    }
  }
);

// ======================
// 3) DELETE USER
// ======================
export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id, thunkAPI) => {
    try {
      const res = await api.delete(`/dashboard/delete-user/${id}`, {
 withCredentials: true,
      });

      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response|| "Error");
    }
  }
);

// ======================
// 4) CHANGE USER ROLE
// ======================
export const changeUserRole = createAsyncThunk(
  "users/changeRole",
  async ({ id, role }, thunkAPI) => {
    try {
      const res = await api.patch(
        `/dashboard/change-role/${id}`,
        { role },
        {
          withCredentials: true,
        }
      );

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Error");
    }
  }
);

// ======================
// 5) GET ALL LESSONS
// ======================
export const getAllLessons = createAsyncThunk(
  "lessons/getAll",
  async ({page, limit, search}, thunkAPI) => {
    try {
      const res = await api.get(`/dashboard/all-lesson?page=${page}&limit=${limit}&search=${search}`, {
        withCredentials: true,
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Error");
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

// ======================
// 6) GET ALL CURRICULUM
// ======================
export const getAllCurriculums = createAsyncThunk(
  "curriculum/getAll",
  async ({page, limit, search}, thunkAPI) => {
    try {
      const res = await api.get(`/dashboard/all-curriculum?page=${page}&limit=${limit}&search=${search}`, {
        withCredentials: true,
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Error");
    }
  }
);

export const getAllCurriculumsByTecherId = createAsyncThunk(
  "curriculum/get-all-curriculums-by-id",
  async ({id, page, limit}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/course/curriculum-by-teacher/${id}?page=${page}&limit=${limit}`, {
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

export const deleteCurriculum = createAsyncThunk(
  "curriculum/delete-curriculum",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(
        `/course/delete-curriculum/${id}`,
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

// ======================
// 7) GET ALL COMBINED DATA
// ======================
export const getAllData = createAsyncThunk(
  "data/getAll",
  async (_, thunkAPI) => {
    try {
      const res = await api.get(`/dashboard/all-data`, {
        withCredentials: true,
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Error");
    }
  }
);

// ====================================================================
// SLICE
// ====================================================================
const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    users: [],
    lessons: [],
    Teacherlessons: [],
    curriculum: [],
    curriculums: [],
    allData: [],
    loading: false,
    error: null,
  },

  reducers: {},

  extraReducers: (builder) => {
    // ☑ GET ALL USERS
    builder
      .addCase(getAllUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.data;
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ☑ DELETE USER
    builder
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u._id !== action.payload.id);
      });

    // ☑ CHANGE ROLE
    builder
      .addCase(changeUserRole.fulfilled, (state, action) => {
        const { id, role } = action.meta.arg;
        state.users = state.users.map((u) =>
          u._id === id ? { ...u, role } : u
        );
      });

    // ☑ GET ALL LESSONS
    builder
      .addCase(getAllLessons.fulfilled, (state, action) => {
        state.lessons = action.payload.lessons;
      });
    // ☑ GET ALL LESSONS
    builder
       .addCase(getTeacherLessonsById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTeacherLessonsById.fulfilled, (state, action) => {
        state.loading = false;
        state.Teacherlessons = action.payload.data;
      })
      .addCase(getTeacherLessonsById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ☑ GET ALL CURRICULUM
    builder
      .addCase(getAllCurriculums.fulfilled, (state, action) => {
        state.curriculum = action.payload.curriculumList;
      });
    builder
       // Get all curriculums
      .addCase(getAllCurriculumsByTecherId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCurriculumsByTecherId.fulfilled, (state, action) => {
        state.loading = false;
        state.curriculums = action.payload.data || action.payload;
      })
      .addCase(getAllCurriculumsByTecherId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

    // ☑ GET ALL ALL-DATA
    builder
      .addCase(getAllData.fulfilled, (state, action) => {
        state.allData = action.payload;
      });
  },
});

export default dashboardSlice.reducer;
