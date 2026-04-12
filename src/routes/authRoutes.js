const express = require("express");
const { register, login } = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateBody,
  registerSchema,
  loginSchema,
} = require("../utils/validation");

const router = express.Router();

router.post("/register", validateBody(registerSchema), asyncHandler(register));
router.post("/login", validateBody(loginSchema), asyncHandler(login));

module.exports = router;
