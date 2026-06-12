const express = require("express");
const {
  getStock,
  getStockById,
  addFromOcr,
  updateDistributorName,
  disposeBatch,
  deleteMedicine,
} = require("../controllers/stockController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateBody, addFromOcrSchema } = require("../utils/validation");

const router = express.Router();

router.get("/", authMiddleware, asyncHandler(getStock));
router.get("/:id", authMiddleware, asyncHandler(getStockById));
router.delete("/:id", authMiddleware, asyncHandler(deleteMedicine));
router.put("/distributor", authMiddleware, asyncHandler(updateDistributorName));
router.delete("/:id/batch/:batchNumber", authMiddleware, asyncHandler(disposeBatch));
router.post(
  "/add-from-ocr",
  authMiddleware,
  validateBody(addFromOcrSchema),
  asyncHandler(addFromOcr),
);

module.exports = router;
