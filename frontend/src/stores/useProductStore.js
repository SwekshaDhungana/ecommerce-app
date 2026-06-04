import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";

const getApiErrorMessage = (error, fallbackMessage) => {
  return (
    error.response?.data?.errors?.[0]?.message ||
    error.response?.data?.message ||
    fallbackMessage
  );
};

export const useProductStore = create((set) => ({
  products: [],
  loading: false,
  error: null,

  setProducts: (products) => set({ products }),

  createProduct: async (productData) => {
    set({ loading: true, error: null });

    try {
      const res = await axiosInstance.post("/products", productData);

      set((prevState) => ({
        products: [...prevState.products, res.data],
        loading: false,
      }));

      toast.success("Product created successfully");
      return res.data;
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to create product");

      set({ loading: false, error: message });
      toast.error(message);

      throw error;
    }
  },

  fetchAllProducts: async () => {
    set({ loading: true, error: null });

    try {
      const res = await axiosInstance.get("/products");
      set({ products: res.data, loading: false });
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to fetch products");
      set({ loading: false, error: message });
      toast.error(message);
    }
  },

  fetchProductsByCategory: async (category) => {
    set({ loading: true, error: null });

    try {
      const res = await axiosInstance.get(`/products/category/${category}`);
      set({ products: res.data, loading: false });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to fetch products by category",
      );

      set({ loading: false, error: message });
      toast.error(message);
    }
  },

  deleteProduct: async (productId) => {
    set({ loading: true, error: null });

    try {
      await axiosInstance.delete(`/products/${productId}`);

      set((state) => ({
        products: state.products.filter((product) => product._id !== productId),
        loading: false,
      }));

      toast.success("Product deleted successfully");
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to delete product");

      set({ loading: false, error: message });
      toast.error(message);
    }
  },

  toggleFeaturedProduct: async (productId) => {
    set({ loading: true, error: null });

    try {
      const res = await axiosInstance.patch(`/products/${productId}`);

      set((state) => ({
        products: state.products.map((product) =>
          product._id === productId
            ? { ...product, isFeatured: res.data.isFeatured }
            : product,
        ),
        loading: false,
      }));

      toast.success("Product updated successfully");
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to update product");

      set({ loading: false, error: message });
      toast.error(message);
    }
  },

  fetchFeaturedProducts: async () => {
    set({ loading: true, error: null });

    try {
      const response = await axiosInstance.get("/products/featured");
      set({ products: response.data, loading: false });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to fetch featured products",
      );

      set({ loading: false, error: message });
      toast.error(message);
    }
  },
}));
