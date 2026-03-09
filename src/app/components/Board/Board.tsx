"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Task, Agent, AgentOptions, AgentType } from "@/lib/types";
import { Queue, QUEUES, SLUG_DONE } from "@/lib/queues";
import { fetchTasks as apiFetchTasks, createTask, updateTaskStatus, deleteTask, fetchAgents, createAgent, deleteAgent, archiveTask, unarchiveTask, archiveAllDoneTasks } from "@/lib/api";
import TaskDetailModal from "../TaskDetailModal";
import AgentList from "../AgentList";
import BoardHeader from "./BoardHeader";
import BoardColumn from "./BoardColumn";
import LoadingSpinner from "./LoadingSpinner";
import { useReviewSound } from "../useReviewSound";

const SOUND_STORAGE_KEY = "agentboard:sound-enabled";

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAgents, setShowAgents] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    if (stored === "true") setSoundEnabled(true);
  }, []);

  const toggleSound = useMemo(() => () => {
    setSoundEnabled((v) => {
      const next = !v;
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  useReviewSound(tasks, soundEnabled);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiFetchTasks(showArchived);
      setTasks(data);
      setSelectedTask((prev) => (prev ? (data.find((t) => t.id === prev.id) ?? prev) : null));
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  const fetchAgentsData = useCallback(async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchAgentsData();
    const interval = setInterval(() => {
      fetchTasks();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchAgentsData]);

  if (loading) {
    return <LoadingSpinner />;
  }

  async function handleCreateTask(title: string, description: string, agentId: number) {
    await createTask(title, description, agentId);
    fetchTasks();
  }

  async function handleCreateDevTask(title: string, description: string, agentId: number) {
    await createTask(title, description, agentId, "development");
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

  async function handleArchive(task: Task) {
    await archiveTask(task.id);
    fetchTasks();
  }

  async function handleUnarchive(task: Task) {
    await unarchiveTask(task.id);
    fetchTasks();
  }

  async function handleArchiveAllDone() {
    await archiveAllDoneTasks();
    fetchTasks();
  }

  async function handleCreateAgent(name: string, port: number | undefined, type: AgentType, command?: string, folder?: string, options?: AgentOptions) {
    await createAgent(name, port, type, command, folder, options);
    fetchAgentsData();
  }

  async function handleDeleteAgent(agent: Agent) {
    try {
      await deleteAgent(agent.id);
      fetchAgentsData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete agent");
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <BoardHeader
        agents={agents}
        showAgents={showAgents}
        onToggleAgents={() => setShowAgents((v) => !v)}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((v) => !v)}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 gap-4 overflow-x-auto p-6">
          {QUEUES.map((queue) => {
            const queueTasks = tasks.filter((t) => t.status === queue.slug);
            const archivedCount = queue.slug === SLUG_DONE && !showArchived
              ? tasks.filter((t) => t.status === SLUG_DONE).length  // when not showing archived, we need a separate count
              : undefined;
            return (
              <BoardColumn
                key={queue.slug}
                queue={queue}
                tasks={queueTasks}
                agents={agents}
                onDelete={handleDelete}
                onClick={setSelectedTask}
                onCreateTask={
                  queue.slug === "planning" ? handleCreateTask :
                  queue.slug === "development" ? handleCreateDevTask :
                  undefined
                }
                onArchive={queue.slug === SLUG_DONE ? handleArchive : undefined}
                onUnarchive={queue.slug === SLUG_DONE ? handleUnarchive : undefined}
                onArchiveAll={queue.slug === SLUG_DONE ? handleArchiveAllDone : undefined}
              />
            );
          })}
        </main>

        {showAgents && (
          <AgentList
            agents={agents}
            onDelete={handleDeleteAgent}
            onSubmit={handleCreateAgent}
          />
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          agents={agents}
          onClose={() => setSelectedTask(null)}
          onApprove={handleApprove}
          onDelete={handleDelete}
          onTaskUpdated={fetchTasks}
        />
      )}
    </div>
  );
}
