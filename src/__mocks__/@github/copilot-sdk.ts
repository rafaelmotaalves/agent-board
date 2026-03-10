// Manual mock for @github/copilot-sdk
// approveAll always returns { kind: "approved" } in the real SDK

export const approveAll = () => ({ kind: "approved" as const });

export const defineTool = (name: string, config: object) => ({ name, ...config });

export class CopilotClient {
  createSession = jest.fn().mockResolvedValue({
    on: jest.fn().mockReturnValue(jest.fn()),
    send: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  });
}

export class CopilotSession {}

export type PermissionHandler = (
  request: { kind: string; toolCallId?: string },
  invocation: { sessionId: string }
) => { kind: string; rules?: Array<{ description: string }> };
