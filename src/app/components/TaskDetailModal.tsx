"use client";

import { useEffect, useRef, useState } from "react";
import type { Task, Agent, TaskMessage } from "@/lib/types";
import { Queue, getNextQueue, QUEUES } from "@/lib/queues";
import { Loader2, X, MessageSquarePlus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { fetchTaskMessages, addTaskMessage } from "@/lib/api";

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

  useEffect(() => {
    fetchTaskMessages(task.id)
      .then(setMessages)
      .catch(() => setMessages([]));
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
      const message = await addTaskMessage(task.id, newComment.trim());
      setMessages((prev) => [...prev, message]);
      setNewComment("");
      onTaskUpdated?.();
    } catch (err: unknown) {
      setCommentError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  const stateLabel: Record<string, string> = {
    pending: "Pending",
    in_progress: "In progress",
    done: "Done",
    add_message: "Awaiting revision",
    failed: "Failed",
  };

  const stateBadge: Record<string, string> = {
    pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    add_message: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-0 shadow-xl backdrop:bg-black/40 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">#{task.id}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateBadge[task.state] ?? stateBadge.pending}`}>
            {(task.state === "in_progress" || task.state === "add_message") && (
              <Loader2 className="mr-1 inline-block h-3 w-3 animate-spin" aria-hidden="true" />
            )}
            {stateLabel[task.state] ?? task.state}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {nextQueue && task.state === "done" && (
            <button
              onClick={() => { onApprove(task, nextQueue); onClose(); }}
              className="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Approve
            </button>
          )}
          <button
            onClick={() => { onDelete(task); onClose(); }}
            className="cursor-pointer rounded px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h2>
        {task.description ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{task.description}</p>
        ) : (
          <p className="mt-2 text-sm italic text-zinc-300 dark:text-zinc-600">No description</p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            <dt className="font-medium uppercase tracking-wide">Queue</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{queue?.label ?? task.status}</dd>
          </div>
          <div>
            <dt className="font-medium uppercase tracking-wide">Created</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
              {new Date(task.created_at).toISOString()}
            </dd>
          </div>
          <div>
            <dt className="font-medium uppercase tracking-wide">Updated</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
              {new Date(task.updated_at).toISOString()}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Assigned Agent
          </label>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
            {agents.find((a) => a.id === task.agent_id)?.name ?? <span className="italic text-zinc-400">Unassigned</span>}
          </p>
        </div>

        {task.plan && (
          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-700">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Plan</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-zinc-800 prose-p:text-zinc-600 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:text-zinc-800 dark:prose-headings:text-zinc-100 dark:prose-p:text-zinc-300 dark:prose-code:bg-zinc-700 dark:prose-code:text-zinc-200">
              <ReactMarkdown>{task.plan}</ReactMarkdown>
            </div>
          </div>
        )}

        {task.execution && (
          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-700">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Execution</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-zinc-800 prose-p:text-zinc-600 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:text-zinc-800 dark:prose-headings:text-zinc-100 dark:prose-p:text-zinc-300 dark:prose-code:bg-zinc-700 dark:prose-code:text-zinc-200">
              <ReactMarkdown>{task.execution}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Messages history */}
        {messages.length > 0 && (
          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-700">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Comments
            </h3>
            <ul className="space-y-3">
              {messages.map((msg) => (
                <li key={msg.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{msg.content}</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Added while task was <span className="font-medium">{msg.task_state_at_creation}</span>
                    {" · "}
                    {new Date(msg.created_at).toISOString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Add comment — only available when task is done */}
        {task.state === "done" && (
          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-700">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Comment
            </h3>
            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment or feedback — the agent will revise the output based on it…"
                rows={3}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                disabled={submittingComment}
              />
              {commentError && (
                <p className="text-xs text-red-500">{commentError}</p>
              )}
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingComment ? (
                  <><Loader2 className="mr-1 inline-block h-3 w-3 animate-spin" aria-hidden="true" />Sending…</>
                ) : (
                  "Send Comment"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </dialog>
  );
}
