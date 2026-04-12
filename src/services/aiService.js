const axios = require("axios");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiError");
const { extractJsonFromText } = require("../utils/extractJson");

const OCR_SYSTEM_PROMPT = `You are an OCR specialist for Indian pharmacy purchase bills/invoices.
Extract structured data from medicine purchase bills/invoices.

IMPORTANT: Analyze the image or OCR text carefully and extract ALL visible medicine entries.

Return a JSON object with this exact structure:
{
  "supplierName": "Distributor/Supplier name from the bill",
  "invoiceNumber": "Invoice/Bill number",
  "invoiceDate": "YYYY-MM-DD format",
  "items": [
    {
      "medicineName": "Full medicine name with strength (e.g., Paracetamol 500mg)",
      "quantity": number,
      "purchaseRate": number,
      "mrp": number,
      "batchNumber": "Batch/Lot number",
      "expiryDate": "YYYY-MM format",
      "confidence": number
    }
  ]
}

Guidelines:
- Extract medicine name with dosage/strength.
- If MRP is per strip/pack, convert to per unit if quantity is in units.
- For expiry dates, use YYYY-MM format.
- Batch numbers are usually alphanumeric codes.
- Set confidence lower (60-80) if text is unclear or partially visible.
- If GST/tax info is visible, still focus on the medicine details.
- Common Indian bill formats include columns like: Item, Batch, Expiry, Qty, Rate, MRP, Amount.
- Return ONLY valid JSON, no markdown or explanation.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeParsedInvoice(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new ApiError(422, "AI response parsing failed");
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map((item) => {
          const medicineName = item?.medicineName || item?.name || "";
          return {
            medicineName,
            name: medicineName,
            distributor: item?.distributor || "",
            quantity: Number(item?.quantity) || 0,
            purchaseRate: Number(item?.purchaseRate) || 0,
            mrp: Number(item?.mrp) || 0,
            batchNumber: item?.batchNumber || "",
            expiryDate: item?.expiryDate || "",
            confidence: Number(item?.confidence) || 0,
          };
        })
        .filter((item) => item.name)
    : [];

  return {
    supplierName: parsed.supplierName || "Unknown Supplier",
    invoiceNumber: parsed.invoiceNumber || "",
    invoiceDate: parsed.invoiceDate || null,
    items,
  };
}

async function callGroqVision(base64Image, mimeType) {
  if (!env.groqApiKey) {
    throw new ApiError(500, "GROQ_API_KEY is missing");
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: env.groqVisionModel || "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,
      messages: [
        { role: "system", content: OCR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract invoice JSON from this image. Capture all visible medicine rows." },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    },
    {
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    },
  );

  const raw = response?.data?.choices?.[0]?.message?.content || "";
  return extractJsonFromText(raw);
}

async function callGroqFromText(ocrText) {
  if (!env.groqApiKey) {
    throw new ApiError(500, "GROQ_API_KEY is missing");
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: env.aiModel || "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        { role: "system", content: OCR_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract invoice JSON from this OCR text:\n\n${ocrText}`,
        },
      ],
      response_format: { type: "json_object" },
    },
    {
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 45000,
    },
  );

  const raw = response?.data?.choices?.[0]?.message?.content || "";
  return extractJsonFromText(raw);
}

