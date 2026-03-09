import { describe, it, expect, mock } from "bun:test";
import { logAndDenyWrites } from "../copilotCaller";
import { approveAll } from "@github/copilot-sdk";

const invocation = { sessionId: "test-session-123" };

describe("copilotCaller", () => {
    // ──────────────────────────────────────────────────────────
    // logAndDenyWrites
    // ──────────────────────────────────────────────────────────
    describe("logAndDenyWrites", () => {
        it("should deny write permission requests", () => {
            const request = { kind: "write" as const, toolCallId: "tc-1" };
            const result = logAndDenyWrites(request, invocation);
            expect(result).toEqual({
                kind: "denied-by-rules",
                rules: [{ description: "Write operations are not allowed during planning mode" }],
            });
        });

        it("should approve read permission requests", () => {
            const request = { kind: "read" as const, toolCallId: "tc-2" };
            const result = logAndDenyWrites(request, invocation);
            expect(result).toEqual(approveAll(request, invocation));
        });

        it("should approve shell permission requests", () => {
            const request = { kind: "shell" as const, toolCallId: "tc-3" };
            const result = logAndDenyWrites(request, invocation);
            expect(result).toEqual(approveAll(request, invocation));
        });

        it("should approve url permission requests", () => {
            const request = { kind: "url" as const, toolCallId: "tc-4" };
            const result = logAndDenyWrites(request, invocation);
            expect(result).toEqual(approveAll(request, invocation));
        });

        it("should approve mcp permission requests", () => {
            const request = { kind: "mcp" as const, toolCallId: "tc-5" };
            const result = logAndDenyWrites(request, invocation);
            expect(result).toEqual(approveAll(request, invocation));
        });

        it("should approve custom-tool permission requests", () => {
            const request = { kind: "custom-tool" as const, toolCallId: "tc-6" };
            const result = logAndDenyWrites(request, invocation);
            expect(result).toEqual(approveAll(request, invocation));
        });
    });
});
