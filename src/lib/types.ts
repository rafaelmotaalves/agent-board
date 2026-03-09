const VALID_STATES = ["pending", "in_progress", "done", "add_message", "failed"] as const;
export type TaskState = (typeof VALID_STATES)[number];

export function isValidState(state: string): state is TaskState {
  return VALID_STATES.includes(state as TaskState);
}

export interface Task {
  id: number;
  title: string;
  description: string;
  agent_id: number;
  status: string;
  state: TaskState;
  failure_reason: string | null;
  completed_at: string | null;
  active_time_ms: number;
  active_since: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentOptions {
  parallel_planning?: boolean;
}

export interface Agent {
  id: number;
  name: string;
  port: number;
  options: AgentOptions;
  created_at: string;
}

export interface TaskMessage {
  id: number;
  task_id: number;
  role: "user" | "agent";
  content: string;
  /** The task status (queue/phase) at the time the message was added, e.g. 'planning', 'development', 'done' */
  task_state_at_creation: string;
  created_at: string;
  /** 0 = streaming in progress, 1 = complete */
  is_complete: number;
}
