import { describe, it, expect } from "bun:test";
import { logAndDenyWrites, createPermissionHandler } from "../agents/copilotCaller";
import { approveAll } from "@github/copilot-sdk";

const invocation = { sessionId: "test-session-123" };

describe("copilotCaller", () => {
    // ──────────────────────────────────────────────────────────
    // logAndDenyWrites (legacy)
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

    // ──────────────────────────────────────────────────────────
    // createPermissionHandler
    // ──────────────────────────────────────────────────────────
    describe("createPermissionHandler", () => {
        it("should store kind in the kindMap when toolCallId is present", () => {
            const kindMap = new Map<string, string>();
            const handler = createPermissionHandler(kindMap, false);

            handler({ kind: "shell" as const, toolCallId: "tc-10" }, invocation);
            expect(kindMap.get("tc-10")).toBe("shell");
        });

        it("should not store in kindMap when toolCallId is missing", () => {
            const kindMap = new Map<string, string>();
            const handler = createPermissionHandler(kindMap, false);

            handler({ kind: "read" as const } as Parameters<typeof handler>[0], invocation);
            expect(kindMap.size).toBe(0);
        });

        it("should deny writes when denyWrites is true", () => {
            const kindMap = new Map<string, string>();
            const handler = createPermissionHandler(kindMap, true);

            const result = handler({ kind: "write" as const, toolCallId: "tc-11" }, invocation);
            expect(result).toEqual({
                kind: "denied-by-rules",
                rules: [{ description: "Write operations are not allowed during planning mode" }],
            });
            // Should still store the kind
            expect(kindMap.get("tc-11")).toBe("write");
        });

        it("should approve writes when denyWrites is false", () => {
            const kindMap = new Map<string, string>();
            const handler = createPermissionHandler(kindMap, false);

            const request = { kind: "write" as const, toolCallId: "tc-12" };
            const result = handler(request, invocation);
            expect(result).toEqual(approveAll(request, invocation));
            expect(kindMap.get("tc-12")).toBe("write");
        });

        it("should approve non-write requests regardless of denyWrites", () => {
            const kindMap = new Map<string, string>();
            const handler = createPermissionHandler(kindMap, true);

            const request = { kind: "shell" as const, toolCallId: "tc-13" };
            const result = handler(request, invocation);
            expect(result).toEqual(approveAll(request, invocation));
        });
    });
});
