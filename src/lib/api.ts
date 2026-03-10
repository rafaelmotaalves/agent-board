import type { Task, Agent, AgentOptions, AgentType, TaskMessage, ToolCall, TaskUsage } from "@/lib/types";

export async function fetchTasks(includeArchived = false): Promise<Task[]> {
  const params = includeArchived ? "?includeArchived=true" : "";
  const res = await fetch(`/api/tasks${params}`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function createTask(
  title: string,
  description: string,
  agentId: number,
  status?: string
): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, agent_id: agentId, status }),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

export async function updateTaskStatus(
  id: number,
  status: string
): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update task");
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function retryTask(id: number): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "pending", failure_reason: null }),
  });
  if (!res.ok) throw new Error("Failed to retry task");
}

export async function archiveTask(id: number): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "archive" }),
  });
  if (!res.ok) throw new Error("Failed to archive task");
  return res.json();
}

export async function unarchiveTask(id: number): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unarchive" }),
  });
  if (!res.ok) throw new Error("Failed to unarchive task");
  return res.json();
}

export async function archiveAllDoneTasks(): Promise<{ archived: number }> {
  const res = await fetch("/api/tasks/archive-done", { method: "POST" });
  if (!res.ok) throw new Error("Failed to archive done tasks");
  return res.json();
}

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function createAgent(
  name: string,
  port: number | undefined,
  type?: AgentType,
  command?: string,
  folder?: string,
  options?: AgentOptions
): Promise<Agent> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, port, type, command, folder, options }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create agent");
  }
  return res.json();
}

export async function updateAgent(
  id: number,
  updates: { name?: string; port?: number; type?: AgentType; folder?: string | null; options?: AgentOptions }
): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to update agent");
  }
  return res.json();
}

export async function deleteAgent(id: number): Promise<void> {
  const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete agent");
  }
}

export async function fetchTaskMessages(taskId: number): Promise<TaskMessage[]> {
  const res = await fetch(`/api/tasks/${taskId}/messages`);
  if (!res.ok) throw new Error("Failed to fetch task messages");
  return res.json();
}

export async function addTaskMessage(taskId: number, content: string): Promise<TaskMessage> {
  const res = await fetch(`/api/tasks/${taskId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to add message");
  }
  return res.json();
}

export async function fetchToolCalls(taskId: number): Promise<ToolCall[]> {
  const res = await fetch(`/api/tasks/${taskId}/tool-calls`);
  if (!res.ok) throw new Error("Failed to fetch tool calls");
  return res.json();
}

export async function fetchUsage(taskId: number): Promise<TaskUsage[]> {
  const res = await fetch(`/api/tasks/${taskId}/usage`);
  if (!res.ok) throw new Error("Failed to fetch usage");
  return res.json();
}
