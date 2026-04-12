const axios = require("axios");
const { Blob } = require("buffer");
const { cloudinary, configureCloudinary } = require("../config/cloudinary");
const { env } = require("../config/env");
const { parseInvoiceWithAi, parseInvoiceTextWithAi } = require("./aiService");
const { ApiError } = require("../utils/apiError");

const cloudinaryReady = configureCloudinary();

function toBase64FromUpload(file) {
  if (!file?.buffer) return null;
  return file.buffer.toString("base64");
}

function toBase64FromBody(base64Image) {
  if (!base64Image || typeof base64Image !== "string") return null;
  if (base64Image.startsWith("data:")) {
    const [, payload = ""] = base64Image.split(",");
    return payload;
  }
  return base64Image;
}

function detectMimeType(file, base64Image) {
  if (file?.mimetype) return file.mimetype;
  if (typeof base64Image === "string" && base64Image.startsWith("data:")) {
    const meta = base64Image.slice(5, base64Image.indexOf(";"));
    return meta || "image/jpeg";
  }
  return "image/jpeg";
}

async function uploadToCloudinaryIfEnabled(file) {
  if (!cloudinaryReady || !file?.buffer) return null;
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "pharmacy-invoices",
    resource_type: "image",
  });
  return result.secure_url;
}

function toBufferFromBase64(base64Image) {
  const normalizedBase64 = toBase64FromBody(base64Image);
  if (!normalizedBase64) return null;
  return Buffer.from(normalizedBase64, "base64");
}

function normalizeOcrText(payload) {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => {
        if (typeof entry === "string") return entry;
        return entry?.text || entry?.ocr_text || entry?.line || "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (payload && typeof payload === "object") {
    return payload.text || payload.ocr_text || "";
  }
  return "";
}

function normalizeDate(value) {
  if (!value) return null;
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return trimmed;

  const [, dd, mm, yy] = match;
  const yyyy = yy.length === 2 ? `20${yy}` : yy;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function normalizeExpiry(value) {
  if (!value) return "";
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2})[/-](\d{2,4})$/);
  if (!match) return trimmed;

  const [, mm, yy] = match;
  const yyyy = yy.length === 2 ? `20${yy}` : yy;
  return `${yyyy}-${mm.padStart(2, "0")}`;
}

function parseNumber(value) {
  if (value == null) return 0;
  const normalized = String(value).replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanToken(token) {
  return String(token || "").replace(/[|,]/g, "").trim();
}

function isExpiryToken(token) {
  return /^(?:\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2})$/.test(cleanToken(token));
}

function isBatchToken(token) {
  const value = cleanToken(token);
  if (!value || isExpiryToken(value) || /^\d+(?:\.\d+)?$/.test(value)) return false;
  return /[A-Z]/i.test(value) && /[0-9]/.test(value);
}

function isPackToken(token) {
  const value = cleanToken(token).toUpperCase();
  return /^(?:\d+[A-Z]+|[A-Z0-9*+/.-]+(?:ML|MG|GM|PCS|PC|CAP|TAB|X\d+|P))$/.test(
    value,
  );
}

function extractSupplierName(lines) {
  const headerIndex = lines.findIndex((line) =>
    /hsn code|product name|batch|qty|amount/i.test(line),
  );
  const candidates = headerIndex > 0 ? lines.slice(0, headerIndex) : lines.slice(0, 5);

  return (
    candidates.find(
      (line) =>
        line.length > 3 &&
        !/^(s\.?|sr\.?|gst|tax|invoice|bill)$/i.test(line) &&
        !/^\d/.test(line),
    ) || "Unknown Supplier"
  );
}

