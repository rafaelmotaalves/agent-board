import { Task, TaskMessage } from "./types";

export interface IAgentCaller 
{
    sendMessage(task: Task, message: string): Promise<string>;

    planTask(task: Task): Promise<string>;

    executeTask(task: Task, messages: string[]): Promise<string>;
}