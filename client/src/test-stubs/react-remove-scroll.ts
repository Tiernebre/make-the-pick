/**
 * Stub for react-remove-scroll used in tests.
 *
 * Deno's npm module store on Linux doesn't resolve the nested CJS
 * require chain (react-remove-scroll → react-remove-scroll-bar)
 * correctly, causing CI failures. Tests don't need scroll-lock
 * behavior, so this passthrough stub is sufficient.
 */
import type { ComponentType, PropsWithChildren } from "react";

const RemoveScroll: ComponentType<PropsWithChildren<Record<string, unknown>>> =
  (
    { children },
  ) => children;

RemoveScroll.classNames = { fullWidth: "", zeroRight: "" };

export { RemoveScroll };
export default RemoveScroll;
