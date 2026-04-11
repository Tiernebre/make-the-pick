import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageTitle } from "./use-page-title";

const ORIGINAL_TITLE = "Make The Pick";

afterEach(() => {
  document.title = ORIGINAL_TITLE;
});

describe("usePageTitle", () => {
  it("sets document title to `<title> · Make The Pick`", () => {
    renderHook(() => usePageTitle("Leagues"));
    expect(document.title).toBe("Leagues · Make The Pick");
  });

  it("leaves title at the base when given undefined (still loading)", () => {
    renderHook(() => usePageTitle(undefined));
    expect(document.title).toBe(ORIGINAL_TITLE);
  });

  it("restores the previous title on unmount", () => {
    document.title = "Previous";
    const { unmount } = renderHook(() => usePageTitle("Draft"));
    expect(document.title).toBe("Draft · Make The Pick");
    unmount();
    expect(document.title).toBe("Previous");
  });

  it("updates title when the argument changes", () => {
    const { rerender } = renderHook(
      ({ title }: { title: string | undefined }) => usePageTitle(title),
      { initialProps: { title: "First" as string | undefined } },
    );
    expect(document.title).toBe("First · Make The Pick");
    rerender({ title: "Second" });
    expect(document.title).toBe("Second · Make The Pick");
  });
});
