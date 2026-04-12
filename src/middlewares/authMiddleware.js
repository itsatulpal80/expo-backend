const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiError");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return next(new ApiError(401, "Unauthorized: token missing"));
  }

  if (!env.jwtSecret) {
    return next(new ApiError(500, "JWT_SECRET is not configured"));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    next();
  } catch (_) {
    next(new ApiError(401, "Unauthorized: invalid token"));
  }
}

module.exports = { authMiddleware };
