import mongoose, { Schema, type InferSchemaType } from "mongoose";

const kdfSchema = new Schema(
  {
    type: { type: String, enum: ["argon2id"], required: true },
    memory: { type: Number, required: true },
    iterations: { type: Number, required: true },
    parallelism: { type: Number, required: true },
    hashLength: { type: Number, required: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    authHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    kdfSalt: { type: String, required: true },
    kdfParams: { type: kdfSchema, required: true },
    wrappedVaultKey: { type: String, required: true },
    wrappedVaultKeyIv: { type: String, required: true },
    recoveryWrappedVaultKey: { type: String, default: null },
    recoveryWrappedVaultKeyIv: { type: String, default: null },
    lastLogin: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    autoLockMinutes: { type: Number, default: 10, min: 0, max: 1440 },
    clipboardClearSeconds: { type: Number, default: 20, min: 5, max: 120 },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const UserModel = mongoose.model("User", userSchema);
