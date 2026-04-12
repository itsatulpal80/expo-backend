const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { env } = require("../config/env");
const { assertDbReady } = require("../config/db");
const { ApiError } = require("../utils/apiError");

function signToken(user) {
  if (!env.jwtSecret) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }
  return jwt.sign(
    { id: user._id.toString(), mobile: user.mobile, role: user.role },
    env.jwtSecret,
    { expiresIn: "7d" },
  );
}

async function register(req, res) {
  assertDbReady();
  const { name = "User", mobile, password, role = "pharmacist" } = req.body;
  const exists = await User.findOne({ mobile });
  if (exists) throw new ApiError(409, "Mobile already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    mobile,
    role,
    password: hashedPassword,
  });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, mobile: user.mobile, role: user.role },
  });
}

async function login(req, res) {
  assertDbReady();
  const { mobile, password } = req.body;
  const user = await User.findOne({ mobile });
  if (!user) throw new ApiError(401, "Invalid mobile or password");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new ApiError(401, "Invalid mobile or password");

  const token = signToken(user);
  res.json({
    token,
    user: { id: user._id, name: user.name, mobile: user.mobile, role: user.role },
  });
}

module.exports = { register, login };
