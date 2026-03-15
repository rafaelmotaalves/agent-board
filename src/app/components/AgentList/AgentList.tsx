"use client";

import type { Agent, AgentOptions, AgentType } from "@/lib/types";
import AgentCard from "./AgentCard";
import NewAgentForm from "./NewAgentForm";
import AgentEmptyState from "./AgentEmptyState";

interface AgentListProps {
  agents: Agent[];
  onDelete: (agent: Agent) => void;
  onSubmit: (name: string, port: number | undefined, type: AgentType, command?: string, folder?: string, options?: AgentOptions) => Promise<void>;
  onUpdate: (id: number, updates: { name?: string; port?: number; type?: AgentType; command?: string; folder?: string; options?: AgentOptions }) => Promise<void>;
  editingAgent: Agent | null;
  onEdit: (agent: Agent) => void;
  onCancelEdit: () => void;
}

export default function AgentList({ agents, onDelete, onSubmit, onUpdate, editingAgent, onEdit, onCancelEdit }: AgentListProps) {
  return (
    <aside className="flex w-72 flex-shrink-0 flex-col gap-4 border-l border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        Agents
        <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {agents.length}
        </span>
      </h2>

      <div className="flex flex-col gap-2">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onDelete={onDelete} onEdit={onEdit} />
        ))}
        {agents.length === 0 && <AgentEmptyState />}
      </div>

      <NewAgentForm
        onSubmit={onSubmit}
        onUpdate={onUpdate}
        editingAgent={editingAgent}
        onCancelEdit={onCancelEdit}
      />
    </aside>
  );
}
