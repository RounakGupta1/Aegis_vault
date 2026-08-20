import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Star,
  StickyNote,
  Sparkles,
  Settings,
  CreditCard,
  UserRound,
  Menu,
  LogOut,
  Lock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useVault } from "../contexts/VaultContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/Button";
import { SearchPalette } from "../components/search/SearchPalette";
import { cn } from "../lib/utils";

const links = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/vault", label: "Vault", icon: KeyRound },
  { to: "/app/favorites", label: "Favorites", icon: Star },
  { to: "/app/notes", label: "Secure notes", icon: StickyNote },
  { to: "/app/cards", label: "Cards", icon: CreditCard },
  { to: "/app/identities", label: "Identities", icon: UserRound },
  { to: "/app/generator", label: "Generator", icon: Sparkles },
  { to: "/app/security", label: "Security Center", icon: ShieldCheck },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { lock } = useVault();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <aside
        className={cn(
          "glass fixed inset-y-3 left-3 z-40 w-64 rounded-3xl p-4 md:static md:m-3 md:block",
          open ? "block" : "hidden md:block",
        )}
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-950">
            A
          </div>
          <div>
            <p className="font-semibold">Aegis Vault</p>
            <p className="text-xs text-[var(--color-muted)]">Zero-knowledge locker</p>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                  isActive ? "bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-950" : "hover:bg-black/5 dark:hover:bg-white/10",
                )
              }
            >
              <link.icon size={16} />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col p-3 md:pl-0">
        <header className="glass mb-3 flex items-center justify-between rounded-3xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
              <Menu size={18} />
            </Button>
            <button
              className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-left text-sm text-[var(--color-muted)]"
              onClick={() => setSearch(true)}
            >
              Search vault · Ctrl/⌘ K
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Theme"
              className="rounded-xl border border-[var(--color-line)] bg-transparent px-2 py-2 text-sm"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <Button variant="secondary" onClick={lock} aria-label="Lock vault">
              <Lock size={16} />
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                lock();
                await logout();
                navigate("/login");
              }}
            >
              <LogOut size={16} />
            </Button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{user?.email}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 pb-8">
          <Outlet />
        </main>
      </div>
      <SearchPalette open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
