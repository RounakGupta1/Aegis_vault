import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useVault } from "../contexts/VaultContext";
import type { CardData, LoginData, VaultItemType, VaultRecord } from "../types/vault";
import { VaultCard } from "../components/vault/VaultCard";
import { VaultForm } from "../components/vault/VaultForm";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { SecretField } from "../components/vault/SecretField";
import { copyAndExpire } from "../lib/clipboard";
import { formatDate } from "../lib/utils";
import { securityApi } from "../api/vault";

function customCategories(items: VaultRecord[]) {
  return items
    .map((item) => ("category" in item.data ? item.data.category : ""))
    .filter(Boolean);
}

export function VaultListPage({
  type,
  favoritesOnly,
  title,
}: {
  type?: VaultItemType;
  favoritesOnly?: boolean;
  title: string;
}) {
  const { items, saveItem } = useVault();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("updated");
  const [open, setOpen] = useState(location.search.includes("new=1"));

  useEffect(() => {
    if (location.search.includes("new=1")) {
      setOpen(true);
    }
  }, [location.search]);

  const filtered = useMemo(() => {
    let list = items.filter((item) => {
      if (type && item.data.type !== type) return false;
      if (favoritesOnly && !item.data.favorite) return false;
      const hay = [
        item.data.title,
        "username" in item.data ? item.data.username : "",
        "category" in item.data ? item.data.category : "",
        "tags" in item.data ? item.data.tags.join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();
      if (query && !hay.includes(query.toLowerCase())) return false;
      if (category !== "all" && "category" in item.data && item.data.category !== category) {
        return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.data.title.localeCompare(b.data.title);
      if (sort === "created") return +new Date(b.createdAt) - +new Date(a.createdAt);
      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });
    return list;
  }, [items, type, favoritesOnly, query, category, sort]);

  const cats = [...new Set(customCategories(items))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-[var(--color-muted)]">{filtered.length} items</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add item</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search website, username, category, tag"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-xl border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {cats.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updated">Recently updated</option>
          <option value="created">Recently added</option>
          <option value="name">Name</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="font-semibold">{query ? "No results" : "Your vault is empty"}</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {query ? "Try another search." : "Add a login, note, card, or identity to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <VaultCard key={item.id} item={item} query={query} />
          ))}
        </div>
      )}
      <Modal open={open} title="Add vault item" onClose={() => setOpen(false)}>
        <VaultForm
          customCategories={cats}
          onCancel={() => setOpen(false)}
          onSubmit={async (data) => {
            try {
              await saveItem(data);
              toast.success("Saved");
              setOpen(false);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save item");
            }
          }}
        />
      </Modal>
    </div>
  );
}

export function VaultDetailPage() {
  const { id } = useParams();
  const { items, saveItem, deleteItem } = useVault();
  const { user } = useAuth();
  const navigate = useNavigate();
  const item = items.find((entry) => entry.id === id);
  const [editing, setEditing] = useState(false);

  if (!item) {
    return <p>Item not found in the unlocked vault.</p>;
  }

  async function copy(value: string, label: string) {
    await copyAndExpire(value, user?.clipboardClearSeconds ?? 20);
    toast.success(`${label} copied. Clipboard clears shortly.`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-[var(--color-muted)]">{item.data.type}</p>
          <h1 className="text-3xl font-semibold">{item.data.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm("Delete this vault item? This cannot be undone.")) return;
              try {
                await deleteItem(item.id);
                toast.success("Deleted");
                navigate("/app/vault");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete item");
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      <div className="glass space-y-4 rounded-3xl p-5">
        {item.data.type === "login" && (
          <LoginDetails
            data={item.data}
            onCopy={copy}
          />
        )}
        {item.data.type === "note" && <p className="whitespace-pre-wrap">{item.data.content}</p>}
        {item.data.type === "card" && <CardDetails data={item.data} onCopy={copy} />}
        {item.data.type === "identity" && (
          <div className="space-y-1 text-sm">
            <p>{item.data.fullName}</p>
            <p>{item.data.email}</p>
            <p>{item.data.phone}</p>
            <p>
              {item.data.address}, {item.data.city}, {item.data.country}
            </p>
          </div>
        )}
        <p className="text-xs text-[var(--color-muted)]">
          Created {formatDate(item.createdAt)} · Updated {formatDate(item.updatedAt)}
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await saveItem({ ...item.data, favorite: !item.data.favorite }, item.id);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update favorite");
            }
          }}
        >
          {item.data.favorite ? "Unfavorite" : "Favorite"}
        </Button>
      </div>
      <Modal open={editing} title="Edit item" onClose={() => setEditing(false)}>
        <VaultForm
          initial={item}
          customCategories={customCategories(items)}
          onCancel={() => setEditing(false)}
          onSubmit={async (data) => {
            try {
              await saveItem(data, item.id);
              toast.success("Updated");
              setEditing(false);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update item");
            }
          }}
        />
      </Modal>
    </div>
  );
}

function CardDetails({
  data,
  onCopy,
}: {
  data: CardData;
  onCopy: (value: string, label: string) => Promise<void>;
}) {
  return (
    <>
      <p>{data.cardholder}</p>
      <SecretField id="card" value={data.number} onCopy={() => onCopy(data.number, "Card number")} />
      <p>
        Expires {data.expiryMonth}/{data.expiryYear} · last four {data.last4}
      </p>
    </>
  );
}

function LoginDetails({
  data,
  onCopy,
}: {
  data: LoginData;
  onCopy: (value: string, label: string) => Promise<void>;
}) {
  return (
    <>
      <Field label="Username" value={data.username} onCopy={() => onCopy(data.username, "Username")} />
      <div>
        <p className="mb-1 text-sm text-[var(--color-muted)]">Password</p>
        <SecretField
          id="secret"
          value={data.password}
          onCopy={() => onCopy(data.password, "Password")}
        />
      </div>
      {data.url && (
        <a
          className="text-sm text-teal-700 underline dark:text-teal-300"
          href={data.url}
          target="_blank"
          rel="noreferrer"
        >
          Open website
        </a>
      )}
      <Button
        variant="secondary"
        onClick={async () => {
          const hash = await sha1Hex(data.password);
          const prefix = hash.slice(0, 5);
          const suffix = hash.slice(5);
          const res = await securityApi.passwordCheck(prefix);
          if (!res.data.available) {
            toast.message("Breach dataset unavailable");
            return;
          }
          const hit = res.data.suffixes.split("\n").some((line) => line.startsWith(suffix));
          toast[hit ? "error" : "success"](
            hit
              ? "This password appears in a public breach dataset."
              : "No match in the k-anonymity breach range.",
          );
        }}
      >
        Check known breaches
      </Button>
      <p className="text-sm">Category: {data.category}</p>
      <p className="text-sm">Tags: {data.tags.join(", ") || "—"}</p>
      <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
    </>
  );
}

function Field({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-[var(--color-muted)]">{label}</p>
        <p>{value || "—"}</p>
      </div>
      <Button variant="secondary" onClick={onCopy}>
        Copy
      </Button>
    </div>
  );
}

async function sha1Hex(text: string) {
  const buffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
