const Invoice = require("../models/Invoice");
const Medicine = require("../models/Medicine");
const { ensureDbReady } = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { normalizeInvoiceItems } = require("../utils/stockUtils");

async function getStock(req, res) {
  await ensureDbReady();
  const q = (req.query.q || "").trim();
  const distributor = (req.query.distributor || "").trim();

  const query = {};
  if (q) query.name = { $regex: q, $options: "i" };
  if (distributor) query.distributor = { $regex: distributor, $options: "i" };

  const medicines = await Medicine.find(query).sort({ updatedAt: -1 });
  res.json(medicines);
}

async function getStockById(req, res) {
  await ensureDbReady();
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) throw new ApiError(404, "Medicine not found");
  res.json(medicine);
}

async function addFromOcr(req, res) {
  await ensureDbReady();
  const { supplierName, invoiceNumber, invoiceDate, items = [] } = req.body;
  if (!invoiceNumber) throw new ApiError(400, "invoiceNumber is required");

  const exists = await Invoice.findOne({ invoiceNumber });
  if (exists) throw new ApiError(409, "Invoice already processed");

  const normalizedItems = normalizeInvoiceItems(items, supplierName);
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

  const parsedDate = invoiceDate ? new Date(invoiceDate) : null;
  const safeDate =
    parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

  const invoice = await Invoice.create({
    supplierName: supplierName || "Unknown Supplier",
    invoiceNumber,
    invoiceDate: safeDate,
    items: normalizedItems,
    createdBy: req.user.id,
  });

  res.status(201).json({
    message: "Stock updated from OCR",
    invoiceId: invoice._id,
    itemsProcessed: normalizedItems.length,
  });
}

async function updateDistributorName(req, res) {
  await ensureDbReady();
  const { oldName, newName } = req.body;
  if (!oldName || !newName) throw new ApiError(400, "oldName and newName are required");

  const result = await Medicine.updateMany(
    { distributor: oldName },
    { $set: { distributor: newName } }
  );

  res.json({ message: "Distributor name updated successfully", modifiedCount: result.modifiedCount });
}

async function disposeBatch(req, res) {
  await ensureDbReady();
  const { id, batchNumber } = req.params;

  const medicine = await Medicine.findById(id);
  if (!medicine) throw new ApiError(404, "Medicine not found");

  const batchIndex = medicine.batches.findIndex(b => b.batchNumber === batchNumber);
  if (batchIndex === -1) throw new ApiError(404, "Batch not found");

  const batch = medicine.batches[batchIndex];
  medicine.totalQuantity -= batch.quantity;
  if (medicine.totalQuantity < 0) medicine.totalQuantity = 0;

  medicine.batches.splice(batchIndex, 1);

  if (medicine.batches.length === 0) {
    await Medicine.findByIdAndDelete(id);
    return res.json({ message: "Batch disposed and medicine removed from inventory" });
  } else {
    await medicine.save();
    return res.json({ message: "Batch disposed successfully", medicine });
  }
}

module.exports = { getStock, getStockById, addFromOcr, updateDistributorName, disposeBatch };
