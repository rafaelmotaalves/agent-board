const VALID_STATES = ["pending", "in_progress", "done", "add_message", "failed"] as const;
export type TaskState = (typeof VALID_STATES)[number];

export function isValidState(state: string): state is TaskState {
  return VALID_STATES.includes(state as TaskState);
}

export interface Task {
  id: number;
  title: string;
  description: string;
  plan: string | null;
  execution: string | null;
  agent_id: number | null;
  status: string;
  state: TaskState;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: number;
  name: string;
  port: number;
  created_at: string;
}

export interface TaskMessage {
  id: number;
  task_id: number;
  content: string;
  /** The task state at the time the message was added */
  task_state_at_creation: string;
  created_at: string;
}
