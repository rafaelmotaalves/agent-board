"use client";

import type { Task, Agent } from "@/lib/types";
import type { Queue } from "@/lib/queues";
import { formatDateTime } from "@/lib/formatDate";

import { useActiveTime, formatActiveTime } from "../useActiveTime";
import { Clock } from "lucide-react";

interface TaskMetadataProps {
  task: Task;
  queue: Queue | undefined;
  agents: Agent[];
}

export default function TaskMetadata({ task, queue, agents }: TaskMetadataProps) {
  const activeMs = useActiveTime(task.active_time_ms, task.active_since);
  const isActive = task.active_since !== null;

  return (
    <div className="min-h-0 shrink px-5 py-4 overflow-y-auto">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h2>
      {task.description && (
        <p className="mt-1.5 max-h-20 overflow-y-auto text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{task.description}</p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          <dt className="font-medium uppercase tracking-wide">Queue</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{queue?.label ?? task.status}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wide">Created</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{formatDateTime(task.created_at)}</dd>
        </div>

        <div>
          <dt className="font-medium uppercase tracking-wide">Assigned Agent</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
            {agents.find((a) => a.id === task.agent_id)?.name ?? "Unknown"}
          </dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wide">Active Time</dt>
          <dd className={`mt-0.5 flex items-center gap-1 ${isActive ? "text-blue-500 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-200"}`}>
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatActiveTime(activeMs)}
            {isActive && <span className="text-[10px] uppercase tracking-wider">(running)</span>}
          </dd>
        </div>
        {task.completed_at && (
          <div>
            <dt className="font-medium uppercase tracking-wide">Completed</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{formatDateTime(task.completed_at)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
