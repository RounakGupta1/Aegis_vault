import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { vaultApi } from "../api/vault";
import { useAuth } from "./AuthContext";
import {
  decryptJson,
  deriveMasterKey,
  encryptJson,
  unwrapVaultKey,
  wipeBytes,
} from "../lib/crypto";
import type { EncryptedVaultItem, PublicUser, VaultPayload, VaultRecord } from "../types/vault";

type VaultContextValue = {
  locked: boolean;
  unlocking: boolean;
  items: VaultRecord[];
  unlock: (masterPassword: string) => Promise<void>;
  hydrate: (sessionUser: PublicUser, masterKey: Uint8Array) => Promise<void>;
  lock: () => void;
  saveItem: (data: VaultPayload, id?: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  lastActivity: number;
};

const VaultContext = createContext<VaultContextValue | null>(null);

async function decryptAll(list: EncryptedVaultItem[], vaultKey: Uint8Array) {
  const records: VaultRecord[] = [];
  for (const item of list) {
    const data = await decryptJson<VaultPayload>(item.ciphertext, item.iv, vaultKey);
    records.push({ ...item, data });
  }
  return records;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const vaultKeyRef = useRef<Uint8Array | null>(null);
  const [items, setItems] = useState<VaultRecord[]>([]);
  const [locked, setLocked] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const lock = useCallback(() => {
    wipeBytes(vaultKeyRef.current);
    vaultKeyRef.current = null;
    setItems([]);
    setLocked(true);
  }, []);

  const touch = useCallback(() => setLastActivity(Date.now()), []);

  const hydrate = useCallback(async (sessionUser: PublicUser, masterKey: Uint8Array) => {
    const vaultKey = await unwrapVaultKey(
      sessionUser.wrappedVaultKey,
      sessionUser.wrappedVaultKeyIv,
      masterKey,
    );
    wipeBytes(masterKey);
    const list = await vaultApi.list();
    const records = await decryptAll(list.data.items, vaultKey);
    vaultKeyRef.current = vaultKey;
    setItems(records);
    setLocked(false);
    setLastActivity(Date.now());
  }, []);

  const unlock = useCallback(
    async (masterPassword: string) => {
      if (!user) throw new Error("Not signed in");
      setUnlocking(true);
      try {
        const masterKey = await deriveMasterKey(masterPassword, user.kdfSalt, user.kdfParams);
        const vaultKey = await unwrapVaultKey(
          user.wrappedVaultKey,
          user.wrappedVaultKeyIv,
          masterKey,
        );
        wipeBytes(masterKey);
        const list = await vaultApi.list();
        const records = await decryptAll(list.data.items, vaultKey);
        vaultKeyRef.current = vaultKey;
        setItems(records);
        setLocked(false);
        setLastActivity(Date.now());
      } finally {
        setUnlocking(false);
      }
    },
    [user],
  );

  const saveItem = useCallback(async (data: VaultPayload, id?: string) => {
    const key = vaultKeyRef.current;
    if (!key) throw new Error("Vault is locked");
    const encrypted = await encryptJson(data, key);
    if (id) {
      const res = await vaultApi.update(id, encrypted);
      const record = { ...res.data.item, data };
      setItems((current) => current.map((item) => (item.id === id ? record : item)));
    } else {
      const res = await vaultApi.create(encrypted);
      setItems((current) => [{ ...res.data.item, data }, ...current]);
    }
    touch();
  }, [touch]);

  const deleteItem = useCallback(async (id: string) => {
    if (!vaultKeyRef.current) throw new Error("Vault is locked");
    await vaultApi.remove(id);
    setItems((current) => current.filter((item) => item.id !== id));
    touch();
  }, [touch]);

  useEffect(() => {
    if (!user) lock();
  }, [user, lock]);

  useEffect(() => {
    if (locked || !user) return;
    const minutes = user.autoLockMinutes;
    if (minutes === 0) return;
    const onActivity = () => setLastActivity(Date.now());
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, onActivity));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity > minutes * 60 * 1000) {
        lock();
      }
    }, 5000);
    const onVis = () => {
      if (document.hidden) {
        /* inactivity continues via timestamp */
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [locked, user, lastActivity, lock]);

  const value = useMemo(
    () => ({ locked, unlocking, items, unlock, hydrate, lock, saveItem, deleteItem, lastActivity }),
    [locked, unlocking, items, unlock, hydrate, lock, saveItem, deleteItem, lastActivity],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("VaultProvider missing");
  return ctx;
}
