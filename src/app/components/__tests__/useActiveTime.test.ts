import { describe, it, expect } from "bun:test";
import { formatActiveTime } from "@/app/components/useActiveTime";

describe("formatActiveTime", () => {
  it("formats zero milliseconds as 0s", () => {
    expect(formatActiveTime(0)).toBe("0s");
  });

  it("formats seconds only", () => {
    expect(formatActiveTime(5000)).toBe("5s");
  });

  it("formats minutes and seconds", () => {
    expect(formatActiveTime(65000)).toBe("1m 5s");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatActiveTime(3661000)).toBe("1h 1m 1s");
  });

  it("formats exact minutes", () => {
    expect(formatActiveTime(120000)).toBe("2m 0s");
  });

  it("formats exact hours", () => {
    expect(formatActiveTime(3600000)).toBe("1h 0m 0s");
  });

  it("handles negative values by clamping to 0", () => {
    expect(formatActiveTime(-1000)).toBe("0s");
  });

  it("truncates fractional seconds", () => {
    expect(formatActiveTime(1500)).toBe("1s");
  });
});
