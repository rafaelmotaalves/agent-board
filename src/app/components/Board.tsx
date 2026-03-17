"use client";

import { useEffect, useState, useCallback } from "react";
import type { Task } from "@/lib/types";
import { Queue, QUEUES } from "@/lib/queues";
import { fetchTasks as apiFetchTasks, createTask, updateTaskStatus, deleteTask } from "@/lib/api";
import TaskCard from "./TaskCard";
import NewTaskForm from "./NewTaskForm";
import TaskDetailModal from "./TaskDetailModal";

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiFetchTasks();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading board...</p>
      </div>
    );
  }

  async function handleCreateTask(title: string, description: string) {
    await createTask(title, description);
    fetchTasks();
  }

  async function handleApprove(task: Task, nextQueue: Queue) {
    if (!nextQueue) return;
    await updateTaskStatus(task.id, nextQueue.slug);
    fetchTasks();
  }

  async function handleDelete(task: Task) {
    await deleteTask(task.id);
    fetchTasks();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          AI Board
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Agent task management
        </p>
      </header>

      <main className="flex flex-1 gap-4 overflow-x-auto p-6">
        {QUEUES.map((queue) => {
          const queueTasks = tasks.filter((t) => t.status === queue.slug);
          return (
            <section
              key={queue.slug}
              className="flex min-w-[20rem] flex-1 flex-col rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/50"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  {queue.label}
                </h2>
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {queueTasks.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {queueTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    queue={queue}
                    onApprove={handleApprove}
                    onDelete={handleDelete}
                    onClick={setSelectedTask}
                  />
                ))}
              </div>

              {queue.slug === "planning" && (
                <div className="mt-3">
                  <NewTaskForm onSubmit={handleCreateTask} />
                </div>
              )}
            </section>
          );
        })}
      </main>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onApprove={handleApprove}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
