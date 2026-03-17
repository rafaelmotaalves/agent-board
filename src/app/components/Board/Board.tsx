"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Task, Agent, AgentOptions, AgentType } from "@/lib/types";
import { Queue, QUEUES, SLUG_DONE } from "@/lib/queues";
import { fetchTasks as apiFetchTasks, createTask, updateTaskStatus, deleteTask, fetchAgents, createAgent, updateAgent, deleteAgent, archiveTask, unarchiveTask, archiveAllDoneTasks } from "@/lib/api";
import TaskDetailModal from "../TaskDetailModal";
import AgentList from "../AgentList";
import ConfirmDeleteAgentModal from "../AgentList/ConfirmDeleteAgentModal";
import BoardHeader from "./BoardHeader";
import BoardColumn from "./BoardColumn";
import LoadingSpinner from "./LoadingSpinner";
import { useReviewNotification } from "../useReviewNotification";

const NOTIFICATIONS_STORAGE_KEY = "agentboard:notifications-enabled";

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAgents, setShowAgents] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [deleteAgentError, setDeleteAgentError] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored === "true" && typeof Notification !== "undefined" && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  const toggleNotifications = useMemo(() => async () => {
    if (typeof Notification === "undefined") return;

    if (!notificationsEnabled) {
      // Enabling: request permission if needed
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") return;
      } else if (Notification.permission === "denied") {
        return;
      }
      setNotificationsEnabled(true);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, "true");
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, "false");
    }
  }, [notificationsEnabled]);

  useReviewNotification(tasks, notificationsEnabled);

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

  async function handleUpdateAgent(id: number, updates: { name?: string; port?: number; type?: AgentType; command?: string; folder?: string; options?: AgentOptions }) {
    await updateAgent(id, updates);
    setEditingAgent(null);
    fetchAgentsData();
  }

  function handleEditAgent(agent: Agent) {
    setEditingAgent(agent);
  }

  function handleCancelEdit() {
    setEditingAgent(null);
  }

  function handleDeleteAgent(agent: Agent) {
    setAgentToDelete(agent);
    setDeleteAgentError(null);
    setDeletingAgent(false);
  }

  async function confirmDeleteAgent() {
    if (!agentToDelete) return;
    setDeletingAgent(true);
    setDeleteAgentError(null);
    try {
      await deleteAgent(agentToDelete.id);
      setAgentToDelete(null);
      fetchAgentsData();
    } catch (e) {
      setDeleteAgentError(e instanceof Error ? e.message : "Failed to delete agent");
    } finally {
      setDeletingAgent(false);
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
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={toggleNotifications}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 gap-4 overflow-x-auto p-6">
          {QUEUES.map((queue) => {
            const queueTasks = tasks.filter((t) => t.status === queue.slug);
            const _archivedCount = queue.slug === SLUG_DONE && !showArchived
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
            onUpdate={handleUpdateAgent}
            editingAgent={editingAgent}
            onEdit={handleEditAgent}
            onCancelEdit={handleCancelEdit}
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

      {agentToDelete && (
        <ConfirmDeleteAgentModal
          agent={agentToDelete}
          deleting={deletingAgent}
          error={deleteAgentError}
          onConfirm={confirmDeleteAgent}
          onCancel={() => setAgentToDelete(null)}
        />
      )}
    </div>
  );
}
