import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GeneratorPanel } from "./GeneratorPanel";

describe("GeneratorPanel", () => {
  it("regenerates a visible password", async () => {
    const user = userEvent.setup();
    render(<GeneratorPanel />);
    const before = document.body.textContent;
    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(document.body.textContent).not.toBe(before);
    expect(screen.getByRole("meter", { name: "Password strength" })).toBeInTheDocument();
  });
});
