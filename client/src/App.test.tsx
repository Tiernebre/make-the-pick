import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App";

test("renders Draftr title", () => {
  render(<App />);
  expect(screen.getByText("Draftr")).toBeInTheDocument();
});
