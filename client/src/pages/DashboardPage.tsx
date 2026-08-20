import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useVault } from "../contexts/VaultContext";
import { buildHealthReport } from "../lib/health";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { VaultCard } from "../components/vault/VaultCard";

export function DashboardPage() {
  const { user } = useAuth();
  const { items } = useVault();
  const navigate = useNavigate();
  const health = useMemo(() => buildHealthReport(items), [items]);
  const recent = [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4);
  const updated = [...items].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 4);
  const favorites = items.filter((item) => item.data.favorite).length;

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-6">
        <p className="text-sm text-[var(--color-muted)]">Welcome back</p>
        <h1 className="mt-1 text-3xl font-semibold">{user?.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
          Your vault is decrypted only in this browser. The server stores ciphertext, never your secrets.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Saved items", health.total],
          ["Favorites", favorites],
          ["Security score", `${health.score}/100`],
          ["Weak / reused", `${health.weak} / ${health.reused}`],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-[var(--color-muted)]">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Password health</h2>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/10">
            <div className="h-full bg-teal-600" style={{ width: `${health.score}%` }} />
          </div>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {health.strong} strong logins · {health.weak} weak · {health.old} aging
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => navigate("/app/vault?new=1")}>
              Add password
            </Button>
            <Link to="/app/generator">
              <Button variant="secondary" className="w-full">
                Generate
              </Button>
            </Link>
            <Link to="/app/security">
              <Button variant="secondary" className="w-full">
                Security check
              </Button>
            </Link>
            <Link to="/app/favorites">
              <Button variant="secondary" className="w-full">
                Favorites
              </Button>
            </Link>
          </div>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Recently added</h2>
          <div className="grid gap-3">
            {recent.length ? recent.map((item) => <VaultCard key={item.id} item={item} />) : <Empty />}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Recently updated</h2>
          <div className="grid gap-3">
            {updated.length ? updated.map((item) => <VaultCard key={item.id} item={item} />) : <Empty />}
          </div>
        </div>
      </section>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-[var(--color-muted)]">Nothing here yet. Add your first credential.</p>;
}
