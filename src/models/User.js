const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "pharmacist", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
