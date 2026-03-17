"use client";

import type { Agent } from "@/lib/types";
import { AGENT_TYPES } from "@/lib/types";
import { TrashIcon, PencilIcon, LockIcon } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  onDelete: (agent: Agent) => void;
  onEdit?: (agent: Agent) => void;
}

export default function AgentCard({ agent, onDelete, onEdit }: AgentCardProps) {
  const typeLabel = AGENT_TYPES.find((t) => t.value === agent.type)?.label ?? agent.type;
  const connectionInfo = agent.type === "acp" ? agent.command : `:${agent.port}`;
  const isConfig = agent.source === "config";

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {agent.name}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={connectionInfo ?? undefined}>
          {connectionInfo}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {typeLabel}
          </span>
          {agent.options?.parallel_planning && (
            <span className="ml-1 inline-flex shrink-0 items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              ⚡ Parallel planning
            </span>
          )}
          {agent.options?.parallel_development && (
            <span className="ml-1 inline-flex shrink-0 items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              ⚡ Parallel dev
            </span>
          )}
          {isConfig && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <LockIcon className="h-2.5 w-2.5" />
              config
            </span>
          )}
        </div>
        <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-500" title={agent.folder}>
          📁 {agent.folder}
        </p>
      </div>
      <div className="ml-2 flex items-center gap-1">
        {!isConfig && onEdit && (
          <button
            onClick={() => onEdit(agent)}
            className="cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
            aria-label={`Edit agent ${agent.name}`}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
        {!isConfig && (
          <button
            onClick={() => onDelete(agent)}
            className="cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label={`Delete agent ${agent.name}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
