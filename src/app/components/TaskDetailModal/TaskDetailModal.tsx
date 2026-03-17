"use client";

import { useEffect, useRef, useState } from "react";
import type { Task, Agent, TaskMessage, ToolCall } from "@/lib/types";
import { Queue, getNextQueue, QUEUES } from "@/lib/queues";
import { addTaskMessage, retryTask } from "@/lib/api";
import ModalHeader from "./ModalHeader";
import TaskMetadata from "./TaskMetadata";
import Conversation from "./Conversation";
import CommentForm from "./CommentForm";
import ActiveToolBar from "./ActiveToolBar";
import ToolCallsList from "./ToolCallsList";

interface TaskDetailModalProps {
  task: Task;
  agents: Agent[];
  onClose: () => void;
  onApprove: (task: Task, nextQueue: Queue) => void;
  onDelete: (task: Task) => void;
  onTaskUpdated?: () => void;
}

type TabId = "conversation" | "tool-calls";

export default function TaskDetailModal({ task, agents, onClose, onApprove, onDelete, onTaskUpdated }: TaskDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queue = QUEUES.find((q) => q.slug === task.status);
  const nextQueue = queue ? getNextQueue(queue.slug) : null;

  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("conversation");
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // SSE connection for real-time message and tool call updates
  useEffect(() => {
    setMessages([]);
    setToolCalls([]);
    const es = new EventSource(`/api/tasks/${task.id}/stream`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as
        | { type: "init"; messages: TaskMessage[]; toolCalls: ToolCall[] }
        | { type: "new_messages"; messages: TaskMessage[] }
        | { type: "message_updated"; message: TaskMessage }
        | { type: "new_tool_calls"; toolCalls: ToolCall[] }
        | { type: "tool_call_updated"; toolCall: ToolCall };

      if (data.type === "init") {
        setMessages(data.messages);
        setToolCalls(data.toolCalls ?? []);
      } else if (data.type === "new_messages") {
        setMessages((prev) => [...prev, ...data.messages]);
      } else if (data.type === "message_updated") {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.message.id ? data.message : m))
        );
      } else if (data.type === "new_tool_calls") {
        setToolCalls((prev) => [...prev, ...data.toolCalls]);
      } else if (data.type === "tool_call_updated") {
        setToolCalls((prev) =>
          prev.map((tc) => (tc.id === data.toolCall.id ? data.toolCall : tc))
        );
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
      className="m-auto flex h-full max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-zinc-200 bg-white p-0 shadow-xl backdrop:bg-black/40 dark:border-zinc-700 dark:bg-zinc-800"
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

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-zinc-200 px-5 dark:border-zinc-700">
        <button
          onClick={() => setActiveTab("conversation")}
          className={`cursor-pointer px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "conversation"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          Conversation
        </button>
        <button
          onClick={() => setActiveTab("tool-calls")}
          className={`cursor-pointer flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "tool-calls"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          Tool Calls
          {toolCalls.length > 0 && (
            <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {toolCalls.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "conversation" ? (
        <Conversation messages={messages} task={task} />
      ) : (
        <ToolCallsList toolCalls={toolCalls} />
      )}

      {activeTab === "conversation" && (
        <>
          <ActiveToolBar toolCalls={toolCalls} />
          <CommentForm
            value={newComment}
            onChange={setNewComment}
            onSubmit={handleAddComment}
            submitting={submittingComment}
            error={commentError}
          />
        </>
      )}
    </dialog>
  );
}
