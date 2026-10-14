import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
export const gigregFrontendUrl = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174";

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

