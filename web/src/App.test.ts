import { describe, expect, it } from "vitest";
import { messages } from "./api/messages";
import { routeFromHash } from "./route";

describe("shell", () => {
  it("routes the three top-level views, defaulting to the calendar", () => {
    expect(routeFromHash("")).toBe("calendar");
    expect(routeFromHash("#/")).toBe("calendar");
    expect(routeFromHash("#/evidence")).toBe("evidence");
    expect(routeFromHash("#/about")).toBe("about");
    expect(routeFromHash("#/nonsense")).toBe("calendar");
  });

  it("loads the placeholder banner's words from contract/messages.yaml", () => {
    expect(messages.notes.placeholder).toMatch(/^Placeholder data\./);
    expect(messages.problems.outside_coverage).toBeTruthy();
  });
});
