import Product from "../models/Product.model.js";
import { asyncHandler } from "../middleware/async.middleware.js";

const getProductId = (item) => item?.product?.toString?.();

const getValidCartItems = (items = []) =>
  items.filter((item) => Boolean(getProductId(item)));

export const getCartProducts = asyncHandler(async (req, res) => {
  const cartItems = getValidCartItems(req.user.cartItems);
  const productIds = cartItems.map((item) => getProductId(item));

  const products = await Product.find({
    _id: { $in: productIds },
  }).lean();

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  const responseItems = cartItems.flatMap((item) => {
    const product = productMap.get(getProductId(item));

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

  res.status(200).json(responseItems);
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId } = req.validatedBody;
  const productExists = await Product.exists({ _id: productId });

  if (!productExists) {
    res.status(404);
    throw new Error("Product not found");
  }

  const user = req.user;
  user.cartItems = getValidCartItems(user.cartItems);

  const existingItem = user.cartItems.find(
    (item) => getProductId(item) === productId,
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
});

export const removeAllFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.validatedBody;
  const user = req.user;

  user.cartItems = getValidCartItems(user.cartItems);

  if (!productId) {
    user.cartItems = [];
    await user.save();

    return res.status(200).json(user.cartItems);
  }

  user.cartItems = user.cartItems.filter(
    (item) => getProductId(item) !== productId,
  );

  await user.save();

  res.status(200).json(user.cartItems);
});

export const updateQuantity = asyncHandler(async (req, res) => {
  const { id: productId } = req.validatedParams;
  const { quantity } = req.validatedBody;
  const user = req.user;

  user.cartItems = getValidCartItems(user.cartItems);

  const existingItem = user.cartItems.find(
    (item) => getProductId(item) === productId,
  );

  if (!existingItem) {
    res.status(404);
    throw new Error("Product not found in cart");
  }

  if (quantity === 0) {
    user.cartItems = user.cartItems.filter(
      (item) => getProductId(item) !== productId,
    );

    await user.save();

    return res.status(200).json(user.cartItems);
  }

  existingItem.quantity = quantity;
  await user.save();

  res.status(200).json(user.cartItems);
});
