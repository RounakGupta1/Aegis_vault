import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { VaultRecord } from "../../types/vault";
import { hostFromUrl } from "../../lib/utils";

export function VaultCard({ item, query }: { item: VaultRecord; query?: string }) {
  const subtitle =
    item.data.type === "login"
      ? item.data.username
      : item.data.type === "note"
        ? "Secure note"
        : item.data.type === "card"
          ? `•••• ${item.data.last4}`
          : item.data.fullName;

  function highlight(text: string) {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index < 0) return text;
    return (
      <>
        {text.slice(0, index)}
        <mark className="rounded bg-amber-200/80 px-0.5 dark:bg-amber-500/30">
          {text.slice(index, index + query.length)}
        </mark>
        {text.slice(index + query.length)}
      </>
    );
  }

  return (
    <Link
      to={`/app/vault/${item.id}`}
      className="glass block rounded-2xl p-4 transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{item.data.type}</p>
          <h3 className="mt-1 font-semibold">{highlight(item.data.title)}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>
          {item.data.type === "login" && item.data.url && (
            <p className="mt-1 text-xs text-teal-700 dark:text-teal-300">{hostFromUrl(item.data.url)}</p>
          )}
        </div>
        {item.data.favorite && <Star size={16} className="fill-amber-400 text-amber-400" />}
      </div>
    </Link>
  );
}
