import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { TrainerCard } from "./TrainerCard";

function renderCard(props: Parameters<typeof TrainerCard>[0]) {
  return render(
    <MantineProvider>
      <TrainerCard {...props} />
    </MantineProvider>,
  );
}

describe("TrainerCard", () => {
  afterEach(() => cleanup());

  it("renders the trainer name", () => {
    renderCard({ name: "Ash Ketchum" });
    expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
  });

  it("falls back to 'Unclaimed' when name is null", () => {
    renderCard({ name: null });
    expect(screen.getByText(/unclaimed/i)).toBeInTheDocument();
  });

  it("shows the role badge when provided", () => {
    renderCard({ name: "Ash Ketchum", role: "commissioner" });
    expect(screen.getByText(/commissioner/i)).toBeInTheDocument();
  });

  it("shows the subtitle when provided", () => {
    renderCard({ name: "Ash Ketchum", subtitle: "Johto Classic" });
    expect(screen.getByText("Johto Classic")).toBeInTheDocument();
  });

  it("has a trainer-card test id for external assertions", () => {
    renderCard({ name: "Ash" });
    expect(screen.getByTestId("trainer-card")).toBeInTheDocument();
  });
});
