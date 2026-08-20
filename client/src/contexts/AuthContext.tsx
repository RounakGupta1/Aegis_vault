import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../api/auth";
import type { PublicUser } from "../types/vault";
import {
  createAuthVerifier,
  deriveMasterKey,
  generateRecoveryKey,
  generateVaultKey,
  randomSalt,
  recoveryKeyToPhrase,
  wrapVaultKey,
  type KdfParams,
  KDF_PARAMS,
} from "../lib/crypto";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  registerAccount: (input: {
    name: string;
    email: string;
    masterPassword: string;
  }) => Promise<{ recoveryPhrase: string }>;
  login: (input: {
    email: string;
    masterPassword: string;
    rememberDevice: boolean;
  }) => Promise<{ masterKey: Uint8Array; user: PublicUser }>;
  logout: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .refresh()
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const registerAccount = useCallback(async (input: {
    name: string;
    email: string;
    masterPassword: string;
  }) => {
    const kdfSalt = randomSalt();
    const kdfParams: KdfParams = KDF_PARAMS;
    const masterKey = await deriveMasterKey(input.masterPassword, kdfSalt, kdfParams);
    const authVerifier = await createAuthVerifier(masterKey);
    const vaultKey = generateVaultKey();
    const recoveryKey = generateRecoveryKey();
    const wrapped = await wrapVaultKey(vaultKey, masterKey);
    const recovery = await wrapVaultKey(vaultKey, recoveryKey);
    await authApi.register({
      name: input.name,
      email: input.email,
      authVerifier,
      kdfSalt,
      kdfParams,
      wrappedVaultKey: wrapped.wrapped,
      wrappedVaultKeyIv: wrapped.iv,
      recoveryWrappedVaultKey: recovery.wrapped,
      recoveryWrappedVaultKeyIv: recovery.iv,
    });
    vaultKey.fill(0);
    masterKey.fill(0);
    return { recoveryPhrase: recoveryKeyToPhrase(recoveryKey) };
  }, []);

  const login = useCallback(async (input: {
    email: string;
    masterPassword: string;
    rememberDevice: boolean;
  }) => {
    const pre = await authApi.prelogin(input.email);
    const masterKey = await deriveMasterKey(
      input.masterPassword,
      pre.data.kdfSalt,
      pre.data.kdfParams,
    );
    const authVerifier = await createAuthVerifier(masterKey);
    const res = await authApi.login({
      email: input.email,
      authVerifier,
      rememberDevice: input.rememberDevice,
    });
    setUser(res.data.user);
    return { masterKey, user: res.data.user };
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, registerAccount, login, logout, setUser }),
    [user, loading, registerAccount, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
