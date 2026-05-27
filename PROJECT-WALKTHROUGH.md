# E-commerce-app: End-to-End Project Walkthrough

This document explains how the `E-commerce-app` project works from end to end.

It is written for a beginner, but it stays honest about the actual code in this repository:

- what the app is doing
- which files are responsible for each part
- how data moves between frontend, backend, database, and third-party services
- where the design is simple and practical
- where the code has rough edges or real bugs

## 1. What this project is

This is a full-stack e-commerce application built with:

- Frontend: React + Vite + React Router + Zustand + Axios + Tailwind CSS
- Backend: Express + MongoDB/Mongoose
- Auth: JWT stored in HTTP-only cookies
- Caching / token storage: Redis
- Payments: Stripe Checkout
- Image hosting: Cloudinary
- Charts: Recharts

At a high level, the app lets a user:

1. Sign up or log in
2. Browse products by category
3. Add items to a cart
4. Apply a coupon
5. Go through Stripe checkout
6. Create an order after payment succeeds

If the logged-in user is an admin, the app also lets them:

1. Create products
2. Delete products
3. Mark products as featured
4. View analytics

## 2. The project structure

The repository is split into two main parts:

- `frontend/`: the React app
- `backend/`: the API server

There is also a root `package.json` that runs the backend server.

### Frontend entry points

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`

`main.jsx` mounts React inside `BrowserRouter`.

`App.jsx` is the real frontend starting point. It:

- checks whether the user is logged in
- fetches cart items after login
- sets up all routes
- shows the navbar and toaster notifications

### Backend entry point

- `backend/server.js`

This file:

- loads environment variables
- creates the Express app
- enables JSON parsing, CORS, and cookie parsing
- mounts the route files under `/api/...`
- connects to MongoDB
- starts the server

## 3. How the frontend works

The frontend is a React single-page application. Instead of full page reloads, React Router swaps components in and out when the URL changes.

### Main routes

Defined in `frontend/src/App.jsx`:

- `/`: home page
- `/signup`: signup page
- `/login`: login page
- `/category/:category`: category listing
- `/cart`: cart page
- `/purchase-success`: Stripe success return page
- `/purchase-cancel`: Stripe cancel page
- `/secret-dashboard`: admin page

Some routes are protected in the frontend:

- `/cart` requires a logged-in user
- `/purchase-success` and `/purchase-cancel` require a logged-in user
- `/secret-dashboard` requires `user.role === "admin"`

Important note: this frontend protection improves UX, but it is not real security by itself. Real security comes from the backend middleware that checks cookies and roles again.

### State management with Zustand

The project uses Zustand instead of React Context or Redux.

That means global app state is kept in small stores:

- `frontend/src/stores/useUserStore.js`
- `frontend/src/stores/useCartStore.js`
- `frontend/src/stores/useProductStore.js`

This is a reasonable choice for a project of this size because:

- Zustand is simpler than Redux
- there is less boilerplate
- the stores are easy to read

The tradeoff is that logic can become spread across stores and components if the app grows without stronger patterns.

### Axios

`frontend/src/lib/axios.js` creates a shared Axios instance.

Important behavior:

- in development it targets `http://localhost:5000/api`
- in production it targets `/api`
- `withCredentials: true` sends cookies with requests

That cookie behavior is required for auth to work, because the backend stores tokens in HTTP-only cookies.

## 4. How authentication works

Authentication is handled by:

- frontend store: `frontend/src/stores/useUserStore.js`
- backend routes: `backend/routes/auth.route.js`
- backend controller: `backend/controllers/auth.controller.js`
- backend middleware: `backend/middleware/auth.middleware.js`

### Signup flow

1. The user submits the signup form.
2. The frontend calls `POST /api/auth/signup`.
3. The backend creates the user in MongoDB.
4. The backend creates:
   - an access token
   - a refresh token
5. The backend stores the refresh token in Redis.
6. The backend sets both tokens as HTTP-only cookies.
7. The frontend stores the returned user data in Zustand.

### Login flow

1. The user submits email and password.
2. The frontend calls `POST /api/auth/login`.
3. The backend finds the user by email.
4. The backend compares the password using bcrypt.
5. If valid, the backend issues new tokens and sets them as cookies.
6. The frontend stores the logged-in user in Zustand.

### Protected request flow

For protected backend routes, `protectRoute` does this:

1. Reads `accessToken` from cookies
2. Verifies it with JWT
3. Looks up the user in MongoDB
4. Puts that user on `req.user`
5. Calls `next()`

