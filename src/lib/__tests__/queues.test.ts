import { describe, it, expect } from "bun:test";
import { QUEUES, getNextQueue, isValidQueue, isReadyForReview } from "@/lib/queues";

describe("queues", () => {
  it("has 3 queues in order", () => {
    expect(QUEUES).toHaveLength(3);
    expect(QUEUES.map((q) => q.slug)).toEqual(["planning", "development", "done"]);
  });

  describe("getNextQueue", () => {
    it("returns development after planning", () => {
      expect(getNextQueue("planning")?.slug).toBe("development");
    });

    it("returns done after development", () => {
      expect(getNextQueue("development")?.slug).toBe("done");
    });

    it("returns null after done", () => {
      expect(getNextQueue("done")).toBeNull();
    });

    it("returns null for unknown slug", () => {
      expect(getNextQueue("unknown")).toBeNull();
    });
  });

  describe("isValidQueue", () => {
    it("returns true for valid queue slugs", () => {
      expect(isValidQueue("planning")).toBe(true);
      expect(isValidQueue("development")).toBe(true);
      expect(isValidQueue("done")).toBe(true);
    });

    it("returns false for invalid slugs", () => {
      expect(isValidQueue("invalid")).toBe(false);
      expect(isValidQueue("")).toBe(false);
    });
  });

  describe("isReadyForReview", () => {
    it("returns true when state is done and not in final queue", () => {
      expect(isReadyForReview("done", "planning")).toBe(true);
      expect(isReadyForReview("done", "development")).toBe(true);
    });

    it("returns false when in the final queue (done)", () => {
      expect(isReadyForReview("done", "done")).toBe(false);
    });

    it("returns false when state is not done", () => {
      expect(isReadyForReview("pending", "planning")).toBe(false);
      expect(isReadyForReview("in_progress", "development")).toBe(false);
      expect(isReadyForReview("failed", "planning")).toBe(false);
    });
  });
});
