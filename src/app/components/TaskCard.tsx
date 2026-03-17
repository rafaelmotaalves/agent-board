"use client";

import type { Task, Agent } from "@/lib/types";
import { Queue, getNextQueue } from "@/lib/queues";
import { Loader2, TrashIcon, AlertCircle } from "lucide-react";

interface TaskCardProps {
  task: Task;
  queue: Queue;
  assignedAgent?: Agent;
  onDelete: (task: Task) => void;
  onClick: (task: Task) => void;
}

export default function TaskCard({ task, queue, assignedAgent, onDelete, onClick }: TaskCardProps) {
  const nextQueue = getNextQueue(queue.slug);

  return (
    <div
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-800 ${
        task.state === "failed"
          ? "border-red-400 border-l-4 dark:border-red-500"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(task)}
    >
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {task.title}
      </h3>
      {task.description && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {task.description}
        </p>
      )}
      {assignedAgent && (
        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" aria-hidden="true" />
          {assignedAgent.name}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          #{task.id}
        </span>
        <div className="flex items-center gap-1.5">
          {nextQueue && task.state === "in_progress" && (
            <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            </span>
          )}
          {task.state === "failed" && (
            <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400" title={task.failure_reason ?? "Task failed"}>
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Failed</span>
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label={`Delete task ${task.title}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
