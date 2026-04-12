const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqVisionModel:
    process.env.GROQ_VISION_MODEL ||
    "meta-llama/llama-4-scout-17b-16e-instruct",
  apiNinjasImageToTextUrl:
    process.env.API_NINJAS_IMAGETOTEXT_URL ||
    "https://api.api-ninjas.com/v1/imagetotext",
  apiNinjasApiKey: process.env.API_NINJAS_API_KEY || "",
  aiProvider: process.env.AI_PROVIDER || "openai",
  aiModel:
    process.env.AI_MODEL ||
    (process.env.AI_PROVIDER === "gemini"
      ? "gemini-1.5-flash"
      : process.env.AI_PROVIDER === "groq"
        ? "llama-3.3-70b-versatile"
        : "gpt-4o-mini"),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
};

module.exports = { env };