Admin-only routes also pass through `adminRoute`, which checks `req.user.role === "admin"`.

### Why Redis is used

Redis is used to store refresh tokens by user ID.

This gives the backend a way to reject refresh tokens that are no longer valid, instead of trusting any correctly signed token forever.

That is better than stateless refresh tokens only, but it also means:

- Redis becomes another required dependency
- token logic is now more complex

## 5. How products work

Product behavior lives in:

- model: `backend/models/Product.model.js`
- controller: `backend/controllers/product.controller.js`
- routes: `backend/routes/product.route.js`
- product store: `frontend/src/stores/useProductStore.js`

### Product model

Each product stores:

- `name`
- `description`
- `price`
- `image`
- `category`
- `isFeatured`

### Public product features

Users can:

- view featured products on the home page
- browse products by category
- see recommended products

### Admin product features

Admins can:

- fetch all products
- create a product
- delete a product
- toggle `isFeatured`

### Cloudinary image upload

When an admin creates a product, the backend uploads the image to Cloudinary and stores the returned URL in MongoDB.

This is a practical pattern because:

- MongoDB does not have to store image binaries
- Cloudinary handles image hosting

The tradeoff is that product creation now depends on Cloudinary being configured correctly.

### Redis product caching

Featured products are cached in Redis under `featured_products`.

This is a performance optimization:

- repeated home page requests can avoid MongoDB reads
- the cache is refreshed when featured status changes

This is a good idea in principle, but in a small app it is also extra operational complexity.

## 6. How browsing works in the frontend

### Home page

`frontend/src/pages/HomePage.jsx`:

- renders a grid of hard-coded categories
- fetches featured products on mount
- passes them to `FeaturedProducts`

This is simple and easy to follow.

Tradeoff:

- the categories are hard-coded in the frontend, not driven by the database
- if categories change, code must be updated manually

### Category page

`frontend/src/pages/CategoryPage.jsx`:

1. reads `category` from the URL
2. calls `fetchProductsByCategory(category)`
3. renders a list of `ProductCard` components

Each `ProductCard` shows the image, name, price, and an Add to cart button.

## 7. How the cart works

The cart is handled by:

- frontend store: `frontend/src/stores/useCartStore.js`
- frontend page: `frontend/src/pages/CartPage.jsx`
- backend controller: `backend/controllers/cart.controller.js`
- backend routes: `backend/routes/cart.route.js`
- user model: `backend/models/User.model.js`

### Cart design

This app stores the cart inside the user document in MongoDB.

That means the cart is server-side, not only local browser state.

That is useful because:

- the cart can survive refreshes
- the cart can survive logging out and back in
- multiple devices could share the same cart if implemented consistently

### Cart flow

When a logged-in user opens the app:

1. `App.jsx` checks auth
2. if a user exists, it calls `getCartItems()`
3. the frontend requests `GET /api/cart`
4. the backend reads `req.user.cartItems`
5. the backend fetches matching products
6. the frontend store saves the result in Zustand

When a user clicks Add to cart:

1. `ProductCard` calls `addToCart(product)`
2. the frontend sends `POST /api/cart`
3. the backend updates `req.user.cartItems`
4. the frontend also updates local cart state immediately

This is a mixed pattern:

- the backend is the source of truth
- the frontend also does optimistic-style local updates

That is fine for a small app, but it increases the chance of state mismatches if a backend write succeeds differently than the frontend expects.

### Important honesty about the cart code

There is a real design mismatch here.

The `User` schema defines `cartItems` like this:

- each item should be an object with:
  - `product`
  - `quantity`

But the cart controller often treats `cartItems` more like raw product IDs plus custom fields.

Examples:

- `Product.find({ _id: { $in: req.user.cartItems } })`
- checks like `item.id === productId`
- pushing `productId` directly into `user.cartItems`

This means the schema and controller logic are not fully aligned.

Even if the current app appears to work, this is a fragile area and a likely source of future bugs.

A cleaner version would make `cartItems` consistently use:

```js
{
  product: ObjectId,
  quantity: Number
}
```

and all controller code would read and write `item.product`, not `item.id`.

## 8. How coupons work

Coupon logic lives in:

- model: `backend/models/Coupon.model.js`
- controller: `backend/controllers/coupon.controller.js`
- routes: `backend/routes/coupon.route.js`
- frontend usage: `useCartStore.js` and `GiftCouponCard.jsx`

### Coupon behavior

The app supports one active coupon per user.

A coupon has:

