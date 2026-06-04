import { create } from "zustand";
import axiosInstance from "../lib/axios.js";
import { toast } from "react-hot-toast";

const getApiErrorMessage = (error, fallbackMessage) => {
  return (
    error.response?.data?.errors?.[0]?.message ||
    error.response?.data?.message ||
    fallbackMessage
  );
};

export const useUserStore = create((set) => ({
  user: null,
  loading: false,
  checkingAuth: true,

  signup: async ({ name, email, password, confirmPassword }) => {
    set({ loading: true });

    if (password !== confirmPassword) {
      set({ loading: false });
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await axiosInstance.post("/auth/signup", {
        name,
        email,
        password,
      });

      set({
        user: res.data.user,
        loading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to sign up");

      set({ loading: false });
      toast.error(message);
    }
  },

  login: async (email, password) => {
    set({ loading: true });

    try {
      const res = await axiosInstance.post("/auth/login", { email, password });

      set({
        user: res.data.user,
        loading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to log in");

      set({ loading: false });
      toast.error(message);
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ user: null });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to log out"));
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });

    try {
      const res = await axiosInstance.get("/auth/profile");
      set({
        user: res.data,
        checkingAuth: false,
      });
    } catch {
      set({
        user: null,
        checkingAuth: false,
      });
    }
  },

  refreshToken: async () => {
    await axiosInstance.post("/auth/refresh-token");
  },
}));

let refreshPromise = null;

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response.status === 401;
    const isRefreshRequest = originalRequest.url?.includes(
      "/auth/refresh-token",
    );

    if (isUnauthorized && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = useUserStore.getState().refreshToken();
        }

        await refreshPromise;
        return axiosInstance(originalRequest);
      } catch {
        useUserStore.setState({ user: null });
        return Promise.reject(error);
      } finally {
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  },
);
