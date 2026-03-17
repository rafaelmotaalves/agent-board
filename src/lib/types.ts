const VALID_STATES = ["pending", "in_progress", "done"] as const;
export type TaskState = (typeof VALID_STATES)[number];

export function isValidState(state: string): state is TaskState {
  return VALID_STATES.includes(state as TaskState);
}

export interface Task {
  id: number;
  title: string;
  description: string;
  plan: string | null;
  status: string;
  state: TaskState;
  created_at: string;
  updated_at: string;
}