- `code`
- `discountPercentage`
- `expirationDate`
- `isActive`
- `userId`

When a user applies a coupon:

1. the frontend sends the coupon code to `POST /api/coupons/validate`
2. the backend checks:
   - the code exists
   - it belongs to the current user
   - it is active
   - it is not expired
3. the frontend stores the validated coupon in Zustand
4. the frontend recalculates totals locally

This is simple and readable.

Tradeoff:

- totals are recalculated in the browser for display
- the payment route also recomputes totals on the backend

That is the right general idea, because money calculations should always be validated on the server.

## 9. How checkout and payment work

Payment logic lives in:

- frontend: `frontend/src/components/OrderSummary.jsx`
- frontend success page: `frontend/src/pages/PurchaseSuccessPage.jsx`
- backend controller: `backend/controllers/payment.controller.js`
- backend routes: `backend/routes/payment.route.js`

### Checkout start

When the user clicks "Proceed to Checkout":

1. the frontend gathers:
   - `cart`
   - applied `coupon`
2. it sends them to `POST /api/payments/create-checkout-session`
3. the backend builds Stripe line items
4. the backend optionally applies a Stripe coupon
5. the backend creates a Stripe Checkout session
6. the backend returns `session.url`
7. the frontend redirects the browser to Stripe using `window.location.assign(session.url)`

This is simpler than using Stripe Elements directly inside the app. It is a good beginner-friendly architecture because Stripe hosts the payment UI.

### Successful payment

After payment, Stripe redirects the user back to:

- `/purchase-success?session_id=...`

Then:

1. `PurchaseSuccessPage.jsx` reads `session_id` from the URL
2. it calls `POST /api/payments/checkout-success`
3. the backend retrieves the Stripe session
4. if payment is marked as paid:
   - the coupon is deactivated
   - an `Order` document is created
   - the user cart is cleared in MongoDB
5. the frontend clears its local cart state too

This is one of the most important end-to-end flows in the app.

### Order model

Orders store:

- the user
- products purchased
- quantities
- prices at time of purchase
- total amount
- Stripe session ID

This is the correct general idea. Storing the purchase price inside the order is important because product prices can change later.

## 10. How admin analytics work

Analytics logic lives in:

- `backend/controllers/analytics.controller.js`
- `backend/routes/analytics.route.js`
- `frontend/src/components/AnalyticsTab.jsx`

The backend calculates:

- total user count
- total product count
- total number of sales
- total revenue
- daily sales/revenue data for a recent date range

The frontend renders that data with Recharts.

This is a practical dashboard design for a beginner project because it introduces aggregation without becoming too complex.

Tradeoffs:

- analytics are computed on request instead of precomputed
- this is fine for small data volumes
- it may become slow with many orders

## 11. How data moves through the system

Here is the most important mental model for this app:

### Example: "add product to cart"

1. User clicks button in `ProductCard`
2. `useCartStore.addToCart()` sends Axios request
3. Express route receives request
4. `protectRoute` authenticates the user
5. cart controller updates the user document
6. MongoDB stores the new cart
7. frontend store updates local state
8. cart badge in navbar updates automatically because it reads the same store

### Example: "load cart after refresh"

1. Browser refreshes
2. React app starts again
3. `App.jsx` calls `checkAuth()`
4. backend reads auth cookie and returns the user profile
5. `App.jsx` then calls `getCartItems()`
6. backend reads cart from MongoDB
7. frontend store repopulates cart state

### Example: "complete a purchase"

1. User starts checkout from cart page
2. backend creates Stripe session
3. Stripe handles payment UI
4. Stripe redirects back to app
5. frontend calls checkout-success endpoint
6. backend verifies session and writes an order
7. backend clears stored cart
8. frontend clears local cart

## 12. The good parts of this codebase

Several choices in this project are good and worth keeping:

- Clear separation between frontend and backend
- Sensible use of Zustand for a medium-small app
- HTTP-only cookies for tokens, which is safer than storing JWTs in localStorage
- Backend role checks for admin routes
- Stripe Checkout instead of trying to build card handling manually
- Cloudinary for hosted product images
- Redis caching for featured products
- MongoDB aggregation for analytics

This codebase is a solid learning project because it touches many real production concepts without becoming too enterprise-heavy.

## 13. The rough edges and real problems

This section matters. The app works in many places, but there are also real code issues.

### 1. User model import casing is inconsistent

Some files import:

- `../models/user.model.js`

and others import:

- `../models/User.model.js`

On Windows this can lead to:

- `OverwriteModelError: Cannot overwrite 'User' model once compiled`

