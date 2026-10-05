import { configureStore } from "@reduxjs/toolkit";
import AuthReducer from "./Reducer/AuthReducer";
import DashboardReducer from "./Reducer/DashboardReducer";
import CategoryReducer from "./Reducer/CategoryReducer";
import ListingsReducer from "./Reducer/ListingsReducer";
import HomeSliderReducer from "./Reducer/HomeSliderReducer";

export const store = configureStore({
  reducer: {
    auth: AuthReducer,
    dashboard: DashboardReducer,
    category: CategoryReducer,
    listings: ListingsReducer,
    homeSlider: HomeSliderReducer,
  },
});

