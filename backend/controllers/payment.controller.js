import Coupon from "../models/Coupon.model.js";
import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import { stripe } from "../lib/stripe.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/async.middleware.js";

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { products, couponCode } = req.validatedBody;

  const productIds = products.map((product) => product._id);
  const dbProducts = await Product.find({ _id: { $in: productIds } }).lean();

  if (dbProducts.length !== productIds.length) {
    res.status(400);
    throw new Error("One or more products are invalid");
  }

  const productMap = new Map(
    dbProducts.map((product) => [product._id.toString(), product]),
  );

  let totalAmount = 0;

  const lineItems = products.map(({ _id, quantity }) => {
    const dbProduct = productMap.get(_id);
    const unitAmount = Math.round(dbProduct.price * 100);

    totalAmount += unitAmount * quantity;

    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: dbProduct.name,
          images: dbProduct.image ? [dbProduct.image] : [],
        },
        unit_amount: unitAmount,
      },
      quantity,
    };
  });

  let coupon = null;

  if (couponCode) {
    coupon = await Coupon.findOne({
      code: couponCode,
      userId: req.user._id,
      isActive: true,
      expirationDate: { $gt: new Date() },
    });

    if (!coupon) {
      res.status(400);
      throw new Error("Invalid or expired coupon");
    }

    totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CLIENT_URL}/purchase-cancel`,
    discounts: coupon
      ? [
          {
            coupon: await createStripeCoupon(coupon.discountPercentage),
          },
        ]
      : [],
    metadata: {
      userId: req.user._id.toString(),
      couponCode: coupon?.code || "",
      products: JSON.stringify(
        products.map(({ _id, quantity }) => ({
          id: _id,
          quantity,
          price: productMap.get(_id).price,
        })),
      ),
    },
  });

  res.status(200).json({
    id: session.id,
    url: session.url,
    totalAmount: totalAmount / 100,
  });
});

export const checkoutSuccess = asyncHandler(async (req, res) => {
  const { sessionId } = req.validatedBody;
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    res.status(400);
    throw new Error("Payment has not been completed");
  }

  const products = JSON.parse(session.metadata.products);

  const orderPayload = {
    user: session.metadata.userId,
    products: products.map((product) => ({
      product: product.id,
      quantity: product.quantity,
      price: product.price,
    })),
    totalAmount: session.amount_total / 100,
    stripeSessionId: sessionId,
  };

  const upsertResult = await Order.updateOne(
    { stripeSessionId: sessionId },
    { $setOnInsert: orderPayload },
    {
      upsert: true,
      runValidators: true,
    },
  );

  const order = await Order.findOne({ stripeSessionId: sessionId });

  const wasCreatedNow = upsertResult.upsertedCount === 1;

  if (wasCreatedNow) {
    if (session.metadata.couponCode) {
      await Coupon.findOneAndUpdate(
        {
          code: session.metadata.couponCode,
          userId: session.metadata.userId,
        },
        {
          isActive: false,
        },
      );
    }

    await User.findByIdAndUpdate(session.metadata.userId, {
      cartItems: [],
    });

    if (order.totalAmount >= 200) {
      await createNewCoupon(session.metadata.userId);
    }
  }

  res.status(200).json({
    success: true,
    message: wasCreatedNow
      ? "Payment successful and order created."
      : "Order already processed for this payment session.",
    orderId: order._id,
  });
});

async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });

  return coupon.id;
}

async function createNewCoupon(userId) {
  await Coupon.findOneAndDelete({ userId });

  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userId,
  });

  await newCoupon.save();

  return newCoupon;
}
