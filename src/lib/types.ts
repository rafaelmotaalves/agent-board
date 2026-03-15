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
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export const AGENT_TYPES = [
  { value: "copilot_cli_sdk", label: "Copilot CLI SDK" },
  { value: "acp", label: "ACP Agent" },
] as const;

export type AgentType = (typeof AGENT_TYPES)[number]["value"];

export function isValidAgentType(type: string): type is AgentType {
  return AGENT_TYPES.some((t) => t.value === type);
}

export const DEFAULT_AGENT_TYPE: AgentType = "copilot_cli_sdk";

export interface AgentOptions {
  parallel_planning?: boolean;
  parallel_development?: boolean;
}

export interface Agent {
  id: number;
  name: string;
  port: number | null;
  type: AgentType;
  command: string | null;
  folder: string;
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

export interface ToolCall {
  id: number;
  task_id: number;
  tool_call_id: string | null;
  tool_name: string;
  kind: string | null;
  input: string | null;
  output: string | null;
  status: "running" | "completed" | "failed";
  task_state_at_creation: string;
  created_at: string;
  completed_at: string | null;
}

export interface TaskUsage {
  id: number;
  task_id: number;
  token_limit: number;
  used_tokens: number;
  status: string;
  created_at: string;
  updated_at: string;
}
