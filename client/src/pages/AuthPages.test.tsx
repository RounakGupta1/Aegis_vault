import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForgotPage, LoginPage, RegisterPage, ResetPage } from "./AuthPages";

const loginMock = vi.fn();
const registerAccountMock = vi.fn();
const hydrateMock = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
    registerAccount: registerAccountMock,
  }),
}));

vi.mock("../contexts/VaultContext", () => ({
  useVault: () => ({
    hydrate: hydrateMock,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("auth forms", () => {
  beforeEach(() => {
    loginMock.mockReset();
    registerAccountMock.mockReset();
    hydrateMock.mockReset();
    window.history.replaceState({}, "", "/");
  });

  it("shows login validation messages", async () => {
    const user = userEvent.setup();
    renderPage(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
  });

  it("shows register validation messages", async () => {
    const user = userEvent.setup();
    renderPage(<RegisterPage />);

    await user.type(screen.getByLabelText("Name"), "A");
    await user.type(screen.getByLabelText("Email"), "bad-email");
    await user.type(screen.getByLabelText("Master password"), "short");
    await user.type(screen.getByLabelText("Confirm master password"), "mismatch");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Too small: expected string to have >=2 characters")).toBeInTheDocument();
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    expect(screen.getByText("Use at least 12 characters")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("shows forgot-password validation messages", async () => {
    const user = userEvent.setup();
    renderPage(<ForgotPage />);

    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("shows reset validation messages", async () => {
    const user = userEvent.setup();
    renderPage(<ResetPage />);

    await user.type(screen.getByPlaceholderText("Reset token"), "short");
    await user.type(screen.getByPlaceholderText("Recovery key"), "too-short");
    await user.type(screen.getByPlaceholderText("New master password"), "short");
    await user.type(screen.getByPlaceholderText("Confirm"), "different");
    await user.click(screen.getByRole("button", { name: "Reset master password" }));

    expect(
      await screen.findAllByText("Too small: expected string to have >=16 characters"),
    ).toHaveLength(2);
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });
});

function renderPage(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}
