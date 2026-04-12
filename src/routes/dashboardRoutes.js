const express = require("express");
const { getDashboard } = require("../controllers/dashboardController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", authMiddleware, asyncHandler(getDashboard));

module.exports = router;
