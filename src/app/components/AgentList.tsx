"use client";

import type { Agent } from "@/lib/types";
import AgentCard from "./AgentCard";
import NewAgentForm from "./NewAgentForm";

interface AgentListProps {
  agents: Agent[];
  onDelete: (agent: Agent) => void;
  onSubmit: (name: string, port: number) => Promise<void>;
}

export default function AgentList({ agents, onDelete, onSubmit }: AgentListProps) {
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
          <AgentCard key={agent.id} agent={agent} onDelete={onDelete} />
        ))}
        {agents.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-400 dark:border-zinc-700">
            No agents yet
          </p>
        )}
      </div>

      <NewAgentForm onSubmit={onSubmit} />
    </aside>
  );
}
