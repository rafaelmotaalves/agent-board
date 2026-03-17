import type { Task } from "@/lib/types";
import type { Queue } from "@/lib/queues";
import { Loader2, X, RotateCcw, Code } from "lucide-react";

const stateLabel: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  add_message: "Awaiting revision",
  failed: "Failed",
};

const stateBadge: Record<string, string> = {
  planning: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  add_message: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

interface ModalHeaderProps {
  task: Task;
  nextQueue: Queue | null;
  workingDir?: string;
  onApprove: (task: Task, nextQueue: Queue) => void;
  onDelete: (task: Task) => void;
  onRetry: (task: Task) => void;
  onClose: () => void;
}

export default function ModalHeader({ task, nextQueue, workingDir, onApprove, onDelete, onRetry, onClose }: ModalHeaderProps) {
  return (
    <div className="flex-shrink-0 flex items-start justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-700">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">#{task.id}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateBadge[task.state] ?? stateBadge.planning}`}>
          {(task.state === "in_progress" || task.state === "add_message") && (
            <Loader2 className="mr-1 inline-block h-3 w-3 animate-spin" aria-hidden="true" />
          )}
          {stateLabel[task.state] ?? task.state}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {workingDir && (
          <button
            onClick={() => { window.open(`vscode://file/${workingDir}`); }}
            className="cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 flex items-center gap-1"
            title="Open working directory in VS Code"
          >
            <Code className="h-3.5 w-3.5" aria-hidden="true" />
            Open on Code
          </button>
        )}
        {task.state === "failed" && (
          <button
            onClick={() => { onRetry(task); }}
            className="cursor-pointer rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        )}
        {nextQueue && task.state === "done" && (
          <button
            onClick={() => { onApprove(task, nextQueue); onClose(); }}
            className="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            {nextQueue.slug === 'development' ? 'Start development' : 'Complete task'}
          </button>
        )}
        <button
          onClick={() => { onDelete(task); onClose(); }}
          className="cursor-pointer rounded px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
        >
          Delete
        </button>
        <button
          onClick={onClose}
          className="cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