All imports should use one exact filename and one exact casing consistently.

### 2. The refresh-token flow is incomplete/broken

In `frontend/src/stores/useUserStore.js`, the Axios interceptor calls:

- `useUserStore.getState().refreshToken()`

But the store does not define a `refreshToken` method.

Also, in `backend/controllers/auth.controller.js`, the `refreshToken` controller sets a cookie using `accessToken`, but `accessToken` is not created inside that function.

So automatic token refresh is not actually implemented correctly right now.

This is a real bug, not just a style issue.

### 3. Signup response shape is inconsistent with login

`signup` returns:

```js
{
  user: { ... },
  message: "User successfully created"
}
```

but `login` returns:

```js
{
  _id,
  name,
  email,
  role
}
```

On the frontend, `useUserStore.signup()` does:

- `set({ user: res.data, loading: false })`

That means after signup, `user` may have a different shape than after login.

This can cause subtle bugs in components that expect `user.role` or `user.name` directly.

### 4. Product creation store has a missing `await`

In `frontend/src/stores/useProductStore.js`, `createProduct` does:

```js
const res = axiosInstance.post("/products", productData);
```

without `await`.

That means `res.data` will not be what the code expects.

This is a real bug.

### 5. Loading state naming is inconsistent

For example, `HomePage.jsx` reads `isLoading`, but the product store uses `loading`.

That means loading behavior may not work as intended.

### 6. Cart schema and cart controller do not fully agree

As explained earlier, `cartItems` is modeled one way in the schema and manipulated another way in controllers.

Even when it works, it is brittle.

### 7. Product model naming is inconsistent with references

The product model is registered as:

- `"products"`

but other schemas reference:

- `"Product"`

This may not break every current flow because the code often avoids `populate()`, but it is inconsistent and likely to break future populate-based queries.

### 8. Some debugging `console.log` calls are still in production paths

There are multiple console logs in controllers and frontend stores/components.

That is normal during development, but it should be cleaned up later.

### 9. Admin route naming is intentionally hidden, not truly protected by obscurity

The route `/secret-dashboard` sounds hidden, but the real protection is still the backend role check. The name itself does not add meaningful security.

That is fine, but important to understand clearly.

## 14. Why the project is still useful despite the rough edges

A beginner project does not need to be perfect to be valuable.

This codebase is useful because it teaches:

- API routing
- auth with cookies
- MongoDB models
- frontend state management
- payment integration
- image hosting
- analytics queries

The main lesson is not that every line is perfect. The main lesson is how the pieces connect.

That is exactly what real software engineering usually feels like: a mix of working parts, shortcuts, technical debt, and incremental improvements.

## 15. How I would improve this project next

If you want to make this codebase stronger, these are the highest-value next steps.

### First priority: correctness

1. Fix all `User.model.js` import casing so the model is loaded consistently.
2. Repair the refresh-token flow on both frontend and backend.
3. Make signup and login return the same response shape.
4. Fix `await` bugs in frontend stores.
5. Make the cart schema and cart controller agree on one structure.

### Second priority: maintainability

1. Add request validation for backend inputs.
2. Centralize error handling in Express middleware.
3. Remove stray logs.
4. Standardize naming across files and models.
5. Move hard-coded categories into the database or config.

### Third priority: production readiness

1. Add tests for auth, cart, and checkout flows.
2. Add idempotency protection around checkout-success handling.
3. Add better analytics date filtering and timezone handling.
4. Add stronger monitoring and structured logging.
5. Add inventory tracking if products need stock limits.

## 16. The shortest accurate summary

This project is a full-stack e-commerce app where:

- React renders the UI
- Zustand stores frontend state
- Axios talks to the Express API
- JWT cookies identify the user
- MongoDB stores users, products, orders, and coupons
- Redis stores refresh tokens and caches featured products
- Stripe handles payment checkout
- Cloudinary stores product images

The app is conceptually solid and educational, but it also contains several real implementation issues that should be cleaned up if you want it to be reliable.

If you want to understand this codebase deeply, the best files to read first are:

1. `frontend/src/App.jsx`
2. `frontend/src/stores/useUserStore.js`
3. `frontend/src/stores/useCartStore.js`
4. `backend/server.js`
5. `backend/middleware/auth.middleware.js`
6. `backend/controllers/auth.controller.js`
7. `backend/controllers/product.controller.js`
8. `backend/controllers/cart.controller.js`
9. `backend/controllers/payment.controller.js`

Those files explain most of the project’s real behavior.
