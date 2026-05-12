import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/Product.model.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = Product.find({}); //find all products
    res.status(200).json({ products });
  } catch (error) {
    console.log("Error in getAllProducts controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", Error: error.message });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_products");
    if (featuredProducts) {
      return res.json(JSON.parse(featuredProducts));
    }

    //if not in redis, fetch from mongoDB
    //.lean is gonna return a plain js object instead of a mongoDB document

    featuredProducts = await Product.find({ isFeatured: true }).lean();
    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" });
    }

    //store in redis for future quick access

    await redis.set("featured_products", JSON.stringify(featuredProducts));
    res.json(featuredProducts);
  } catch (error) {
    console.log("Error in getFeaturedProducts controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;
    let cloudinaryResponse = null;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }

    const products = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url
        ? cloudinaryResponse.secure_url
        : "",
      category,
    });
    res.status(201).json(products);
  } catch (error) {
    console.log("Error in createProduct controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Could not find product" });

    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log("Deleted image from cloudinary");
      } catch (error) {
        console.log("Error deleting image from cloudinary");
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json("Product deleted successfully");
  } catch (error) {
    console.log("Error in deleteProduct controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 3 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          image: 1,
          price: 1,
        },
      },
    ]);

    res.status(200).json(products);
  } catch (error) {
    console.log("Error in getRecommendedProducts controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getProductsByCategory = async (req, res) => {
  const { category } = req.params;

  try {
    const products = await Product.find({ category });
    res.status(200).json(products);
  } catch (error) {
    console.log("Error in getProductsByCategory controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      product.isFeatured = !product.isFeatured;
      const updatedProduct = await product.save();
      await updateFeaturedProductCache();
      res.status(200).json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.log("Error in toogleFeaturedProduct controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

async function updateFeaturedProductCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.log("Error in cache function", error.message);
  }
}
