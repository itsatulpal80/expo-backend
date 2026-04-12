const mongoose = require("mongoose");
const { env } = require("./env");
const { ApiError } = require("../utils/apiError");

mongoose.set("bufferCommands", false);

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

function assertDbReady() {
  if (!isDbReady()) {
    throw new ApiError(
      503,
      "Database is not connected. Check MONGO_URI and MongoDB network access.",
    );
  }
}

async function connectDb() {
  if (!env.mongoUri) {
    throw new Error("MONGO_URI is missing in environment variables");
  }

  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB error:", error.message);
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    family: 4,
  });
  await mongoose.connection.db.admin().ping();
}

module.exports = { connectDb, isDbReady, assertDbReady };
