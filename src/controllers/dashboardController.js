const Invoice = require("../models/Invoice");
const Medicine = require("../models/Medicine");
const { getExpiryCounts } = require("../utils/stockUtils");

async function getDashboard(req, res) {
  const invoices = await Invoice.find().select("items createdAt");
  const medicines = await Medicine.find().select("totalQuantity batches");

  const totalSales = 0;
  const lowStockCount = medicines.filter((m) => m.totalQuantity <= 10).length;
  const expiryCount = getExpiryCounts(medicines, 30);

  res.json({
    totalSales,
    lowStockCount,
    expiryCount,
    totalInvoices: invoices.length,
  });
}

module.exports = { getDashboard };
