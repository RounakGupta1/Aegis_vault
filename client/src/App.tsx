import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { VaultProvider } from "./contexts/VaultContext";
import { AuthFrame, AuthOnly, GuestOnly, UnlockedOnly } from "./layouts/Guards";
import { AppShell } from "./layouts/AppShell";
import { LoginPage, RegisterPage, ForgotPage, ResetPage, VerifyEmailPage } from "./pages/AuthPages";
import { UnlockPage } from "./pages/UnlockPage";
import { DashboardPage } from "./pages/DashboardPage";
import { VaultDetailPage, VaultListPage } from "./pages/VaultPages";
import { GeneratorPage } from "./pages/GeneratorPage";
import { SecurityPage } from "./pages/SecurityPage";
import { SettingsPage } from "./pages/SettingsPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <VaultProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<GuestOnly />}>
                  <Route element={<AuthFrame title="Welcome back" subtitle="Unlock your encrypted vault." />}>
                    <Route path="/login" element={<LoginPage />} />
                  </Route>
                  <Route
                    element={<AuthFrame title="Create your vault" subtitle="Your master password never leaves this device as plaintext." />}
                  >
                    <Route path="/register" element={<RegisterPage />} />
                  </Route>
                  <Route
                    element={<AuthFrame title="Forgot password" subtitle="Recovery still requires your recovery key." />}
                  >
                    <Route path="/forgot-password" element={<ForgotPage />} />
                  </Route>
                  <Route element={<AuthFrame title="Reset master password" subtitle="Re-wrap the vault key locally." />}>
                    <Route path="/reset-password" element={<ResetPage />} />
                  </Route>
                  <Route element={<AuthFrame title="Verify email" subtitle="Confirm ownership of this inbox." />}>
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                  </Route>
                </Route>
                <Route element={<AuthOnly />}>
                  <Route path="/unlock" element={<UnlockPage />} />
                  <Route element={<UnlockedOnly />}>
                    <Route path="/app" element={<AppShell />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="vault" element={<VaultListPage title="Vault" />} />
                      <Route path="vault/:id" element={<VaultDetailPage />} />
                      <Route path="favorites" element={<VaultListPage title="Favorites" favoritesOnly />} />
                      <Route path="notes" element={<VaultListPage title="Secure notes" type="note" />} />
                      <Route path="cards" element={<VaultListPage title="Cards" type="card" />} />
                      <Route path="identities" element={<VaultListPage title="Identities" type="identity" />} />
                      <Route path="generator" element={<GeneratorPage />} />
                      <Route path="security" element={<SecurityPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster richColors position="top-right" />
          </VaultProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
