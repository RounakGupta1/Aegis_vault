import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useVault } from "../contexts/VaultContext";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Field";
import { formatDate } from "../lib/utils";

export function UnlockPage() {
  const { user, logout } = useAuth();
  const { unlock, unlocking } = useVault();
  const navigate = useNavigate();
  const form = useForm({ defaultValues: { masterPassword: "" } });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <div className="glass rounded-3xl p-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-teal-700 dark:text-teal-300">
          AEGIS VAULT
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Your vault is locked</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Signed in as {user?.email}. Encrypted items stay on the server until you unlock locally.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--color-muted)]">Last login</dt>
            <dd>{formatDate(user?.lastLogin)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Account created</dt>
            <dd>{formatDate(user?.createdAt)}</dd>
          </div>
        </dl>
        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await unlock(values.masterPassword);
              navigate("/app");
            } catch {
              toast.error("Could not unlock. Check your master password.");
            }
          })}
        >
          <div>
            <Label htmlFor="unlock">Master password</Label>
            <Input id="unlock" type="password" autoComplete="current-password" {...form.register("masterPassword")} />
          </div>
          <Button className="w-full" type="submit" disabled={unlocking}>
            Unlock Vault
          </Button>
          <Button
            className="w-full"
            type="button"
            variant="secondary"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </form>
      </div>
    </div>
  );
}
