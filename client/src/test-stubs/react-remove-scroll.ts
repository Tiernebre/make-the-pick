/**
 * Stub for react-remove-scroll used in tests.
 *
 * Deno's npm module store on Linux CI doesn't resolve the nested CJS
 * require chain (react-remove-scroll → react-remove-scroll-bar →
 * constants.js) correctly.  Using a resolve.alias in vitest config
 * redirects the import before module resolution, avoiding the broken path.
 */
const RemoveScroll = ({ children }: { children?: unknown }) => children;
RemoveScroll.classNames = { fullWidth: "", zeroRight: "" };

export { RemoveScroll };
export default RemoveScroll;
