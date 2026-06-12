const express = require("express");
const { register, login, getProfile, updateProfile } = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  validateBody,
  registerSchema,
  loginSchema,
} = require("../utils/validation");

const router = express.Router();

router.post("/register", validateBody(registerSchema), asyncHandler(register));
router.post("/login", validateBody(loginSchema), asyncHandler(login));

router.get("/profile", authMiddleware, asyncHandler(getProfile));
router.put("/profile", authMiddleware, asyncHandler(updateProfile));

module.exports = router;
