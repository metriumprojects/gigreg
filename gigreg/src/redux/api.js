import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const socketBaseUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

const api = axios.create({
  baseURL: apiBaseUrl,
});

// Attach token to every request (for mobile app support)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export const socketHost = socketBaseUrl;
