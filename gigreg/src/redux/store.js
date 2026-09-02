import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./reducers/AuthReducer";
import lessonSlice from "./reducers/LessonReducer";
import curriculumSlice from "./reducers/CurriculumReducer";
import favoriteSlice from "./reducers/FavoriteReducer";
import availabilitySlice from "./reducers/AvailabilityReducer";
import proposeSlice from "./reducers/ProposeReducer";
import chatReducer from "./reducers/ChatReducer";
import bookingReducer from "./reducers/BookingReducer";
import ratingReducer from "./reducers/RatingReducer";
import withdrawalReducer from "./reducers/WithdrawalReducer";
import categoryReducer from "./reducers/CategoryReducer";
import DashBoardReducer from "./reducers/DashboardReducer";
import listingReducer from "./reducers/ListingReducer";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    lesson: lessonSlice,
    curriculum: curriculumSlice,
    favorite: favoriteSlice,
    availability: availabilitySlice,
    propose: proposeSlice,
    chat: chatReducer,
    book: bookingReducer,
    rating: ratingReducer,
    withdrawal: withdrawalReducer,
    category: categoryReducer,
    dashboard: DashBoardReducer,
    listing: listingReducer,
  },
});
