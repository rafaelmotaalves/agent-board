import type { Task, Agent } from "@/lib/types";
import type { Queue } from "@/lib/queues";
import TaskCard from "../TaskCard";
import NewTaskForm from "../NewTaskForm";

interface BoardColumnProps {
  queue: Queue;
  tasks: Task[];
  agents: Agent[];
  onDelete: (task: Task) => void;
  onClick: (task: Task) => void;
  onCreateTask?: (title: string, description: string, agentId: number | null) => Promise<void>;
}

export default function BoardColumn({ queue, tasks, agents, onDelete, onClick, onCreateTask }: BoardColumnProps) {
  return (
    <section
      className="flex min-w-[20rem] flex-1 flex-col rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/50"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          {queue.label}
        </h2>
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            queue={queue}
            assignedAgent={agents.find((a) => a.id === task.agent_id)}
            onDelete={onDelete}
            onClick={onClick}
          />
        ))}
      </div>

      {onCreateTask && (
        <div className="mt-3">
          <NewTaskForm agents={agents} onSubmit={onCreateTask} />
        </div>
      )}
    </section>
  );
}
