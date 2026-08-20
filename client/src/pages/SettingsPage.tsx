import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { authApi } from "../api/auth";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Field";
import { Card } from "../components/ui/Card";
import { formatDate } from "../lib/utils";

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const form = useForm({
    defaultValues: {
      name: user?.name ?? "",
      autoLockMinutes: user?.autoLockMinutes ?? 10,
      clipboardClearSeconds: user?.clipboardClearSeconds ?? 20,
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Profile & security</h1>
      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--color-muted)]">Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Verified</dt>
            <dd>{user?.emailVerified ? "Yes" : "Pending"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Created</dt>
            <dd>{formatDate(user?.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Last login</dt>
            <dd>{formatDate(user?.lastLogin)}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(async (values) => {
            const res = await authApi.updateProfile({
              name: values.name,
              autoLockMinutes: Number(values.autoLockMinutes),
              clipboardClearSeconds: Number(values.clipboardClearSeconds),
            });
            setUser(res.data.user);
            toast.success("Settings saved");
          })}
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
          </div>
          <div>
            <Label htmlFor="lock">Auto-lock (minutes, 0 = never)</Label>
            <select
              id="lock"
              className="w-full rounded-xl border border-[var(--color-line)] bg-transparent px-3 py-2.5 text-sm"
              {...form.register("autoLockMinutes", { valueAsNumber: true })}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={0}>Never (not recommended)</option>
            </select>
            {form.watch("autoLockMinutes") === 0 && (
              <p className="mt-1 text-sm text-amber-600">
                Never auto-locking leaves decrypted secrets in memory until you lock or close the tab.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="clip">Clipboard clear (seconds)</Label>
            <Input id="clip" type="number" min={5} max={120} {...form.register("clipboardClearSeconds")} />
          </div>
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
