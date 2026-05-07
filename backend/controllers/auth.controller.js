import User from "../models/user.model.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already Exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    res.status(201).json({ user, message: "User successfully created" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const login = async (req, res) => {};
export const logout = async (req, res) => {};
