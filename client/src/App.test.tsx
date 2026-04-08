import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { App } from "./App";
import { queryClient } from "./trpc";

afterEach(() => {
  queryClient.clear();
  cleanup();
});

test("renders Make The Pick title", () => {
  render(<App />);
  expect(screen.getByText("Make The Pick")).toBeInTheDocument();
});
