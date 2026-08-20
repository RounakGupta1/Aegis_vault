import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVault } from "../../contexts/VaultContext";

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items } = useVault();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    const q = query.toLowerCase();
    return items
      .filter((item) => {
        const hay = [
          item.data.title,
          item.data.type,
          "username" in item.data ? item.data.username : "",
          "category" in item.data ? item.data.category : "",
          "tags" in item.data ? item.data.tags.join(" ") : "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [items, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-4" onClick={onClose}>
      <div
        className="glass mx-auto mt-24 max-w-xl rounded-2xl p-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search vault"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search website, username, category, or tag"
          className="w-full rounded-xl border border-[var(--color-line)] bg-transparent px-3 py-3"
        />
        <ul className="mt-2">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                className="w-full rounded-xl px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => {
                  navigate(`/app/vault/${item.id}`);
                  onClose();
                }}
              >
                {item.data.title}
                <span className="ml-2 text-xs text-[var(--color-muted)]">{item.data.type}</span>
              </button>
            </li>
          ))}
          {query && suggestions.length === 0 && (
            <li className="px-3 py-4 text-sm text-[var(--color-muted)]">No matching items</li>
          )}
        </ul>
      </div>
    </div>
  );
}