function extractRowCandidates(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const matches = [
    ...normalized.matchAll(
      /(?:^|\s)(\d{1,2}\.?\s+\d{6,10}\s+.*?)(?=\s+\d{1,2}\.?\s+\d{6,10}\s+|$)/g,
    ),
  ];

  if (matches.length) {
    return matches.map((match) => match[1].trim());
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseTableRow(line) {
  const normalizedLine = line.replace(/\s+/g, " ").trim();
  const rowMatch = normalizedLine.match(/^(\d{1,2})\.?\s+(\d{6,10})\s+(.+)$/);
  if (!rowMatch) return null;

  const [, serial, hsnCode, rest] = rowMatch;
  const tokens = rest.split(" ").filter(Boolean);
  if (tokens.length < 7) return null;

  const amount = parseNumber(tokens.pop());
  const gst = parseNumber(tokens.pop());
  const discount = parseNumber(tokens.pop());
  const purchaseRate = parseNumber(tokens.pop());
  const mrp = parseNumber(tokens.pop());
  const free = cleanToken(tokens.pop());
  const quantity = parseNumber(tokens.pop());

  let expiryDate = "";
  if (tokens.length && isExpiryToken(tokens[tokens.length - 1])) {
    expiryDate = normalizeExpiry(tokens.pop());
  }

  let batchNumber = "";
  if (tokens.length && isBatchToken(tokens[tokens.length - 1])) {
    batchNumber = cleanToken(tokens.pop());
  }

  let pack = "";
  if (tokens.length && isPackToken(tokens[tokens.length - 1])) {
    pack = cleanToken(tokens.pop());
  }

  const medicineName = tokens.join(" ").replace(/\s+/g, " ").trim();
  if (!medicineName || !quantity) return null;

  const finalName = `${medicineName}${pack ? ` ${pack}` : ""}`.trim();

  return {
    serialNumber: Number.parseInt(serial, 10),
    hsnCode,
    medicineName: finalName,
    name: finalName,
    distributor: "",
    quantity,
    freeQuantity: free === "-" ? 0 : parseNumber(free),
    purchaseRate,
    mrp,
    batchNumber,
    expiryDate,
    discount,
    gst,
    amount,
    confidence: batchNumber || expiryDate ? 88 : 78,
  };
}

function parseInvoiceFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const invoiceNumberMatch = text.match(
    /\b(?:invoice|inv|bill)[\s#:.-]*([A-Z0-9/-]{3,})/i,
  );
  const invoiceDateMatch = text.match(
    /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2})\b/,
  );

  const items = extractRowCandidates(text).map(parseTableRow).filter(Boolean);

  return {
    supplierName: extractSupplierName(lines),
    invoiceNumber: invoiceNumberMatch?.[1] || "",
    invoiceDate: normalizeDate(invoiceDateMatch?.[1] || ""),
    items,
    rawText: text,
  };
}

async function extractTextWithApiNinjas({ file, base64Image }) {
  if (!env.apiNinjasApiKey) {
    throw new ApiError(500, "API_NINJAS_API_KEY is missing");
  }

  const imageBuffer = file?.buffer || toBufferFromBase64(base64Image);
  if (!imageBuffer) {
    throw new ApiError(400, "Image is required (multipart file or base64Image)");
  }

  const mimeType = detectMimeType(file, base64Image);
  const form = new FormData();
  form.append("image", new Blob([imageBuffer], { type: mimeType }), "invoice.jpg");

  const response = await axios.post(env.apiNinjasImageToTextUrl, form, {
    headers: {
      "X-Api-Key": env.apiNinjasApiKey,
    },
    timeout: 45000,
    maxBodyLength: Infinity,
  });

  const text = normalizeOcrText(response.data);
  if (!text) {
    throw new ApiError(422, "OCR did not return any text");
  }

  return text;
}

async function scanInvoiceImage({ file, base64Image }) {
  const normalizedBase64 = toBase64FromUpload(file) || toBase64FromBody(base64Image);
  if (!normalizedBase64) {
    throw new ApiError(400, "Image is required (multipart file or base64Image)");
  }

  const cloudinaryUrl = await uploadToCloudinaryIfEnabled(file);
  let parsed;
  let ocrText = "";

  try {
    parsed = await parseInvoiceWithAi({
      base64Image: normalizedBase64,
      mimeType: detectMimeType(file, base64Image),
    });
  } catch (visionError) {
    console.warn(`[OCR] Vision extraction fallback -> ${visionError.message}`);
    ocrText = await extractTextWithApiNinjas({ file, base64Image });

    try {
      parsed = await parseInvoiceTextWithAi(ocrText);
    } catch (textError) {
      console.warn(`[OCR] Text AI fallback -> ${textError.message}`);
      parsed = parseInvoiceFromText(ocrText);
    }
  }

  parsed.rawText = ocrText;

  return { parsed, cloudinaryUrl };
}

module.exports = { scanInvoiceImage };
