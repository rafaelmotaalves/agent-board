import { Task, TaskMessage } from "./types";

export type DeltaCallback = (delta: string) => void;

export interface IAgentCaller 
{
    sendMessage(task: Task, message: string, onDelta?: DeltaCallback): Promise<string>;

    planTask(task: Task, onDelta?: DeltaCallback): Promise<string>;

    executeTask(task: Task, messages: string[], onDelta?: DeltaCallback): Promise<string>;
}