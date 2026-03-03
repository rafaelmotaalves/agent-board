"use client";

import type { Task } from "@/lib/types";
import { Queue, getNextQueue } from "@/lib/queues";
import { Loader2 } from "lucide-react";

interface TaskCardProps {
  task: Task;
  queue: Queue;
  onApprove: (task: Task, nextQueue: Queue) => void;
  onDelete: (task: Task) => void;
  onClick: (task: Task) => void;
}

export default function TaskCard({ task, queue, onApprove, onDelete, onClick }: TaskCardProps) {
  const nextQueue = getNextQueue(queue.slug);

  return (
    <div
      className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
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
          {nextQueue && task.state === "done" && (
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(task, nextQueue); }}
              className="cursor-pointer rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
            >
              Approve
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label={`Delete task ${task.title}`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
