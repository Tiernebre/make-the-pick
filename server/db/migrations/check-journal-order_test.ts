import { assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { assertJournalTimestampsMonotonic } from "./check-journal-order.ts";

describe("assertJournalTimestampsMonotonic", () => {
  it("passes when timestamps are strictly increasing", () => {
    const entries = [
      { idx: 0, when: 100, tag: "0000_first" },
      { idx: 1, when: 200, tag: "0001_second" },
      { idx: 2, when: 300, tag: "0002_third" },
    ];
    assertJournalTimestampsMonotonic(entries);
  });

  it("throws when a timestamp goes backwards", () => {
    const entries = [
      { idx: 0, when: 100, tag: "0000_first" },
      { idx: 1, when: 300, tag: "0001_second" },
      { idx: 2, when: 200, tag: "0002_third" },
    ];
    assertThrows(
      () => assertJournalTimestampsMonotonic(entries),
      Error,
      "0002_third",
    );
  });

  it("throws when timestamps are equal", () => {
    const entries = [
      { idx: 0, when: 100, tag: "0000_first" },
      { idx: 1, when: 100, tag: "0001_second" },
    ];
    assertThrows(
      () => assertJournalTimestampsMonotonic(entries),
      Error,
      "0001_second",
    );
  });

  it("passes with a single entry", () => {
    const entries = [{ idx: 0, when: 100, tag: "0000_first" }];
    assertJournalTimestampsMonotonic(entries);
  });

  it("passes with an empty list", () => {
    assertJournalTimestampsMonotonic([]);
  });
});
