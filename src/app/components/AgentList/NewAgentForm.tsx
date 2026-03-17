"use client";

import { useState } from "react";
import type { AgentOptions, AgentType } from "@/lib/types";
import { AGENT_TYPES, DEFAULT_AGENT_TYPE } from "@/lib/types";
import ToggleSwitch from "@/app/components/ToggleSwitch";
import DirectoryPicker from "@/app/components/DirectoryPicker";

interface NewAgentFormProps {
  onSubmit: (name: string, port: number | undefined, type: AgentType, command: string | undefined, folder: string, options?: AgentOptions) => Promise<void>;
}

export default function NewAgentForm({ onSubmit }: NewAgentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [port, setPort] = useState("");
  const [command, setCommand] = useState("");
  const [folder, setFolder] = useState("");
  const [type, setType] = useState<AgentType>(DEFAULT_AGENT_TYPE);
  const [parallelPlanning, setParallelPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAcp = type === "acp";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    let portNum: number | undefined;
    let cmd: string | undefined;

    if (isAcp) {
      if (!command.trim()) {
        setError("Command is required for ACP agents");
        return;
      }
      cmd = command.trim();
    } else {
      portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        setError("Port must be between 1 and 65535");
        return;
      }
    }

    const folderValue = folder.trim();
    if (!folderValue) {
      setError("Working directory is required");
      return;
    }

    setSubmitting(true);
    try {
      const options: AgentOptions = {};
      if (parallelPlanning) options.parallel_planning = true;
      await onSubmit(name.trim(), portNum, type, cmd, folderValue, options);
      setName("");
      setPort("");
      setCommand("");
      setFolder("");
      setType(DEFAULT_AGENT_TYPE);
      setParallelPlanning(false);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setIsOpen(false);
    setName("");
    setPort("");
    setCommand("");
    setFolder("");
    setType(DEFAULT_AGENT_TYPE);
    setParallelPlanning(false);
    setError(null);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
      >
        + New Agent
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
    >
      <input
        type="text"
        placeholder="Agent name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as AgentType)}
        className="mt-2 w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {AGENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {isAcp ? (
        <input
          type="text"
          placeholder="Command (e.g., npx my-acp-agent)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="mt-2 w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
      ) : (
        <input
          type="number"
          placeholder="Port (1–65535)"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          min={1}
          max={65535}
          className="mt-2 w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
      )}
      <DirectoryPicker value={folder} onChange={setFolder} />
      <label className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <ToggleSwitch
          checked={parallelPlanning}
          onChange={setParallelPlanning}
          label="Parallel planning"
        />
        Parallel planning
      </label>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="cursor-pointer rounded px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
