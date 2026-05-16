import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";

export const useProductStore = create((set) => ({
  products: [],
  loading: false,
  setProducts: (products) => set({ products }),
  createProduct: async (productData) => {
    set({ loading: true });
    try {
      const res = axiosInstance.post("/products", productData);
      set((prevState) => ({
        products: [...prevState.products, res.data],
        loading: false,
      }));
    } catch (error) {
      toast.error(error.response.data.error);
      set({ loading: false });
    }
  },
  fetchAllProducts: async () => {
    set({ loading: true });
    try {
      const res = await axiosInstance.get("/products");
      console.log(res, "response");
      console.log(res.data, "data");
      set({ products: res.data, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch products", loading: false });
      toast.error(error.response.data.error || "Failed to fetch products");
    }
  },
  deleteProduct: async (productId) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.delete(`products/${productId}`);
      set((state) => ({
        products: state.products.filter((product) => product._id !== productId),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });

      toast.error(error.response?.data?.error || "Failed to delete product");
    }
  },
  // toggleFeaturedProduct: async (productId) => {
  //   set({ loading: true });
  //   try {
  //     const res = await axiosInstance.patch(`products/${productId}`);
  //     set((prevProducts) => ({
  //       products: prevProducts.products.map((product) =>
  //         product._id === productId
  //           ? { ...product, isFeatured: res.data.isFeatured }
  //           : product,
  //       ),
  //       loading: false,
  //     }));
  //   } catch (error) {
  //     set({ loading: false });
  //     toast.error(error.response.data.error || "Failed to update Product");
  //   }
  // },
  toggleFeaturedProduct: async (productId) => {
    set({ loading: true });

    try {
      const res = await axiosInstance.patch(`/products/${productId}`);
      //state here is actually the previous state object from Zustand.
      set((state) => ({
        products: state.products.map((product) =>
          product._id === productId
            ? { ...product, isFeatured: res.data.isFeatured }
            : product,
        ),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });

      toast.error(error.response?.data?.error || "Failed to update product");
    }
  },
}));
