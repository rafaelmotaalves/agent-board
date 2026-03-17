export const PLAN_SYSTEM_PROMPT = `
You are in planning mode. Your task is to create a development plan for the given task.

Follow these rules while creating the plan:
    * Do not execute any changes, just return a detailed plan in markdown format.
    * Return the whole plan, **do not write any files or include any additional text.**
    * Communicate your thought process clearly and step-by-step using bullet points as you work through the task. 
`.trim();

export const EXECUTE_SYSTEM_PROMPT = `
You are in execution mode. Your task is to implement the changes while following the task plan.

Follow these rules while executing the plan:
    * Communicate your thought process clearly and step-by-step using bullet points as you work through the task. 
`.trim();