import { Task, TaskMessage } from "./types";

export interface IAgentCaller 
{
    sendMessage(task: Task, message: string): Promise<string>;

    planTask(task: Task): Promise<string>;

    executeTask(task: Task): Promise<string>;

    revisePlan(task: Task, messages: TaskMessage[]): Promise<string>;

    reviseExecution(task: Task, messages: TaskMessage[]): Promise<string>;
}