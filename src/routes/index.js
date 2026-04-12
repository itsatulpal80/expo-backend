const express = require("express");
const authRoutes = require("./authRoutes");
const ocrRoutes = require("./ocrRoutes");
const stockRoutes = require("./stockRoutes");
const dashboardRoutes = require("./dashboardRoutes");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Pharmacy backend is running",
    docs: {
      health: "/health",
      auth: {
        register: "POST /auth/register",
        login: "POST /auth/login",
      },
      ocr: {
        scan: "POST /ocr/scan",
      },
      stock: {
        list: "GET /stock",
        byId: "GET /stock/:id",
        addFromOcr: "POST /stock/add-from-ocr",
      },
      dashboard: {
        summary: "GET /dashboard",
      },
    },
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
router.use("/auth", authRoutes);
router.use("/ocr", ocrRoutes);
router.use("/stock", stockRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