async function callOpenAI(base64Image, mimeType) {
  if (!env.openAiApiKey) {
    throw new ApiError(500, "OPENAI_API_KEY is missing");
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: env.aiModel || "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: OCR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract invoice JSON from this image." },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    },
    {
      headers: {
        Authorization: `Bearer ${env.openAiApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 45000,
    },
  );

  const raw = response?.data?.choices?.[0]?.message?.content || "";
  return extractJsonFromText(raw);
}

async function callOpenAIFromText(ocrText) {
  if (!env.openAiApiKey) {
    throw new ApiError(500, "OPENAI_API_KEY is missing");
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: env.aiModel || "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: OCR_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract invoice JSON from this OCR text:\n\n${ocrText}`,
        },
      ],
      response_format: { type: "json_object" },
    },
    {
      headers: {
        Authorization: `Bearer ${env.openAiApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 45000,
    },
  );

  const raw = response?.data?.choices?.[0]?.message?.content || "";
  return extractJsonFromText(raw);
}

async function callGemini(base64Image, mimeType) {
  if (!env.geminiApiKey) {
    throw new ApiError(500, "GEMINI_API_KEY is missing");
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: OCR_SYSTEM_PROMPT },
          { text: "Extract invoice JSON from this image." },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  };

  const preferredModel = env.aiModel || "gemini-1.5-flash";
  const endpointCandidates = [
    // v1beta supports broader preview model naming.
    { version: "v1beta", model: preferredModel },
    { version: "v1beta", model: "gemini-1.5-flash" },
    { version: "v1beta", model: "gemini-2.0-flash" },
    { version: "v1beta", model: "gemini-1.5-flash-latest" },
    // v1 is stricter; avoid -latest aliases that commonly 404.
    { version: "v1", model: preferredModel },
    { version: "v1", model: "gemini-1.5-flash" },
    { version: "v1", model: "gemini-2.0-flash" },
  ];
  const uniqueEndpoints = endpointCandidates.filter(
    (item, index, arr) =>
      arr.findIndex((x) => x.version === item.version && x.model === item.model) ===
      index,
  );
  let response = null;
  let lastError = null;
  const max429Retries = 3;

  for (const candidate of uniqueEndpoints) {
    const url = `https://generativelanguage.googleapis.com/${candidate.version}/models/${candidate.model}:generateContent?key=${env.geminiApiKey}`;
    for (let attempt = 0; attempt <= max429Retries; attempt += 1) {
      try {
        response = await axios.post(url, requestBody, { timeout: 45000 });
        lastError = null;
        break;
      } catch (error) {
        const status = error?.response?.status;
        lastError = error;

        // Retry rate-limit errors with exponential backoff.
        if (status === 429 && attempt < max429Retries) {
          const waitMs = 1000 * (2 ** attempt);
          await sleep(waitMs);
          continue;
        }

        // Try next model/version when endpoint or model is unavailable.
        if (status === 404) {
          break;
        }

        // For a 429 after retries, try fallback model/version.
        if (status === 429) {
          break;
        }

        throw error;
      }
    }
    if (response) break;
  }

  if (!response) {
    const lastStatus = lastError?.response?.status;
    if (lastStatus === 429) {
      throw new ApiError(
        429,
        "Gemini rate limit/quota exceeded. Wait a minute and retry, or switch API key/project with available quota.",
      );
    }
    throw new ApiError(
      502,
      `Gemini request failed after trying fallback models. Last error: ${
        lastError?.response?.data?.error?.message || lastError?.message || "Unknown error"
      }`,
    );
  }

  const raw =
    response?.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") ||
    "";
  return extractJsonFromText(raw);
}

async function callGeminiFromText(ocrText) {
  if (!env.geminiApiKey) {
    throw new ApiError(500, "GEMINI_API_KEY is missing");
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: OCR_SYSTEM_PROMPT },
          { text: `Extract invoice JSON from this OCR text:\n\n${ocrText}` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  };

  const preferredModel = env.aiModel || "gemini-1.5-flash";
  const endpointCandidates = [
    { version: "v1beta", model: preferredModel },
    { version: "v1beta", model: "gemini-1.5-flash" },
    { version: "v1beta", model: "gemini-2.0-flash" },
    { version: "v1beta", model: "gemini-1.5-flash-latest" },
    { version: "v1", model: preferredModel },
    { version: "v1", model: "gemini-1.5-flash" },
    { version: "v1", model: "gemini-2.0-flash" },
  ];
  const uniqueEndpoints = endpointCandidates.filter(
    (item, index, arr) =>
      arr.findIndex((x) => x.version === item.version && x.model === item.model) ===
      index,
  );
  let response = null;
  let lastError = null;
  const max429Retries = 3;

  for (const candidate of uniqueEndpoints) {
    const url = `https://generativelanguage.googleapis.com/${candidate.version}/models/${candidate.model}:generateContent?key=${env.geminiApiKey}`;
    for (let attempt = 0; attempt <= max429Retries; attempt += 1) {
      try {
        response = await axios.post(url, requestBody, { timeout: 45000 });
        lastError = null;
        break;
      } catch (error) {
        const status = error?.response?.status;
        lastError = error;

        if (status === 429 && attempt < max429Retries) {
          const waitMs = 1000 * (2 ** attempt);
          await sleep(waitMs);
          continue;
        }
        if (status === 404 || status === 429) {
          break;
        }
        throw error;
      }
    }
    if (response) break;
  }

  if (!response) {
    const lastStatus = lastError?.response?.status;
    if (lastStatus === 429) {
      throw new ApiError(
        429,
        "Gemini rate limit/quota exceeded. Wait a minute and retry, or switch API key/project with available quota.",
      );
    }
    throw new ApiError(
      502,
      `Gemini request failed after trying fallback models. Last error: ${
        lastError?.response?.data?.error?.message || lastError?.message || "Unknown error"
      }`,
    );
  }

  const raw =
    response?.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") ||
    "";
  return extractJsonFromText(raw);
}

