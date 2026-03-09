"use client";

import type { Task, Agent } from "@/lib/types";
import { Queue, getNextQueue, isReadyForReview, SLUG_DONE } from "@/lib/queues";
import { Loader2, TrashIcon, AlertCircle, Clock, CheckCircle2, ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useActiveTime, formatActiveTime } from "./useActiveTime";

interface TaskCardProps {
  task: Task;
  queue: Queue;
  assignedAgent?: Agent;
  onDelete: (task: Task) => void;
  onClick: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onUnarchive?: (task: Task) => void;
}

export default function TaskCard({ task, queue, assignedAgent, onDelete, onClick, onArchive, onUnarchive }: TaskCardProps) {
  const nextQueue = getNextQueue(queue.slug);
  const readyForReview = isReadyForReview(task.state, queue.slug);
  const activeMs = useActiveTime(task.active_time_ms, task.active_since);
  const isActive = task.active_since !== null;
  const displayTime = activeMs > 0 || isActive ? formatActiveTime(activeMs) : null;
  const isDone = queue.slug === SLUG_DONE;
  const isArchived = task.archived_at !== null;

  return (
    <div
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-800 ${
        isArchived
          ? "border-zinc-300 opacity-60 dark:border-zinc-600"
          : task.state === "failed"
            ? "border-red-400 border-l-4 dark:border-red-500"
            : readyForReview
              ? "border-emerald-400 border-l-4 dark:border-emerald-500"
              : "border-zinc-200 dark:border-zinc-700"
      }`}
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(task)}
    >
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {task.title}
        {isArchived && (
          <span className="ml-2 inline-block rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
            Archived
          </span>
        )}
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
        <span className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          #{task.id}
          {displayTime && (
            <span
              className={`flex items-center gap-0.5 ${
                isActive
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
              title={isActive ? "Agent working" : "Active time"}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {displayTime}
            </span>
          )}
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
          {readyForReview && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Ready for review
            </span>
          )}
          {isDone && !isArchived && onArchive && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(task); }}
              className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
              aria-label={`Archive task ${task.title}`}
              title="Archive"
            >
              <ArchiveIcon className="h-4 w-4" />
            </button>
          )}
          {isArchived && onUnarchive && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnarchive(task); }}
              className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              aria-label={`Unarchive task ${task.title}`}
              title="Unarchive"
            >
              <ArchiveRestoreIcon className="h-4 w-4" />
            </button>
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
