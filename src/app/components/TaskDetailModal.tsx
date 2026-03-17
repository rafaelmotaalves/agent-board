"use client";

import { useEffect, useRef } from "react";
import type { Task, Agent } from "@/lib/types";
import { Queue, getNextQueue, QUEUES } from "@/lib/queues";
import { Loader2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface TaskDetailModalProps {
  task: Task;
  agents: Agent[];
  onClose: () => void;
  onApprove: (task: Task, nextQueue: Queue) => void;
  onDelete: (task: Task) => void;
}

export default function TaskDetailModal({ task, agents, onClose, onApprove, onDelete }: TaskDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queue = QUEUES.find((q) => q.slug === task.status);
  const nextQueue = queue ? getNextQueue(queue.slug) : null;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  const stateLabel: Record<string, string> = {
    pending: "Pending",
    in_progress: "In progress",
    done: "Done",
  };

  const stateBadge: Record<string, string> = {
    pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-0 shadow-xl backdrop:bg-black/40 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">#{task.id}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateBadge[task.state] ?? stateBadge.pending}`}>
            {task.state === "in_progress" && (
              <Loader2 className="mr-1 inline-block h-3 w-3 animate-spin" aria-hidden="true" />
            )}
            {stateLabel[task.state] ?? task.state}
          </span>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h2>
        {task.description ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{task.description}</p>
        ) : (
          <p className="mt-2 text-sm italic text-zinc-300 dark:text-zinc-600">No description</p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            <dt className="font-medium uppercase tracking-wide">Queue</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{queue?.label ?? task.status}</dd>
          </div>
          <div>
            <dt className="font-medium uppercase tracking-wide">Created</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
              {new Date(task.created_at).toISOString()}
            </dd>
          </div>
          <div>
            <dt className="font-medium uppercase tracking-wide">Updated</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
              {new Date(task.updated_at).toISOString()}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Assigned Agent
          </label>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
            {agents.find((a) => a.id === task.agent_id)?.name ?? <span className="italic text-zinc-400">Unassigned</span>}
          </p>
        </div>

        {task.plan && (
          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-700">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Plan</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-zinc-800 prose-p:text-zinc-600 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:text-zinc-800 dark:prose-headings:text-zinc-100 dark:prose-p:text-zinc-300 dark:prose-code:bg-zinc-700 dark:prose-code:text-zinc-200">
              <ReactMarkdown>{task.plan}</ReactMarkdown>
            </div>
          </div>
        )}

        {task.execution && (
          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-700">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Execution</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-zinc-800 prose-p:text-zinc-600 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:text-zinc-800 dark:prose-headings:text-zinc-100 dark:prose-p:text-zinc-300 dark:prose-code:bg-zinc-700 dark:prose-code:text-zinc-200">
              <ReactMarkdown>{task.execution}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3 dark:border-zinc-700">
        <button
          onClick={() => { onDelete(task); onClose(); }}
          className="cursor-pointer rounded px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
        >
          Delete
        </button>
        {nextQueue && task.state === "done" && (
          <button
            onClick={() => { onApprove(task, nextQueue); onClose(); }}
            className="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            Approve
          </button>
        )}
      </div>
    </dialog>
  );
}
