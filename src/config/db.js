const mongoose = require("mongoose");
const { env } = require("./env");
const { ApiError } = require("../utils/apiError");

mongoose.set("bufferCommands", false);
let hasBoundConnectionEvents = false;
let connectionPromise = null;

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

function bindConnectionEvents() {
  if (hasBoundConnectionEvents) return;

  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB error:", error.message);
  });

  hasBoundConnectionEvents = true;
}

async function connectDb() {
  if (isDbReady()) return mongoose.connection;

  if (!env.mongoUri) {
    throw new Error("MONGO_URI is missing in environment variables");
  }

  bindConnectionEvents();

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      family: 4,
    });
  }

  await connectionPromise;
  await mongoose.connection.db.admin().ping();
  connectionPromise = null;
  return mongoose.connection;
}

async function ensureDbReady() {
  if (!isDbReady()) {
    await connectDb();
  }
  assertDbReady();
}

module.exports = { connectDb, isDbReady, assertDbReady, ensureDbReady };
