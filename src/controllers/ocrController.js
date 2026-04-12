const { scanInvoiceImage } = require("../services/ocrService");

async function scanOcr(req, res) {
  const { base64Image } = req.body;
  const { parsed, cloudinaryUrl } = await scanInvoiceImage({
    file: req.file,
    base64Image,
  });

  res.json({
    message: "OCR scan completed",
    cloudinaryUrl,
    data: {
      supplierName: parsed.supplierName || "Unknown Supplier",
      invoiceNumber: parsed.invoiceNumber || "",
      invoiceDate: parsed.invoiceDate || null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    },
  });
}

module.exports = { scanOcr };
