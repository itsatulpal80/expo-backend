const express = require("express");
const { scanOcr } = require("../controllers/ocrController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { upload } = require("../middlewares/uploadMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/scan", authMiddleware, upload.single("image"), asyncHandler(scanOcr));

module.exports = router;
