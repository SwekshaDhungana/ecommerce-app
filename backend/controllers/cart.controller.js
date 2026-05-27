import Product from "../models/Product.model.js";

export const getCartProducts = async (req, res) => {
  try {
    const productIds = req.user.cartItems.map((item) => item.product);

    const products = await Product.find({
      _id: { $in: productIds },
    }).lean();

    const productMap = new Map(
      products.map((product) => [product._id.toString(), product]),
    );

    //we use flatma because it will return nothing in [], but if it was map, it would return null, if it did not find product.
    const cartItems = req.user.cartItems.flatMap((item) => {
      const product = productMap.get(item.product.toString());

      if (!product) {
        return [];
      }

      return [
        {
          ...product,
          quantity: item.quantity,
        },
      ];
    });

    res.status(200).json(cartItems);
  } catch (error) {
    console.log("Error in getCartProducts controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.validatedBody;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const productExists = await Product.exists({ _id: productId });

    if (!productExists) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = req.user;

    const existingItem = user.cartItems.find(
      (item) => item.product.toString() === productId,
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push({
        product: productId,
        quantity: 1,
      });
    }

    await user.save();

    res.status(200).json(user.cartItems);
  } catch (error) {
    console.log("Error in addToCart controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.validatedBody;
    const user = req.user;

    if (!productId) {
      user.cartItems = [];
      await user.save();

      return res.status(200).json(user.cartItems);
    }

    user.cartItems = user.cartItems.filter(
      (item) => item.product.toString() !== productId,
    );

    await user.save();

    res.status(200).json(user.cartItems);
  } catch (error) {
    console.log("Error in removeAllFromCart controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.validatedParams;
    const { quantity } = req.validatedBody;
    const user = req.user;

    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({
        message: "Quantity must be an integer greater than or equal to 0",
      });
    }

    const existingItem = user.cartItems.find(
      (item) => item.product.toString() === productId,
    );

    if (!existingItem) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    if (quantity === 0) {
      user.cartItems = user.cartItems.filter(
        (item) => item.product.toString() !== productId,
      );

      await user.save();

      return res.status(200).json(user.cartItems);
    }

    existingItem.quantity = quantity;
    await user.save();

    res.status(200).json(user.cartItems);
  } catch (error) {
    console.log("Error in updateQuantity controller", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
