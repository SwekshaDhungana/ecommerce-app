import { redis } from "../lib/redis.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/async.middleware.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ userId }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60,
  );
};

const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge,
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie(
    "refreshToken",
    refreshToken,
    getCookieOptions(7 * 24 * 60 * 60 * 1000),
  );
};

const setAccessTokenCookie = (res, accessToken) => {
  res.cookie("accessToken", accessToken, getCookieOptions(15 * 60 * 1000));
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validatedBody;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const { accessToken, refreshToken } = generateTokens(user._id);

  await storeRefreshToken(user._id, refreshToken);
  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    message: "User successfully created",
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validatedBody;

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  await storeRefreshToken(user._id, refreshToken);
  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    message: "Login successful",
  });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshTokenFromCookie = req.cookies.refreshToken;

  if (refreshTokenFromCookie) {
    try {
      const decoded = jwt.verify(
        refreshTokenFromCookie,
        env.REFRESH_TOKEN_SECRET,
      );

      await redis.del(`refresh_token:${decoded.userId}`);
    } catch (error) {
      console.log(
        "Refresh token verification failed during logout",
        error.message,
      );
    }
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.status(200).json({ message: "Logged out successfully" });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenFromCookie = req.cookies.refreshToken;

  if (!refreshTokenFromCookie) {
    res.status(401);
    throw new Error("No refresh token provided");
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshTokenFromCookie, env.REFRESH_TOKEN_SECRET);
  } catch {
    res.status(401);
    throw new Error("Invalid or expired refresh token");
  }

  const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

  if (!storedToken || storedToken !== refreshTokenFromCookie) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  const newAccessToken = generateAccessToken(decoded.userId);
  setAccessTokenCookie(res, newAccessToken);

  res.status(200).json({ message: "Token refreshed successfully" });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json(req.user);
});
