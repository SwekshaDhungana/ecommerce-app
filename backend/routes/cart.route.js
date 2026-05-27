import express from "express";
import {
  addToCart,
  getCartProducts,
  removeAllFromCart,
  updateQuantity,
} from "../controllers/cart.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  validateAddToCart,
  validateRemoveFromCart,
  validateUpdateCartQuantity,
} from "../middleware/validation.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getCartProducts);
router.post("/", protectRoute, validateAddToCart, addToCart);
router.delete("/", protectRoute, validateRemoveFromCart, removeAllFromCart);
router.put("/:id", protectRoute, validateUpdateCartQuantity, updateQuantity);

export default router;
