export const DEFAULT_CATEGORIES = [
  "Social",
  "Banking",
  "Education",
  "Work",
  "Shopping",
  "Entertainment",
  "Development",
  "Email",
  "Other",
] as const;

export type VaultItemType = "login" | "note" | "card" | "identity";

export type LoginData = {
  type: "login";
  title: string;
  username: string;
  password: string;
  url: string;
  category: string;
  notes: string;
  tags: string[];
  favorite: boolean;
};

export type NoteData = {
  type: "note";
  title: string;
  content: string;
  category: string;
  tags: string[];
  favorite: boolean;
};

export type CardData = {
  type: "card";
  title: string;
  cardholder: string;
  number: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  notes: string;
  favorite: boolean;
};

export type IdentityData = {
  type: "identity";
  title: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  favorite: boolean;
};

export type VaultPayload = LoginData | NoteData | CardData | IdentityData;

export type EncryptedVaultItem = {
  id: string;
  ciphertext: string;
  iv: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type VaultRecord = EncryptedVaultItem & {
  data: VaultPayload;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  kdfSalt: string;
  kdfParams: {
    type: "argon2id";
    memory: number;
    iterations: number;
    parallelism: number;
    hashLength: number;
  };
  wrappedVaultKey: string;
  wrappedVaultKeyIv: string;
  hasRecoveryKey: boolean;
};
