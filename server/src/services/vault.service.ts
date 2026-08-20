import { VaultItemModel } from "../models/VaultItem.js";
import { ForbiddenError, NotFoundError } from "../utils/appError.js";

export async function listVaultItems(userId: string) {
  const items = await VaultItemModel.find({ userId }).sort({ updatedAt: -1 }).lean();
  return items.map((item) => ({
    id: String(item._id),
    ciphertext: item.ciphertext,
    iv: item.iv,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export async function createVaultItem(
  userId: string,
  input: { ciphertext: string; iv: string; version: number },
) {
  const item = await VaultItemModel.create({
    userId,
    ciphertext: input.ciphertext,
    iv: input.iv,
    version: input.version,
  });
  return {
    id: String(item._id),
    ciphertext: item.ciphertext,
    iv: item.iv,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function updateVaultItem(
  userId: string,
  id: string,
  input: { ciphertext: string; iv: string; version: number },
) {
  const item = await VaultItemModel.findById(id);
  if (!item) {
    throw new NotFoundError("Vault item not found");
  }
  if (String(item.userId) !== userId) {
    throw new ForbiddenError("You cannot access this vault item");
  }
  item.ciphertext = input.ciphertext;
  item.iv = input.iv;
  item.version = input.version;
  await item.save();
  return {
    id: String(item._id),
    ciphertext: item.ciphertext,
    iv: item.iv,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function deleteVaultItem(userId: string, id: string) {
  const item = await VaultItemModel.findById(id);
  if (!item) {
    throw new NotFoundError("Vault item not found");
  }
  if (String(item.userId) !== userId) {
    throw new ForbiddenError("You cannot access this vault item");
  }
  await item.deleteOne();
}
