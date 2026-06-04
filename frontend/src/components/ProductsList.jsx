import { motion } from "framer-motion";
import { Trash, Star } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import { useProductStore } from "../stores/useProductStore";

const ProductsList = () => {
  const { deleteProduct, toggleFeaturedProduct, products, loading, error } =
    useProductStore();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-red-500 bg-red-950/40 p-6 text-center text-red-200">
        {error}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-gray-700 bg-gray-800 p-6 text-center text-gray-300">
        No products found.
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-4xl overflow-hidden rounded-lg bg-gray-800 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
            >
              Product
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
            >
              Price
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
            >
              Category
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
            >
              Featured
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
            >
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-700 bg-gray-800">
          {products.map((product) => (
            <tr key={product._id} className="hover:bg-gray-700">
              <td className="whitespace-nowrap px-6 py-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0">
                    <img
                      className="h-10 w-10 rounded-full object-cover"
                      src={product.image}
                      alt={product.name}
                    />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-white">
                      {product.name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <div className="text-sm text-gray-300">
                  ${product.price.toFixed(2)}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <div className="text-sm text-gray-300">{product.category}</div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <button
                  onClick={() => toggleFeaturedProduct(product._id)}
                  className={`rounded-full p-1 transition-colors duration-200 ${
                    product.isFeatured
                      ? "bg-yellow-400 text-gray-900"
                      : "bg-gray-600 text-gray-300"
                  } hover:bg-yellow-500`}
                >
                  <Star className="h-5 w-5" />
                </button>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                <button
                  onClick={() => deleteProduct(product._id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};

export default ProductsList;
