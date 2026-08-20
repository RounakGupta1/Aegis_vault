import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VaultForm } from "./VaultForm";

describe("VaultForm", () => {
  it("shows a validation message when the item name is missing", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <VaultForm
        customCategories={[]}
        onCancel={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Too small: expected string to have >=1 characters")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
