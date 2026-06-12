const { scanInvoiceImage } = require("../services/ocrService");

async function scanOcr(req, res) {
  const { base64Image, supplierName, invoiceNumber, invoiceDate } = req.body;
  const { parsed, cloudinaryUrl } = await scanInvoiceImage({
    file: req.file,
    base64Image,
  });

  res.json({
    message: "OCR scan completed",
    cloudinaryUrl,
    data: {
      supplierName: supplierName || parsed.supplierName || "Unknown Supplier",
      invoiceNumber: invoiceNumber || parsed.invoiceNumber || "",
      invoiceDate: invoiceDate || parsed.invoiceDate || null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    },
  });
}

module.exports = { scanOcr };
