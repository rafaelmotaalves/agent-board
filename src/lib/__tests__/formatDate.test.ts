import { describe, it, expect } from "vitest";
import { formatDateTime } from "@/lib/formatDate";

describe("formatDateTime", () => {
  it("formats an ISO date string into a readable format", () => {
    const result = formatDateTime("2026-03-09T12:21:12Z");
    // The exact format depends on locale, but it should contain the key parts
    expect(result).toContain("2026");
    expect(result).toContain("Mar");
    expect(result).toContain("9");
  });

  it("handles a different date", () => {
    const result = formatDateTime("2025-12-25T08:30:00Z");
    expect(result).toContain("2025");
    expect(result).toContain("Dec");
    expect(result).toContain("25");
  });

  it("returns a string", () => {
    const result = formatDateTime("2026-01-01T00:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
