import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { CeremonySettings } from "./CeremonySettings";

function renderSettings(
  overrides: Partial<Parameters<typeof CeremonySettings>[0]> = {},
) {
  const props = {
    isMuted: true,
    isFastMode: false,
    onToggleMute: vi.fn(),
    onToggleFastMode: vi.fn(),
    ...overrides,
  };
  render(
    <MantineProvider>
      <CeremonySettings {...props} />
    </MantineProvider>,
  );
  return props;
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /ceremony/i }));
}

describe("CeremonySettings", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a trigger button anyone can click", () => {
    renderSettings();
    expect(screen.getByRole("button", { name: /ceremony/i }))
      .toBeInTheDocument();
  });

  it("shows a Sound switch reflecting the unmuted state when opened", () => {
    renderSettings({ isMuted: false });
    openMenu();
    expect(screen.getByRole("switch", { name: /sound/i })).toBeChecked();
  });

  it("shows a Sound switch as off when muted", () => {
    renderSettings({ isMuted: true });
    openMenu();
    expect(screen.getByRole("switch", { name: /sound/i })).not.toBeChecked();
  });

  it("calls onToggleMute when the Sound switch is clicked", () => {
    const { onToggleMute } = renderSettings();
    openMenu();
    fireEvent.click(screen.getByRole("switch", { name: /sound/i }));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("shows a Fast mode switch reflecting the current value", () => {
    renderSettings({ isFastMode: true });
    openMenu();
    expect(screen.getByRole("switch", { name: /fast mode/i })).toBeChecked();
  });

  it("calls onToggleFastMode with the inverted value when clicked", () => {
    const { onToggleFastMode } = renderSettings({ isFastMode: false });
    openMenu();
    fireEvent.click(screen.getByRole("switch", { name: /fast mode/i }));
    expect(onToggleFastMode).toHaveBeenCalledWith(true);
  });
});
