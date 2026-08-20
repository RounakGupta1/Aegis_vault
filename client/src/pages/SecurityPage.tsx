import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useVault } from "../contexts/VaultContext";
import { buildHealthReport } from "../lib/health";
import { Card } from "../components/ui/Card";

export function SecurityPage() {
  const { items } = useVault();
  const health = useMemo(() => buildHealthReport(items), [items]);
  const byId = new Map(items.map((item) => [item.id, item]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Security Center</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Analysis runs locally after decrypt. Reports never include plaintext passwords.
        </p>
      </div>
      <Card>
        <p className="text-sm text-[var(--color-muted)]">Security score</p>
        <p className="mt-1 text-5xl font-semibold">{health.score}/100</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Weak", health.weak],
          ["Reused", health.reused],
          ["Old", health.old],
          ["Strong", health.strong],
          ["Accounts", health.logins],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-[var(--color-muted)]">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="font-semibold">Recommendations</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {health.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <IssueList title="Weak passwords" ids={health.weakIds} byId={byId} />
      <IssueList title="Reused passwords" ids={health.reusedIds} byId={byId} />
      <IssueList title="Old passwords" ids={health.oldIds} byId={byId} />
    </div>
  );
}

function IssueList({
  title,
  ids,
  byId,
}: {
  title: string;
  ids: string[];
  byId: Map<string, { data: { title: string }; id: string }>;
}) {
  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {ids.length === 0 && <li className="text-[var(--color-muted)]">None</li>}
        {ids.map((id) => (
          <li key={id}>
            <Link className="underline" to={`/app/vault/${id}`}>
              {byId.get(id)?.data.title ?? "Item"}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
