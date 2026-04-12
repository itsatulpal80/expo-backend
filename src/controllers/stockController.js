const Invoice = require("../models/Invoice");
const Medicine = require("../models/Medicine");
const { ApiError } = require("../utils/apiError");
const { normalizeInvoiceItems } = require("../utils/stockUtils");

async function getStock(req, res) {
  const q = (req.query.q || "").trim();
  const distributor = (req.query.distributor || "").trim();

  const query = {};
  if (q) query.name = { $regex: q, $options: "i" };
  if (distributor) query.distributor = { $regex: distributor, $options: "i" };

  const medicines = await Medicine.find(query).sort({ updatedAt: -1 });
  res.json(medicines);
}

async function getStockById(req, res) {
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) throw new ApiError(404, "Medicine not found");
  res.json(medicine);
}

async function addFromOcr(req, res) {
  const { supplierName, invoiceNumber, invoiceDate, items = [] } = req.body;
  if (!invoiceNumber) throw new ApiError(400, "invoiceNumber is required");

  const exists = await Invoice.findOne({ invoiceNumber });
  if (exists) throw new ApiError(409, "Invoice already processed");

  const normalizedItems = normalizeInvoiceItems(items);
  if (!normalizedItems.length) {
    throw new ApiError(400, "No valid medicine items found in OCR payload");
  }

  for (const item of normalizedItems) {
    const medicine = await Medicine.findOne({
      name: item.name,
      distributor: item.distributor,
    });

    if (!medicine) {
      await Medicine.create({
        name: item.name,
        distributor: item.distributor,
        totalQuantity: item.quantity,
        batches: [item],
      });
      continue;
    }

    const batch = medicine.batches.find((b) => b.batchNumber === item.batchNumber);
    if (batch) {
      batch.quantity += item.quantity;
      batch.purchaseRate = item.purchaseRate;
      batch.mrp = item.mrp;
      batch.expiryDate = item.expiryDate;
    } else {
      medicine.batches.push(item);
    }

    medicine.totalQuantity += item.quantity;
    await medicine.save();
  }

  const invoice = await Invoice.create({
    supplierName: supplierName || "Unknown Supplier",
    invoiceNumber,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    items: normalizedItems,
    createdBy: req.user.id,
  });

  res.status(201).json({
    message: "Stock updated from OCR",
    invoiceId: invoice._id,
    itemsProcessed: normalizedItems.length,
  });
}

module.exports = { getStock, getStockById, addFromOcr };
