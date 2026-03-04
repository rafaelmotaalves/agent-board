"use client";

import { useEffect, useState, useCallback } from "react";
import type { Task, Agent, AgentOptions } from "@/lib/types";
import { Queue, QUEUES } from "@/lib/queues";
import { fetchTasks as apiFetchTasks, createTask, updateTaskStatus, deleteTask, fetchAgents, createAgent, deleteAgent } from "@/lib/api";
import TaskDetailModal from "../TaskDetailModal";
import AgentList from "../AgentList";
import BoardHeader from "./BoardHeader";
import BoardColumn from "./BoardColumn";
import LoadingSpinner from "./LoadingSpinner";

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAgents, setShowAgents] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiFetchTasks();
      setTasks(data);
      setSelectedTask((prev) => (prev ? (data.find((t) => t.id === prev.id) ?? prev) : null));
    } finally {
      setLoading(false);
    }
  }, []);

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

  async function handleCreateAgent(name: string, port: number, options?: AgentOptions) {
    await createAgent(name, port, options);
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
    <div className="flex min-h-screen flex-col">
      <BoardHeader
        agents={agents}
        showAgents={showAgents}
        onToggleAgents={() => setShowAgents((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 gap-4 overflow-x-auto p-6">
          {QUEUES.map((queue) => {
            const queueTasks = tasks.filter((t) => t.status === queue.slug);
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
