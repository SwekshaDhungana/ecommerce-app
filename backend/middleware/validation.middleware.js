import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "ID is invalid");

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  email: z
    .string()
    .trim()
    .email("Email format is invalid")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be at most 72 characters"),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email format is invalid")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

const checkoutProductSchema = z.object({
  _id: objectIdSchema,
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(20, "Quantity cannot exceed 20"),
});

const createCheckoutSessionSchema = z.object({
  products: z
    .array(checkoutProductSchema)
    .min(1, "At least one product is required")
    .superRefine((products, ctx) => {
      const seenIds = new Set();

      products.forEach((product, index) => {
        if (seenIds.has(product._id)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "_id"],
            message: "Duplicate products are not allowed",
          });
        }

        seenIds.add(product._id);
      });
    }),
  couponCode: z
    .string()
    .trim()
    .min(1, "Coupon code cannot be empty")
    .max(50, "Coupon code is too long")
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional()
    .transform((value) => value ?? null),
});

const checkoutSuccessSchema = z.object({
  sessionId: z.string().trim().min(1, "Session ID is required"),
});

const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(120, "Product name must be at most 120 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be at most 2000 characters"),
  price: z.coerce
    .number()
    .positive("Price must be greater than 0")
    .max(100000, "Price is too large"),
  image: z.string().trim().min(1, "Image is required"),
  category: z.enum([
    "jeans",
    "t-shirts",
    "shoes",
    "glasses",
    "jackets",
    "suits",
    "bags",
  ]),
});

const addToCartSchema = z.object({
  productId: objectIdSchema,
});

const removeFromCartSchema = z.object({
  productId: objectIdSchema.optional(),
});

const updateCartQuantityParamsSchema = z.object({
  id: objectIdSchema,
});

const updateCartQuantityBodySchema = z.object({
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity must be at least 0")
    .max(20, "Quantity cannot exceed 20"),
});

const formatValidationErrors = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: formatValidationErrors(result.error),
    });
  }

  req.validatedBody = result.data;
  next();
};

export const validateUpdateCartQuantity = (req, res, next) => {
  const paramsResult = updateCartQuantityParamsSchema.safeParse(
    req.params ?? {},
  );
  const bodyResult = updateCartQuantityBodySchema.safeParse(req.body ?? {});

  if (!paramsResult.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: formatValidationErrors(paramsResult.error),
    });
  }

  if (!bodyResult.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: formatValidationErrors(bodyResult.error),
    });
  }

  req.validatedParams = paramsResult.data;
  req.validatedBody = bodyResult.data;
  next();
};

export const validateSignup = validateBody(signupSchema);
export const validateLogin = validateBody(loginSchema);
export const validateCreateCheckoutSession = validateBody(
  createCheckoutSessionSchema,
);
export const validateCheckoutSuccess = validateBody(checkoutSuccessSchema);
export const validateCreateProduct = validateBody(createProductSchema);
export const validateAddToCart = validateBody(addToCartSchema);
export const validateRemoveFromCart = validateBody(removeFromCartSchema);
