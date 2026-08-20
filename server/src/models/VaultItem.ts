import mongoose, { Schema, type InferSchemaType } from "mongoose";

const vaultItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

vaultItemSchema.index({ userId: 1, updatedAt: -1 });

export type VaultItem = InferSchemaType<typeof vaultItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const VaultItemModel = mongoose.model("VaultItem", vaultItemSchema);
