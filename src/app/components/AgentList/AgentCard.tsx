"use client";

import type { Agent } from "@/lib/types";
import { AGENT_TYPES } from "@/lib/types";
import { TrashIcon } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  onDelete: (agent: Agent) => void;
}

export default function AgentCard({ agent, onDelete }: AgentCardProps) {
  const typeLabel = AGENT_TYPES.find((t) => t.value === agent.type)?.label ?? agent.type;
  const connectionInfo = agent.type === "acp" ? agent.command : `:${agent.port}`;

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {agent.name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="truncate" title={connectionInfo ?? undefined}>{connectionInfo}</span>
          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {typeLabel}
          </span>
          {agent.options?.parallel_planning && (
            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              parallel
            </span>
          )}
        </p>
        <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-500" title={agent.folder}>
          📁 {agent.folder}
        </p>
      </div>
      <button
        onClick={() => onDelete(agent)}
        className="ml-2 cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        aria-label={`Delete agent ${agent.name}`}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
