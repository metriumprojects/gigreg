import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const createCurriculum = createAsyncThunk(
  "curriculum/create-curriculum",
  async (curriculumData, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/course/create-curriculum",
        curriculumData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
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

export const getAllCurriculums = createAsyncThunk(
  "curriculum/get-all-curriculums",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/course/all-curriculum", {
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

export const getTeacherCurriculums = createAsyncThunk(
  "curriculum/get-teacher-curriculums",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/course/teacher-curriculum", {
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

export const getSingleCurriculum = createAsyncThunk(
  "curriculum/get-single-curriculum",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/course/curriculum/${id}`,
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

export const updateCurriculum = createAsyncThunk(
  "curriculum/update-curriculum",
  async ({ id, curriculumData }, { rejectWithValue }) => {
    
    // Log FormData contents if it's a FormData object
    if (curriculumData instanceof FormData) {
      for (const [key, value] of curriculumData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}:`, value);
        }
      }
    }
    
    try {
      const response = await api.put(
        `/course/update-curriculum/${id}`,
        curriculumData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const data = response.data;
      return data;
    } catch (error) {
      console.error("Update error:", error);
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

// Initial state
const initialState = {
  curriculums: [],
  singleCurriculum: null,
  teacherCurriculums: [],
  loading: false,
  error: null,
  successMessage: "",
  errorMessage: "",
};

// Curriculum slice
const curriculumSlice = createSlice({
  name: "curriculum",
  initialState,
  reducers: {
    messageClear: (state, _) => {
      state.errorMessage = "";
      state.successMessage = "";
    },
    curriculum_reset: (state, _) => {
      state.singleCurriculum = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create curriculum
      .addCase(createCurriculum.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCurriculum.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = "Curriculum created successfully";
        state.singleCurriculum = action.payload.data || action.payload;
      })
      .addCase(createCurriculum.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorMessage = action.payload?.message || "Failed to create curriculum";
      })
      // Get all curriculums
      .addCase(getAllCurriculums.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCurriculums.fulfilled, (state, action) => {
        state.loading = false;
        state.curriculums = action.payload.data || action.payload;
      })
      .addCase(getAllCurriculums.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
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
      // Get teacher curriculums
      .addCase(getTeacherCurriculums.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTeacherCurriculums.fulfilled, (state, action) => {
        state.loading = false;
        state.teacherCurriculums = action.payload.curriculums || action.payload;
      })
      .addCase(getTeacherCurriculums.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get single curriculum
      .addCase(getSingleCurriculum.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSingleCurriculum.fulfilled, (state, action) => {
        state.loading = false;
        state.singleCurriculum = action.payload.data || action.payload;
      })
      .addCase(getSingleCurriculum.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update curriculum
      .addCase(updateCurriculum.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCurriculum.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = "Curriculum updated successfully";
        state.singleCurriculum = action.payload.data || action.payload;
      })
      .addCase(updateCurriculum.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorMessage = action.payload?.message || "Failed to update curriculum";
      })
      // Delete curriculum
      .addCase(deleteCurriculum.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCurriculum.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = "Curriculum deleted successfully";
        state.singleCurriculum = null;
      })
      .addCase(deleteCurriculum.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorMessage = action.payload?.message || "Failed to delete curriculum";
      });
  },
});

export const { messageClear, curriculum_reset } = curriculumSlice.actions;

export default curriculumSlice.reducer;
