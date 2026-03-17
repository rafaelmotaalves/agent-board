import type { Task, Agent } from "@/lib/types";
import type { Queue } from "@/lib/queues";
import { isReadyForReview } from "@/lib/queues";
import TaskCard from "../TaskCard";
import NewTaskForm from "../NewTaskForm";

interface BoardColumnProps {
  queue: Queue;
  tasks: Task[];
  agents: Agent[];
  onDelete: (task: Task) => void;
  onClick: (task: Task) => void;
  onCreateTask?: (title: string, description: string, agentId: number) => Promise<void>;
  onArchive?: (task: Task) => void;
  onUnarchive?: (task: Task) => void;
  onArchiveAll?: () => void;
}

export default function BoardColumn({ queue, tasks, agents, onDelete, onClick, onCreateTask, onArchive, onUnarchive, onArchiveAll }: BoardColumnProps) {
  const reviewCount = tasks.filter((t) => isReadyForReview(t.state, queue.slug)).length;

  return (
    <section
      className="flex min-h-0 min-w-[20rem] flex-1 flex-col rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/50"
    >
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          {queue.label}
        </h2>
        <div className="flex items-center gap-1.5">
          {reviewCount > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {reviewCount} to review
            </span>
          )}
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            queue={queue}
            assignedAgent={agents.find((a) => a.id === task.agent_id)}
            onDelete={onDelete}
            onClick={onClick}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
          />
        ))}
      </div>

      {onArchiveAll && tasks.some((t) => t.archived_at === null) && (
        <div className="mt-3 shrink-0">
          <button
            onClick={onArchiveAll}
            className="w-full cursor-pointer rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
          >
            Archive all
          </button>
        </div>
      )}

      {onCreateTask && (
        <div className="mt-3 shrink-0">
          <NewTaskForm agents={agents} onSubmit={onCreateTask} />
        </div>
      )}
    </section>
  );
}
