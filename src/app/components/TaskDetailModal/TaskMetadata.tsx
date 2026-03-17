import type { Task, Agent } from "@/lib/types";
import type { Queue } from "@/lib/queues";
import TimeSinceUpdate from "./TimeSinceUpdate";

interface TaskMetadataProps {
  task: Task;
  queue: Queue | undefined;
  agents: Agent[];
}

export default function TaskMetadata({ task, queue, agents }: TaskMetadataProps) {
  return (
    <div className="flex-shrink-0 px-5 py-4">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h2>
      {task.description && (
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{task.description}</p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          <dt className="font-medium uppercase tracking-wide">Queue</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{queue?.label ?? task.status}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wide">Created</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{new Date(task.created_at).toISOString()}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wide">Updated</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
            <TimeSinceUpdate updatedAt={task.updated_at} />
          </dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wide">Assigned Agent</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
            {agents.find((a) => a.id === task.agent_id)?.name ?? <span className="italic text-zinc-400">Unassigned</span>}
          </dd>
        </div>
        {task.completed_at && (
          <div>
            <dt className="font-medium uppercase tracking-wide">Completed</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{new Date(task.completed_at).toISOString()}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
