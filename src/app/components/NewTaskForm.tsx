"use client";

import { useState, useEffect } from "react";
import type { Agent } from "@/lib/types";

interface NewTaskFormProps {
  agents: Agent[];
  onSubmit: (title: string, description: string, agentId: number) => Promise<void>;
}

export default function NewTaskForm({ agents, onSubmit }: NewTaskFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState<number | null>(agents.length > 0 ? agents[0].id : null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-select the first agent when agents load after initial mount
  useEffect(() => {
    if (agentId === null && agents.length > 0) {
      setAgentId(agents[0].id);
    }
  }, [agents, agentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || agentId === null) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), description.trim(), agentId);
      setTitle("");
      setDescription("");
      setAgentId(agents.length > 0 ? agents[0].id : null);
      setIsOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
      >
        + New Task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <input
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="mt-2 w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <select
        value={agentId ?? ""}
        onChange={(e) => setAgentId(e.target.value ? Number(e.target.value) : null)}
        className="mt-2 w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="" disabled>Select an agent…</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={submitting || !title.trim() || agentId === null}
          className="cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setTitle(""); setDescription(""); setAgentId(agents.length > 0 ? agents[0].id : null); }}
          className="cursor-pointer rounded px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
