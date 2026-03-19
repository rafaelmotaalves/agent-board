"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { Task, Agent, AgentOptions, AgentType } from "@/lib/types";
import { Queue, QUEUES, SLUG_DONE } from "@/lib/queues";
import { fetchTasks as apiFetchTasks, createTask, updateTaskStatus, deleteTask, fetchAgents, createAgent, updateAgent, deleteAgent, archiveTask, unarchiveTask, archiveAllDoneTasks } from "@/lib/api";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, type DragOverEvent } from "@dnd-kit/core";
import TaskDetailModal from "../TaskDetailModal";
import TaskCard from "../TaskCard";
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
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const isDraggingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
      if (!isDraggingRef.current) {
        fetchTasks();
      }
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

  function canDragTask(task: Task): boolean {
    return task.archived_at === null && task.state !== "in_progress";
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveDragTask(task);
      isDraggingRef.current = true;
    }
  }

  function handleDragOver(_event: DragOverEvent) {
    // Reserved for future within-column reordering
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragTask(null);
    isDraggingRef.current = false;

    const { active, over } = event;
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const targetQueue = over.id as string;
    if (task.status === targetQueue) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: targetQueue } : t)));

    try {
      await updateTaskStatus(task.id, targetQueue);
      fetchTasks();
    } catch {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
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
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <main className="flex flex-1 gap-4 overflow-x-auto p-6">
            {QUEUES.map((queue) => {
              const queueTasks = tasks.filter((t) => t.status === queue.slug);
              const _archivedCount = queue.slug === SLUG_DONE && !showArchived
                ? tasks.filter((t) => t.status === SLUG_DONE).length
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
                  canDragTask={canDragTask}
                />
              );
            })}
          </main>

          <DragOverlay dropAnimation={null}>
            {activeDragTask ? (
              <div className="rotate-2 scale-105">
                <TaskCard
                  task={activeDragTask}
                  queue={QUEUES.find((q) => q.slug === activeDragTask.status) ?? QUEUES[0]}
                  assignedAgent={agents.find((a) => a.id === activeDragTask.agent_id)}
                  onDelete={() => {}}
                  onClick={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

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
