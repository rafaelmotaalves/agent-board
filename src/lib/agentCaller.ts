import { Task } from "./types";

export interface IAgentCaller 
{
    planTask(task: Task): Promise<string>;

    executeTask(task: Task): Promise<string>;
}