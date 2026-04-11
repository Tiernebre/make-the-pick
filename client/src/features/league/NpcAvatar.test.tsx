import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { NpcAvatar } from "./NpcAvatar";

function renderAvatar(props: Parameters<typeof NpcAvatar>[0]) {
  return render(
    <MantineProvider>
      <NpcAvatar {...props} />
    </MantineProvider>,
  );
}

describe("NpcAvatar", () => {
  afterEach(() => cleanup());

  it("renders the sprite image with the provided src", () => {
    renderAvatar({
      name: "Professor Kukui",
      image: "https://example.com/kukui.png",
    });
    const img = screen.getByAltText("Professor Kukui") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/kukui.png");
  });

  it("positions the sprite so the head lands inside the bubble", () => {
    renderAvatar({
      name: "Cynthia",
      image: "https://example.com/cynthia.png",
    });
    const img = screen.getByAltText("Cynthia");
    const styles = getComputedStyle(img);
    expect(styles.objectFit).toBe("cover");
    expect(styles.objectPosition).toContain("top");
  });

  it("falls back to initials when no image is provided", () => {
    renderAvatar({ name: "Red Oak", image: null });
    expect(screen.getByText("RO")).toBeInTheDocument();
  });

  it("gives the avatar a deterministic background color derived from the name", () => {
    const { container: a } = renderAvatar({
      name: "Archer",
      image: "https://example.com/archer.png",
    });
    const rootA = a.querySelector<HTMLElement>("[data-npc-avatar-root]");
    expect(rootA).not.toBeNull();
    const bgA = rootA!.style.backgroundColor;
    expect(bgA).not.toBe("");

    cleanup();

    const { container: b } = renderAvatar({
      name: "Archer",
      image: "https://example.com/archer.png",
    });
    const rootB = b.querySelector<HTMLElement>("[data-npc-avatar-root]");
    expect(rootB!.style.backgroundColor).toBe(bgA);
  });

  it("gives different names different background colors", () => {
    const { container: a } = renderAvatar({
      name: "Cynthia",
      image: null,
    });
    const bgA = a.querySelector<HTMLElement>("[data-npc-avatar-root]")!
      .style.backgroundColor;

    cleanup();

    const { container: b } = renderAvatar({
      name: "Giovanni",
      image: null,
    });
    const bgB = b.querySelector<HTMLElement>("[data-npc-avatar-root]")!
      .style.backgroundColor;

    expect(bgA).not.toBe(bgB);
  });
});
