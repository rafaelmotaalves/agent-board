import { Task, TaskMessage } from "../types";

export type DeltaCallback = (delta: string) => void;

export interface ToolCallEvent {
    toolCallId?: string;
    toolName: string;
    input?: string;
    kind?: string;
}

export interface ToolCallUpdateEvent {
    toolCallId?: string;
    output?: string;
    status: "completed" | "failed";
    kind?: string;
}

export type OnToolCall = (event: ToolCallEvent) => void;
export type OnToolCallUpdate = (event: ToolCallUpdateEvent) => void;

export interface AgentCallbacks {
    onDelta?: DeltaCallback;
    onToolCall?: OnToolCall;
    onToolCallUpdate?: OnToolCallUpdate;
}

export interface IAgentCaller 
{
    sendMessage(task: Task, message: string, callbacks?: AgentCallbacks): Promise<string>;

    planTask(task: Task, callbacks?: AgentCallbacks): Promise<string>;

    executeTask(task: Task, messages: string[], callbacks?: AgentCallbacks): Promise<string>;
}