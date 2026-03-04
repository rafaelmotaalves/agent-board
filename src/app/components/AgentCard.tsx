"use client";

import type { Agent } from "@/lib/types";
import { X, TrashIcon } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  onDelete: (agent: Agent) => void;
}

export default function AgentCard({ agent, onDelete }: AgentCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {agent.name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">:{agent.port}</p>
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
