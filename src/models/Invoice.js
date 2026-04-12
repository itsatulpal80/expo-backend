const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Unknown Medicine", trim: true },
    distributor: { type: String, default: "Unknown", trim: true },
    batchNumber: { type: String, default: "N/A", trim: true },
    expiryDate: { type: Date, default: null },
    quantity: { type: Number, required: true, min: 0 },
    purchaseRate: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new mongoose.Schema(
  {
    supplierName: { type: String, default: "Unknown Supplier", trim: true },
    invoiceNumber: { type: String, required: true, trim: true, index: true },
    invoiceDate: { type: Date, required: true },
    items: [invoiceItemSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Invoice", invoiceSchema);
