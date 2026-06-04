import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import toast from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";
import axiosInstance from "../lib/axios";

const PeopleAlsoBought = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await axiosInstance.get("/products/recommendations");
        setRecommendations(res.data);
      } catch (error) {
        const message =
          error.response?.data?.message ||
          "An error occurred while fetching recommendations";

        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6 text-center text-gray-300">
        {error}
      </div>
    );
  }

  if (!recommendations.length) {
    return (
      <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6 text-center text-gray-300">
        No recommendations available right now.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-semibold text-emerald-400">
        People also bought
      </h3>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default PeopleAlsoBought;
