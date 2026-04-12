const express = require("express");
const {
  getStock,
  getStockById,
  addFromOcr,
} = require("../controllers/stockController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateBody, addFromOcrSchema } = require("../utils/validation");

const router = express.Router();

router.get("/", authMiddleware, asyncHandler(getStock));
router.get("/:id", authMiddleware, asyncHandler(getStockById));
router.post(
  "/add-from-ocr",
  authMiddleware,
  validateBody(addFromOcrSchema),
  asyncHandler(addFromOcr),
);

module.exports = router;
