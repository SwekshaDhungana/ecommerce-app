// import Coupon from "../models/Coupon.model.js";

// export const getCoupon = async (req, res) => {
//   try {
//     const coupon = await Coupon.findOne({
//       userId: req.user._id,
//       isActive: true,
//     });
//     res.json(coupon || null);
//   } catch (error) {
//     console.log("Error in getCoupon controller", error.message);
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

// export const validateCoupon = async (req, res) => {
//   try {
//     const { code } = req.validatedBody;
//     const coupon = await Coupon.findOne({
//       code: code,
//       userId: req.user._id,
//       isActive: true,
//     });

//     if (!coupon) {
//       return res.status(404).json({ message: "Coupon not found" });
//     }
//     if (coupon.expirationDate < new Date()) {
//       coupon.isActive = false;
//       await coupon.save();
//       return res.status(404).json({ message: "Coupon Expired" });
//     }
//     res.json({
//       message: "Message is valid",
//       code: coupon.code,
//       discountPercentage: coupon.discountPercentage,
//     });
//   } catch (error) {
//     console.log("Error in validateCoupon controller", error.message);
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

import Coupon from "../models/Coupon.model.js";
import { asyncHandler } from "../middleware/async.middleware.js";

export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOne({
    userId: req.user._id,
    isActive: true,
  });

  res.status(200).json(coupon || null);
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.validatedBody;

  const coupon = await Coupon.findOne({
    code,
    userId: req.user._id,
    isActive: true,
  });

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  if (coupon.expirationDate < new Date()) {
    coupon.isActive = false;
    await coupon.save();

    res.status(400);
    throw new Error("Coupon expired");
  }

  res.status(200).json({
    message: "Coupon is valid",
    code: coupon.code,
    discountPercentage: coupon.discountPercentage,
  });
});
