import { Link, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useVault } from "../contexts/VaultContext";
import { Skeleton } from "../components/ui/Card";

export function GuestOnly() {
  const { user, loading } = useAuth();
  const { locked } = useVault();
  if (loading) return <Skeleton className="m-10 h-40" />;
  if (user) return <Navigate to={locked ? "/unlock" : "/app"} replace />;
  return <Outlet />;
}

export function AuthOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Skeleton className="m-10 h-40" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function UnlockedOnly() {
  const { locked } = useVault();
  if (locked) return <Navigate to="/unlock" replace />;
  return <Outlet />;
}

export function AuthFrame({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-teal-700 dark:text-teal-300">AEGIS VAULT</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-[var(--color-muted)]">{subtitle}</p>
      </div>
      <div className="glass rounded-3xl p-6">
        <Outlet />
      </div>
      <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
        <Link to="/login" className="underline">
          Sign in
        </Link>
        {" · "}
        <Link to="/register" className="underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
