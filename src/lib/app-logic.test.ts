import { describe, expect, it } from "vitest";
import { createChatGate, currentUsagePeriod, resolveSwipe } from "./app-logic";

describe("resolveSwipe", () => {
  it("creates a compatibility match on right swipe at 70 or higher", () => {
    expect(resolveSwipe({ compatibility: 70 }, "right")).toEqual({
      kind: "match",
      reason: "compatibility",
    });
  });

  it("creates a super-like match regardless of compatibility", () => {
    expect(resolveSwipe({ compatibility: 12 }, "up")).toEqual({
      kind: "match",
      reason: "super-like",
    });
  });

  it("saves low-compatibility right swipes as interested", () => {
    expect(resolveSwipe({ compatibility: 69 }, "right")).toEqual({
      kind: "interested",
      reason: "below-threshold",
    });
  });
});

describe("chat usage helpers", () => {
  it("formats monthly usage periods in UTC", () => {
    expect(currentUsagePeriod(new Date("2026-05-30T12:00:00Z"))).toBe("2026-05");
  });

  it("locks free chat after three uses", () => {
    expect(createChatGate(3, false).canOpenChat()).toBe(false);
  });
});