async function parseInvoiceWithAi({ base64Image, mimeType = "image/jpeg" }) {
  const provider = (env.aiProvider || "openai").toLowerCase();
  const getProviderErrorMessage = (error, fallbackMessage) =>
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage;
  const callMap = {
    groq: callGroqVision,
    openai: callOpenAI,
    gemini: callGemini,
  };
  const fallbackOrderByProvider = {
    groq: ["groq", "openai", "gemini"],
    openai: ["openai", "gemini"],
    gemini: ["gemini", "openai"],
  };
  const providerOrder =
    fallbackOrderByProvider[provider] || fallbackOrderByProvider.openai;
  const availableProviders = providerOrder.filter((name) => {
    if (name === "groq") return Boolean(env.groqApiKey);
    if (name === "openai") return Boolean(env.openAiApiKey);
    return Boolean(env.geminiApiKey);
  });

  if (!availableProviders.length) {
    throw new ApiError(
      500,
      "No AI provider key configured (GROQ_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY)",
    );
  }

  const errors = [];
  let parsed = null;

  for (const candidate of availableProviders) {
    try {
      console.log(`[OCR] Trying provider: ${candidate}`);
      parsed = await callMap[candidate](base64Image, mimeType);
      console.log(`[OCR] Provider success: ${candidate}`);
      break;
    } catch (error) {
      const message = getProviderErrorMessage(
        error,
        `${candidate} request failed`,
      );
      console.warn(`[OCR] Provider failed: ${candidate} -> ${message}`);
      errors.push(`${candidate.toUpperCase()} failed: ${message}`);
    }
  }

  if (!parsed) {
    throw new ApiError(502, errors.join(". "));
  }

  return normalizeParsedInvoice(parsed);
}

async function parseInvoiceTextWithAi(ocrText) {
  const provider = (env.aiProvider || "openai").toLowerCase();
  const getProviderErrorMessage = (error, fallbackMessage) =>
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage;
  const callMap = {
    groq: callGroqFromText,
    openai: callOpenAIFromText,
    gemini: callGeminiFromText,
  };
  const fallbackOrderByProvider = {
    groq: ["groq", "openai", "gemini"],
    openai: ["openai", "gemini"],
    gemini: ["gemini", "openai"],
  };
  const providerOrder =
    fallbackOrderByProvider[provider] || fallbackOrderByProvider.openai;
  const availableProviders = providerOrder.filter((name) => {
    if (name === "groq") return Boolean(env.groqApiKey);
    if (name === "openai") return Boolean(env.openAiApiKey);
    return Boolean(env.geminiApiKey);
  });

  if (!availableProviders.length) {
    throw new ApiError(
      500,
      "No AI provider key configured (GROQ_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY)",
    );
  }

  const errors = [];
  let parsed = null;

  for (const candidate of availableProviders) {
    try {
      console.log(`[OCR] Structuring with provider: ${candidate}`);
      parsed = await callMap[candidate](ocrText);
      console.log(`[OCR] Structured parse success: ${candidate}`);
      break;
    } catch (error) {
      const message = getProviderErrorMessage(
        error,
        `${candidate} request failed`,
      );
      console.warn(`[OCR] Structured parse failed: ${candidate} -> ${message}`);
      errors.push(`${candidate.toUpperCase()} failed: ${message}`);
    }
  }

  if (!parsed) {
    throw new ApiError(502, errors.join(". "));
  }

  return normalizeParsedInvoice(parsed);
}

module.exports = {
  parseInvoiceWithAi,
  parseInvoiceTextWithAi,
  OCR_SYSTEM_PROMPT,
};
