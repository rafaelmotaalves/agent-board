import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { render, screen } from "@testing-library/react";
import TimeSinceUpdate, { formatElapsed, parseUTC } from "../TimeSinceUpdate";

describe("parseUTC", () => {
  it("parses ISO 8601 strings with Z suffix", () => {
    expect(parseUTC("2025-01-15T12:00:00Z")).toBe(new Date("2025-01-15T12:00:00Z").getTime());
  });

  it("parses SQLite datetime format as UTC", () => {
    expect(parseUTC("2025-01-15 12:00:00")).toBe(new Date("2025-01-15T12:00:00Z").getTime());
  });

  it("parses ISO 8601 strings with milliseconds", () => {
    expect(parseUTC("2025-01-15T12:00:00.000Z")).toBe(new Date("2025-01-15T12:00:00Z").getTime());
  });
});

describe("formatElapsed", () => {
  it("shows seconds only when under a minute", () => {
    expect(formatElapsed(5000)).toBe("5s");
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(59999)).toBe("59s");
  });

  it("shows minutes and seconds when under an hour", () => {
    expect(formatElapsed(60000)).toBe("1m 0s");
    expect(formatElapsed(90000)).toBe("1m 30s");
    expect(formatElapsed(3599999)).toBe("59m 59s");
  });

  it("shows hours, minutes, and seconds when over an hour", () => {
    expect(formatElapsed(3600000)).toBe("1h 0m 0s");
    expect(formatElapsed(3661000)).toBe("1h 1m 1s");
    expect(formatElapsed(7200000 + 1800000 + 45000)).toBe("2h 30m 45s");
  });

  it("clamps negative values to 0s", () => {
    expect(formatElapsed(-1000)).toBe("0s");
  });
});

describe("TimeSinceUpdate", () => {
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    originalDateNow = Date.now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it("renders elapsed time with 'ago' suffix", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    Date.now = () => new Date(fiveMinutesAgo).getTime() + 5 * 60 * 1000;

    render(<TimeSinceUpdate updatedAt={fiveMinutesAgo} />);
    const el = screen.getByTestId("time-since-update");
    expect(el.textContent).toContain("5m");
    expect(el.textContent).toContain("ago");
  });

  it("renders 0s ago for just-updated tasks", () => {
    const now = Date.now();
    Date.now = () => now;
    const justNow = new Date(now).toISOString();

    render(<TimeSinceUpdate updatedAt={justNow} />);
    const el = screen.getByTestId("time-since-update");
    expect(el.textContent).toBe("0s ago");
  });

  it("renders correct elapsed time for SQLite datetime format (no Z)", () => {
    // Simulate a SQLite datetime('now') value: "2025-01-15 12:00:00"
    const sqliteDatetime = "2025-01-15 12:00:00";
    // 10 minutes after that UTC timestamp
    Date.now = () => new Date("2025-01-15T12:10:00Z").getTime();

    render(<TimeSinceUpdate updatedAt={sqliteDatetime} />);
    const el = screen.getByTestId("time-since-update");
    expect(el.textContent).toContain("10m");
    expect(el.textContent).toContain("ago");
  });
});
