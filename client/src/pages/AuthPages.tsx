import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useVault } from "../contexts/VaultContext";
import { Button } from "../components/ui/Button";
import { FieldError, Input, Label } from "../components/ui/Field";
import { analyzePassword } from "../lib/generator";
import { authApi } from "../api/auth";
import {
  createAuthVerifier,
  deriveMasterKey,
  generateRecoveryKey,
  randomSalt,
  recoveryPhraseToKey,
  recoveryKeyToPhrase,
  unwrapVaultKey,
  wrapVaultKey,
  KDF_PARAMS,
} from "../lib/crypto";

const loginSchema = z.object({
  email: z.string().email(),
  masterPassword: z.string().min(1),
  rememberDevice: z.boolean(),
});

export function LoginPage() {
  const { login } = useAuth();
  const { hydrate } = useVault();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", masterPassword: "", rememberDevice: false },
  });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        try {
          const { masterKey, user } = await login(values);
          await hydrate(user, masterKey);
          toast.success("Vault unlocked");
          navigate("/app");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Sign in failed");
        }
      })}
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="username" {...form.register("email")} />
        <FieldError message={form.formState.errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="password">Master password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("masterPassword")}
        />
        <FieldError message={form.formState.errors.masterPassword?.message} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("rememberDevice")} />
        Remember this device
      </label>
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
        Sign in
      </Button>
      <p className="text-sm">
        <Link to="/forgot-password" className="underline">
          Forgot master password?
        </Link>
      </p>
    </form>
  );
}

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    masterPassword: z.string().min(12, "Use at least 12 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.masterPassword === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export function RegisterPage() {
  const { registerAccount } = useAuth();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", masterPassword: "", confirm: "" },
  });
  const password = form.watch("masterPassword");
  const strength = analyzePassword(password);
  const [recovery, setRecovery] = useState<string | null>(null);

  if (recovery) {
    return (
      <div className="space-y-3">
        <p className="font-semibold">Save your recovery key</p>
        <p className="text-sm text-[var(--color-muted)]">
          Aegis cannot reset a lost master password without this key. Store it offline.
        </p>
        <code className="block break-all rounded-xl bg-black/5 p-3 text-sm">{recovery}</code>
        <Button className="w-full" onClick={() => navigate("/login")}>
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        try {
          const result = await registerAccount(values);
          setRecovery(result.recoveryPhrase);
          toast.success("Account created");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Registration failed");
        }
      })}
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register("name")} />
        <FieldError message={form.formState.errors.name?.message} />
      </div>
      <div>
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" {...form.register("email")} />
        <FieldError message={form.formState.errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="master">Master password</Label>
        <Input id="master" type="password" {...form.register("masterPassword")} />
        <p className="mt-1 text-xs text-[var(--color-muted)]">Strength: {strength}</p>
        <FieldError message={form.formState.errors.masterPassword?.message} />
      </div>
      <div>
        <Label htmlFor="confirm">Confirm master password</Label>
        <Input id="confirm" type="password" {...form.register("confirm")} />
        <FieldError message={form.formState.errors.confirm?.message} />
      </div>
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
        Create account
      </Button>
    </form>
  );
}

export function ForgotPage() {
  const forgotSchema = z.object({ email: z.string().email("Enter a valid email address") });
  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await authApi.forgotPassword(values.email);
          toast.success("If the account exists, reset instructions were sent.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not send reset instructions");
        }
      })}
    >
      <p className="text-sm text-[var(--color-muted)]">
        Resetting authentication still requires your recovery key. Without it, the vault cannot be
        decrypted.
      </p>
      <div>
        <Label htmlFor="forgot-email">Email</Label>
        <Input id="forgot-email" type="email" {...form.register("email")} />
        <FieldError message={form.formState.errors.email?.message} />
      </div>
      <Button className="w-full" type="submit">
        Send reset link
      </Button>
    </form>
  );
}

const resetSchema = z
  .object({
    token: z.string().min(16),
    recoveryKey: z.string().min(16),
    masterPassword: z.string().min(12),
    confirm: z.string(),
  })
  .refine((data) => data.masterPassword === data.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export function ResetPage() {
  const [params] = useSearchParams();
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: params.get("token") ?? "",
      recoveryKey: "",
      masterPassword: "",
      confirm: "",
    },
  });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        try {
          const recoveryKey = recoveryPhraseToKey(values.recoveryKey.trim());
          const wrap = await fetchResetWrap(values.token);
          const kdfSalt = randomSalt();
          const masterKey = await deriveMasterKey(values.masterPassword, kdfSalt, KDF_PARAMS);
          const vaultKey = await unwrapVaultKey(
            wrap.recoveryWrappedVaultKey,
            wrap.recoveryWrappedVaultKeyIv,
            recoveryKey,
          );
          const wrapped = await wrapVaultKey(vaultKey, masterKey);
          const newRecovery = generateRecoveryKey();
          const recovery = await wrapVaultKey(vaultKey, newRecovery);
          const authVerifier = await createAuthVerifier(masterKey);
          await authApi.resetPassword({
            token: values.token,
            authVerifier,
            kdfSalt,
            kdfParams: KDF_PARAMS,
            wrappedVaultKey: wrapped.wrapped,
            wrappedVaultKeyIv: wrapped.iv,
            recoveryWrappedVaultKey: recovery.wrapped,
            recoveryWrappedVaultKeyIv: recovery.iv,
          });
          toast.success("Master password updated. Save the new recovery key shown below.");
          toast.message(recoveryKeyToPhrase(newRecovery));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Reset failed");
        }
      })}
    >
      <p className="text-sm text-[var(--color-muted)]">
        Enter the email token and the recovery key shown at registration. The server never sees your
        new master password.
      </p>
      <Input placeholder="Reset token" {...form.register("token")} />
      <FieldError message={form.formState.errors.token?.message} />
      <Input placeholder="Recovery key" {...form.register("recoveryKey")} />
      <FieldError message={form.formState.errors.recoveryKey?.message} />
      <Input type="password" placeholder="New master password" {...form.register("masterPassword")} />
      <FieldError message={form.formState.errors.masterPassword?.message} />
      <Input type="password" placeholder="Confirm" {...form.register("confirm")} />
      <FieldError message={form.formState.errors.confirm?.message} />
      <Button className="w-full" type="submit">
        Reset master password
      </Button>
    </form>
  );
}

async function fetchResetWrap(token: string) {
  const response = await fetch("/api/auth/reset-material", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    message?: string;
    data?: {
      recoveryWrappedVaultKey: string;
      recoveryWrappedVaultKeyIv: string;
    };
  };
  if (!response.ok || !json.data) throw new Error(json.message ?? "Invalid reset token");
  return json.data;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">Confirm this inbox owns the Aegis account.</p>
      <Button
        className="w-full"
        onClick={async () => {
          try {
            await authApi.verifyEmail(token);
            setDone(true);
            toast.success("Email verified");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Verification failed");
          }
        }}
      >
        Verify email
      </Button>
      {done && <Link to="/login">Continue</Link>}
    </div>
  );
}
