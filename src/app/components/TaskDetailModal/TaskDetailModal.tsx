"use client";

import { useEffect, useRef, useState } from "react";
import type { Task, Agent, TaskMessage } from "@/lib/types";
import { Queue, getNextQueue, QUEUES } from "@/lib/queues";
import { addTaskMessage, retryTask } from "@/lib/api";
import ModalHeader from "./ModalHeader";
import TaskMetadata from "./TaskMetadata";
import Conversation from "./Conversation";
import CommentForm from "./CommentForm";

interface TaskDetailModalProps {
  task: Task;
  agents: Agent[];
  onClose: () => void;
  onApprove: (task: Task, nextQueue: Queue) => void;
  onDelete: (task: Task) => void;
  onTaskUpdated?: () => void;
}

export default function TaskDetailModal({ task, agents, onClose, onApprove, onDelete, onTaskUpdated }: TaskDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queue = QUEUES.find((q) => q.slug === task.status);
  const nextQueue = queue ? getNextQueue(queue.slug) : null;

  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // SSE connection for real-time message updates
  useEffect(() => {
    setMessages([]);
    const es = new EventSource(`/api/tasks/${task.id}/stream`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as
        | { type: "init"; messages: TaskMessage[] }
        | { type: "new_messages"; messages: TaskMessage[] };

      if (data.type === "init") {
        setMessages(data.messages);
      } else if (data.type === "new_messages") {
        setMessages((prev) => [...prev, ...data.messages]);
      }
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [task.id]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      await addTaskMessage(task.id, newComment.trim());
      setNewComment("");
      onTaskUpdated?.();
    } catch (err: unknown) {
      setCommentError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleRetry(task: Task) {
    try {
      await retryTask(task.id);
      onTaskUpdated?.();
    } catch {
      // ignore
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleBackdropClick}
      className="m-auto h-full max-h-screen max-w-3xl rounded-xl border border-zinc-200 bg-white p-0 shadow-xl backdrop:bg-black/40 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <ModalHeader
        task={task}
        nextQueue={nextQueue}
        onApprove={onApprove}
        onDelete={onDelete}
        onRetry={handleRetry}
        onClose={onClose}
      />
      {task.state === "failed" && task.failure_reason && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          <p className="font-medium">Task failed</p>
          <p className="mt-1 whitespace-pre-wrap">{task.failure_reason}</p>
        </div>
      )}
      <TaskMetadata task={task} queue={queue} agents={agents} />
      <Conversation messages={messages} task={task} />
      <CommentForm
        value={newComment}
        onChange={setNewComment}
        onSubmit={handleAddComment}
        submitting={submittingComment}
        error={commentError}
      />
    </dialog>
  );
}
