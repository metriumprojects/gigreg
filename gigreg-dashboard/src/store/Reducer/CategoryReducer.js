import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const getCategories = createAsyncThunk(
  "category/get-all",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/category/all-categories", {
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

export const createCategory = createAsyncThunk(
  "category/create",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/category/create", formData, {
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

export const updateCategory = createAsyncThunk(
  "category/update",
  async ({ categoryId, formData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/category/update-category/${categoryId}`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
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

export const deleteCategory = createAsyncThunk(
  "category/delete",
  async (categoryId, { rejectWithValue }) => {
    try {
      const response = await api.delete(
        `/category/delete-category/${categoryId}`,
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


const initialState = {
  // Lessons
  
  // Categories
  categories: [],
  category: null,
  
  // State management
  loading: false,
  error: null,
  successMessage: "",
};

// ========================= LESSON SLICE =========================

const categorySlice = createSlice({
  name: "category",
  initialState,
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
    
      // Get Categories
      .addCase(getCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(getCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Category
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories.unshift(action.payload.category);
        state.successMessage = action.payload.message || "Category created successfully";
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Category
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.category = action.payload.category;
        const index = state.categories.findIndex(
          (c) => c._id === action.payload.category._id
        );
        if (index !== -1) {
          state.categories[index] = action.payload.category;
        }
        state.successMessage = action.payload.message || "Category updated successfully";
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Category
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = state.categories.filter(
          (c) => c._id !== action.meta.arg
        );
        state.successMessage = action.payload.message || "Category deleted successfully";
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccessMessage } = categorySlice.actions;
export default categorySlice.reducer;